# 3일차 — 회사별 정책·실제 홈·내역 구현 계획

> 실행: superpowers:executing-plans로 아래 순서대로 진행한다. 사용자 승인 범위이며 commit·push·PR은 하지 않는다.

**목표:** 실제 세션과 회사 소속으로 월별 복지 정책·잔액·본인 신청을 조회한다.
**구조:** Prisma/PostgreSQL → 세션 검증 tRPC 읽기 API → TanStack Query → Expo 네이티브 화면. 익명 fixture 데모는 DB 조회와 분리한다.
**기술:** 기존 Expo/React Native, tRPC 11, Prisma 7, PostgreSQL + TanStack Query 5.
**명세:** [제품 범위](../product.md), 대화에서 승인한 D3-01~08. 이 문서가 3일차 상세 범위다.

## 공통 제약

- 기존 코드 스타일 변경·handoff.md·로컬 학습 자료를 보존한다. 기존 진행 기록의 현재 폴더 작업/별도 worktree 없음 결정을 유지한다.
- [코드 스타일](../code-style.md) 적용: 함수 뒤 빈 줄, 단일 책임, 단순 분기, Hook 규칙 우선. 생성 파일은 손으로 편집하지 않는다.
- 사용자당 소속 1개, 클라이언트의 companyId/userId를 권한 근거로 받지 않는다. 로그인 시 자동 소속 생성 없음.
- 한도 = 월 정책 한도 − SUBMITTED − APPROVED. REJECTED 제외. 사용일의 KST 월 기준. 사용일은 날짜 문자열(YYYY-MM-DD), 제출일은 UTC 시각.
- 홈은 선택 월의 요약·정책·최근 2건을 한 API로 조회한다. 내역은 월/상태 필터, submittedAt 내림차순 + id 내림차순의 안정적 커서 페이지.
- 30초 메모리 캐시, 사용자·회사·월·필터를 키로 구분. 로그아웃/만료/계정 전환 시 취소·삭제. 서버 UNAUTHORIZED 시 기존 인증 복구 절차 실행. 영구 캐시 없음.
- seed는 localhost chagok DB에서만 명시적으로 실행. 가상 회사 2개 및 가상 사용자/신청만 만들고 로그인 사용자 자동 연결 없음. 기존 사용자 연결은 별도 명령 + 명시적 userId/company slug. 재실행 시 실제 수정 내역을 덮어쓰지 않는다.
- 4일차 신청 생성·5일차 첨부·6일차 승인은 제외. 신청 폼 비활성 유지. 로그인 전 회사명은 중립 표시.

## 수정 파일과 작업

### Task 1: 데이터·권한·API (D3-01~03)

- 수정: `packages/api/prisma/schema.prisma`, `src/router.ts`, `src/auth/context.ts`, API package scripts.
- 신규: `prisma/migrations/20261117000000_benefits/migration.sql`, `src/benefits/{service,seed}.ts`, 동 디렉터리 단위/DB 통합 테스트, `scripts/benefits-seed.ts`.
- 신규 공유 계약: `packages/contracts/src/benefits.ts` 및 package export.
- 모델: Company(slug/name/isSample), Membership(userId unique, companyId), BenefitPolicy(companyId/month unique, allowance/categories/guidance), Claim(companyId/userId, usedOn, submittedAt, status, amount, category, title, rejectionReason). 복합 소속 FK와 양수 금액 제약.
- API: `benefits.home({month})`, `history({month,status?,cursor?,limit?})`, `detail({id})`, `policy({month})`. 실제 AuthService.session 검증 후 서버 조회. 소속 없음/정책 없음은 명시 상태, 본인 외 상세는 NOT_FOUND.
- [x] 테스트 먼저: 100000−15000−20000=65000, 반려 제외, 월 경계/정책 없음/소속 없음/다른 회사·동료 접근 차단/만료·해지/동일 시각 페이지/잘못된 입력.
- [x] 서비스·마이그레이션·seed 구현 후 단위/실제 DB 검증. seed 2회 실행해 중복·기존 데이터 보존 확인.

### Task 2: 인증 범위 캐시 (D3-06)

- 수정: mobile package.json/lockfile, `app/_layout.tsx`.
- 신규: `src/benefits/{cache,api,BenefitsProvider}.ts(x)`와 테스트.
- 사용자 ID별 별도 QueryClient, SessionController 구독 시 권한을 잃는 순간 cancel+clear. 보존 가능한 foreground 검증 중에는 화면 차단을 유지한다. 인증 검증 실패에는 이전 결과를 재사용하지 않는다.
- tRPC AbortSignal + timeout, 자동 재시도 없음, 화면에 재시도/새로고침 제공. React Query cache는 30초 staleTime, persistence 없음.
- [x] 테스트 먼저: 짧은 재방문 1회 요청, 새로고침 재조회, 사용자/회사/월/필터 키 분리, 취소 무시 늦은 응답·로그아웃·만료 후 데이터 복귀 방지.
- [x] Provider/조회 Hook 구현, 기존 세션 테스트 회귀.

### Task 3: 홈·내역·상세·안내 (D3-04~05,07)

- 수정: `app/home.tsx`, `_layout.tsx`, `src/components/{ui,BenefitBalanceCard,BenefitCategoryList,RecentRequestList}.tsx`.
- 신규: `app/history.tsx`, `app/requests/[id].tsx`, `app/policy.tsx`, `src/benefits`의 화면/조회 컴포넌트 및 fixture 변환.
- 실제 홈은 회사·월·샘플 데이터 여부, 총/대기/승인/사용가능 금액과 최근 2건. 데모는 기존 2026-11 fixture임을 표시하고 네트워크 사용 안 함.
- 내역 월 이동/상태 선택/더 보기/상세 이동, 상세 반려 사유, 정책 카테고리/한도/안내. 로딩/빈 내역/소속 없음/정책 없음/오류·재시도 구분. 상단 뒤로가기와 하단 실제 탐색.
- [x] 실제 컴포넌트/서버 동작 검증 후 화면 구현. 데모 신청 WebView 연결·로그아웃 유지.
- [x] 브라우저 로컬 경로 열기 및 iOS 시뮬레이터 가능한 범위 확인. 플랫폼 미검증은 명시.

### Task 4: 측정·기록·리뷰 (D3-07~08)

- 신규: `docs/verification/day-03.md`, `docs/metrics/daily/day-03.md`, 측정 원본·재현 스크립트.
- 수정: `README.md`, `docs/{progress,product,manual-checks,repository-map}.md`, `docs/changes/latest-{pr.md,commit.txt}`.
- [x] 홈 응답 크기/요청 수/30초 재방문/수동 갱신을 실제 로컬 HTTP+클라이언트로 측정. 토큰/개인 ID 미기록. 목표값을 측정 결과로 쓰지 않는다.
- [x] 최대 8그룹 검증 및 독립 리뷰 후 결과·수동 확인 구분. 초안만 작성.

## AC와 필수 검증

| AC | 수용 기준 | 확인 |
| --- | --- | --- |
| D3-01 | 두 회사의 서로 다른 정책, idempotent seed, 명시 소속 연결/미소속 처리 | 실제 DB/seed 재실행 |
| D3-02 | 실제 세션 검증, 회사·본인 격리, 상세 존재 여부 비노출 | API/HTTP·DB 테스트 |
| D3-03 | KST 월·상태별 계산, 반려 제외, 정책 없음은 0원과 구분 | 계산/DB 경계 테스트 |
| D3-04 | 실제 홈 집계·최근2건, 익명 데모 분리/표시 | UI 및 API 결과 |
| D3-05 | 월·상태 내역/안정 페이지/상세 반려 사유/정책 안내 탐색 | DB·컴포넌트·화면 |
| D3-06 | 30초 재방문 캐시·수동 갱신·취소·세션 격리·재시도 | 캐시 테스트/실측 |
| D3-07 | 기존 인증/브릿지/비활성 신청 회귀, 타입/스타일/빌드, 변경 화면 열기 | 자동 검사 + 브라우저/iOS 구분 |
| D3-08 | 홈 요청 수·응답 바이트의 실행 환경/원본/한계 기록 | 실제 HTTP 측정 |

검증 그룹: 1 스타일·타입, 2 전체 테스트, 3 실제 DB·seed·권한, 4 Next/Expo JS 빌드, 5 브라우저, 6 iOS, 7 실측, 8 문서·diff·독립 리뷰. 내부 케이스 수는 제한하지 않는다.

## Review Focus

- 소속 변경·삭제와 캐시된 화면: 다음 조회에서 갱신하고 계정 간 데이터는 절대 재사용하지 않는다.
- 지연 응답과 로그아웃/만료의 경합: cache clear 이후 이전 응답을 표시하지 않는다.
- 같은 제출 시각/월 경계/필터 전환: 페이지 중복과 다른 월 결과 혼입이 없어야 한다.
- 정책 없음/한도 0/신청 없음은 별개 상태이며 오해할 수 있는 잔액을 표시하지 않는다.
- 작은 화면·큰 글자·반려 사유 장문: 탐색과 읽기가 가능해야 한다.

## 리뷰 후 보강 — 2026-11-17

- 소속 변경 시 기존 Claim까지 회사가 바뀌는 FK cascade를 막는다. 이미 적용한 첫 마이그레이션은 보존하고 `20261117010000_claim_membership_restrict/migration.sql`을 추가해 ON UPDATE RESTRICT로 바꾼다. 회사 이동 기능 자체는 범위 밖이며 이력이 있으면 임의 이동을 거부한다.
- 모든 복지 응답의 companyId를 현재 서버 발급 세션의 companyId와 대조한다. 불일치/소속 해제면 결과를 표시·추가 페이지 병합하지 않고 캐시 취소·삭제 후 세션을 다시 확인한다. 캐시/DB 회귀 테스트로 재현 후 수정한다.
- 상세 재조회가 NOT_FOUND이면 기존 상세 본문을 숨기고 소속/세션을 다시 확인한다. PR 준비 리뷰에서 재확인에 따른 쿼리 재활성화 반복을 발견해 연속 NOT_FOUND에서는 한 번만 확인하도록 제한했다. UNAUTHORIZED는 항상 인증 복구를 실행하고 정상 조회 또는 인증 범위 재마운트 후 제한을 초기화한다. 네트워크 오류 시에도 상세의 오래된 본문은 표시하지 않는다.

실행 결과: 구현/선정 자동 검증과 가능한 화면 검증을 수행했다. 실계정 UI·계정 전환·큰 글자 읽기/스크롤·기본 설정 복원은 후속 확인 완료했고 기본 Turbopack 성공은 사용자 제공 로그로 확인했다. 원래 AC 기준으로 D3-07 포함8개 충족이다. Android 실제 실행은 필수 AC에 포함하지 않은 별도 플랫폼 검증이며 기기·에뮬레이터 부재로 미검증 유지한다. [AC 결과](../verification/day-03.md)와 [사용자 확인 근거](../verification/day-03/followup/user-confirmation.md)를 따른다. 체크 표시는 해당 작업 수행을 뜻하며 모든 환경 인수 완료를 뜻하지 않는다.
