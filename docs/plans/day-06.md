# 6일차 담당자 검토 Implementation Plan

**Goal:** 같은 회사 담당자가 신청과 영수증을 검토하고 승인 또는 반려한 결과를 직원 한도와 내역에 반영한다.
**Architecture:** 기존 Next.js 웹, tRPC 인증, Prisma/PostgreSQL에 검토 서비스를 추가한다. 웹은 기존 Google 서버 검증을 재사용하고 HttpOnly 쿠키로 세션을 보관한다. 직원 캐시는 화면 복귀와 앱 활성화 시 갱신한다.
**Tech Stack:** 기존 TypeScript, Next.js, React Native, Zod, Prisma, PostgreSQL. 새 의존성 없음.
**Spec:** [원본 MVP와 6일차 범위](day-01.md), [제품 범위](../product.md), 담당자 기준 시안.

## 결정과 범위

- 2026-11-27 사용자의 구현, 테스트, 측정, 기록 요청에 따라 이 작업 폴더에서 계속 진행한다. 기존 미커밋 파일은 초기 상태 해시로 구분한다. 커밋, push, PR은 이번 요청에 포함되지 않는다.
- 별도 관리 서버 대신 기존 Next `/admin`과 `/api/admin`을 사용한다. 기존 네이티브 로그인과 신청 브릿지 계약을 바꾸지 않는다.
- Membership에 EMPLOYEE 기본 역할과 REVIEWER 역할을 추가한다. 기존 계정은 자동 승격하지 않는다. 현재 소속과 역할을 매 요청 검증한다.
- SUBMITTED에서 APPROVED/REJECTED로 한 번만 전이한다. 반려 사유는 공백 제거 후 1~500자. 동일 결정 재시도는 성공 결과를 반환하고 상반된 재처리는 충돌로 반환한다. 처리자와 시각을 보존한다.
- 담당자의 자기 신청 처리는 금지한다. 본인 신청은 직원 계정에서 조회할 수 있다.
- 직원 Membership 행 잠금은 기존 생성과 같은 순서로 사용한다. 담당자 권한 행도 트랜잭션에서 잠그고 교차 검토 교착을 피하기 위해 userId 순으로 잠근다.
- 한도 별도 가감 열은 만들지 않는다. 기존 SUBMITTED + APPROVED 집계를 유지해 승인 이중 차감과 반려 중복 복원을 방지한다.
- 영수증은 인증된 같은 회사 담당자에게 서버 프록시로 제공한다. 저장소 키나 공개 URL을 응답하지 않는다. 영수증 없는 기존 신청도 명확히 표시한다.
- 목록은 월, 상태, 안정 커서와 페이지당 최대 50건. 원본 사용자 식별자 대신 구분 가능한 신청자 식별 표시를 사용하며 이메일을 수집하지 않는다.
- 실시간 푸시는 범위 밖이다. 화면 재진입, 앱 활성화, 명시적 새로고침으로 갱신한다.

## AC와 필수 검증

| ID | 기준 | 확인 |
| --- | --- | --- |
| D6-01 | 비로그인, 직원, 타사 담당자, 권한 회수, 자기 신청 차단 | 실제 DB와 HTTP 테스트 |
| D6-02 | 월/상태/페이지 목록, 상세, 비공개 영수증 검토 | DB, HTTP, 브라우저 |
| D6-03 | 승인/사유 있는 반려, 감사 필드, 중복/동시 결정 일관성 | 실제 DB 병렬 요청 |
| D6-04 | 승인 시 한도 유지, 반려 시 복원, 직원 캐시 재조회 | DB, Query 테스트, 가능한 앱 확인 |
| D6-05 | 로그인, 로그아웃, 만료/권한/통신 오류, 좁은 화면 | HTTP, 브라우저, 사용자 확인 대기 별도 |
| D6-06 | 스타일, 전체 테스트, 타입, 웹 빌드, 실측 원본/환경/요약 | 명령 로그, 재계산 |
| D6-07 | 학습 로컬 보존, Git 제외, 진행/초안 작성 | 문서 링크, 추적/staged/브랜치 diff |

## 구현 순서

1. [x] `packages/api/src/review/service.integration.test.ts`, 공유 입력 테스트 작성 → 실패 확인 → Prisma 역할/감사 열 마이그레이션, `review/service.ts`, `contracts/benefits.ts` 구현.
2. [x] `review/http.test.ts`로 쿠키, Origin, 세션, 오류, 영수증 경계 확인 → `review/http.ts`, 저장소 읽기, `apps/web/src/app/api/admin/route.ts` 구현.
3. [x] `apps/web/src/app/admin/page.tsx`, `components/admin/*`에 Google 로그인과 목록/상세/검토 UI 구현. 기존 시안과 테마, Button/Input/Label 사용.
4. [x] 직원 화면 복귀/앱 활성화 재조회 테스트 → `apps/mobile/src/benefits/queries.ts`, `BenefitsProvider.tsx`, `cache.ts` 최소 수정.
5. [x] 실제 DB 동시 결정 10쌍 이상 측정. raw, environment, daily 요약과 실패 포함. 전체 검사와 웹 브라우저 검증.
6. [x] 검증 AC, 진행, README 운영 절차, 로컬 학습 기록, 최신 PR/커밋 초안 갱신. 최종 리뷰 수행.

## 검토 초점

- 응답을 잃고 같은 결정을 재시도해도 감사 기록이나 한도가 변하지 않는가.
- 권한 회수/회사 전환 후 기존 쿠키로 다른 회사 데이터에 접근할 수 없는가.
- 두 담당자의 상반된 결정과 직원 새 신청이 경합해도 한도가 음수가 되지 않는가.
- 목록 필터 변경/로그아웃 뒤 늦은 응답이 이전 개인정보를 다시 표시하지 않는가.
- 읽기 가능한 영수증만 노출하며 실패한 이미지를 승인 근거처럼 표시하지 않는가.

## 실행 기록

- 초기 상태: `../verification/day-06/initial-state.json`. 기존 next-env, 초안 두 개, handoff를 확인했다. 학습 경로 추적 없음과 ignore 적용 확인.

- 구현 후 범위 보완: `apps/web/.env.example`에 프록시용 ADMIN_ORIGIN을 설명하고, `packages/api/scripts/verify-review-storage.mjs`로 실제 Supabase 읽기를 별도 확인했다.
- 결과: [AC별 검증](../verification/day-06.md). 체크는 구현/자동 검증/기록 단계 수행을 뜻하며 Google 실계정과 실제 기기 사용자 확인까지 완료했다는 뜻이 아니다.
