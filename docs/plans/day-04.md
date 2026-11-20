# 4일차 — 서버 신청, 폼 연결과 실측 계획

2026-11-19 KST. 사용자 선택: “서버 신청 API, 권한·한도·중복 검증과 테스트, 학습 기록까지”. 최초 완료 범위는 **서버 단계**였으며, 후속 요청으로 아래 폼 연결과 실측 실행을 추가했다.

## 목표와 설계

- 기존 tRPC, Prisma 7, PostgreSQL, Zod와 Node 24를 유지한다. 새 의존성, 화면 변경, 사진 업로드, 승인/반려 기능은 없다.
- `benefits.create({ requestId, title, category, amount, usedOn }) -> { id }` mutation을 추가한다. 세션에서 userId를 정하고 현재 Membership에서 companyId를 얻는다. 클라이언트의 userId/companyId/status 등 추가 필드는 거부한다.
- title은 trim 후 1~100자, category는 trim 후 1~50자, 금액은 1~2,147,483,647 정수 원, usedOn은 2000~2099년의 실제 YYYY-MM-DD 날짜, requestId는 UUID(소문자 정규화)다. 날짜의 월에 회사 정책이 있어야 하며 카테고리는 정책 허용 목록과 일치해야 한다. 현재 날짜 제한이나 신청 가능 기간은 기존 정책에 없으므로 새로 만들지 않는다.
- 한도는 사용일의 월 정책 − SUBMITTED − APPROVED다. REJECTED는 제외한다. 신청은 SUBMITTED로 저장하며 기존 조회 API에서 바로 확인할 수 있다. 별도 잔액 컬럼이나 차감 원장은 추가하지 않는다.
- 구현 판단: PostgreSQL ReadCommitted 트랜잭션에서 해당 사용자의 Membership 행을 `SELECT ... FOR UPDATE`로 잠근 뒤 소속, 재전송, 정책, 사용액을 검사하고 저장한다. 같은 사용자의 동시 신청은 직렬로 진행된다. 회사 전체 잠금보다 범위가 작고 Serializable 전체 재시도보다 단순하다. 같은 사용자의 다른 월도 잠기는 비용이 있으며 이후 상태 변경 기능도 이 동기화 경계를 재검토해야 한다.
- 중복의 정의는 **동일 사용자의 동일 requestId 재전송**이다. 같은 키와 정규화된 같은 입력은 기존 id를 반환하고 변경된 내용은 CONFLICT다. 별도 키로 같은 내용의 정상 지출을 제출하는 것은 허용한다. 실패한 입력/한도 검증은 키를 소비하지 않는다. 서로 다른 사용자는 같은 키를 사용할 수 있다.
- Claim에 nullable requestId와 `(userId, requestId)` unique index를 추가해 기존 데이터와 seed를 보존한다. 정책/잔액이 나중에 달라져도 성공한 요청의 동일 재전송은 기존 id를 반환한다. 현재 소속은 먼저 확인하고 다른 회사의 결과는 돌려주지 않는다.
- 리뷰 반영: title/category는 NUL과 단독 UTF-16 surrogate를 거부한다. DB 저장 오류와 재전송 문자열 손실을 막고 정상 이모지는 허용한다.
- 오류: 잘못된 입력/미지원 카테고리/한도 초과 BAD_REQUEST, 무인증·만료·로그아웃 UNAUTHORIZED, 소속 없음 FORBIDDEN, 정책 없음 PRECONDITION_FAILED, 같은 키의 다른 내용 CONFLICT. 예상 밖 서버 오류는 기존 HTTP 오류 formatter로 가린다.

## 변경 파일

- `packages/contracts/src/benefits.ts`, `claim-input.test.ts`: 신청 입력 계약과 경계 테스트.
- `packages/api/prisma/schema.prisma`, `migrations/20261119000000_claim_request_id/migration.sql`: 기존 행을 보존하는 요청 키 추가.
- `packages/api/src/benefits/create-claim.ts`, `service.ts`, `packages/api/src/router.ts`: 저장 트랜잭션과 기존 인증 경로 연결.
- `packages/api/src/benefits/create-claim.integration.test.ts`, `packages/api/src/http.test.ts`: 실제 DB 권한, 경계, 중복, 동시 요청과 HTTP 회귀.
- `docs/plans/day-04.md`, `docs/verification/day-04.md`, `docs/verification/day-04/`: 계획, 로그, AC 근거.
- `docs/metrics/daily/day-04.md`, `docs/progress.md`: 실측 미실행과 재개 절차, 현재 범위.
- 로컬 `docs/learning/day-04.md`: 구현 기반 학습, ADR, 대표 면접 질문 5개. Git 제외 유지.
- `docs/changes/latest-pr.md`, `docs/changes/latest-commit.txt`: 이번 작업의 초안.

기존 `apps/web/next-env.d.ts`, 초안 두 파일, 미추적 `handoff.md`와 학습 자료를 시작 시 확인했다. 초안 두 파일만 규칙에 따라 최신 작업으로 교체하며 나머지는 보존한다. 현재 폴더 작업을 유지하고 commit/push/PR은 수행하지 않는다.

## 실행 작업과 완료 기준

`executing-plans` 절차로 직접 수행한다. 승인된 범위의 세부 구현 판단은 위에 기록하며 추가 승인 대기는 만들지 않는다. Git 작업 스크립트 대신 이 문서와 검증 문서를 실행 장부로 사용한다.

### Task 1. 계약과 DB 저장

- [x] 계약 및 실제 DB 테스트를 먼저 작성하고 미구현 실패(RED)를 확인한다.
- [x] 추가형 마이그레이션, 생성 서비스와 라우터를 구현하고 테스트 통과(GREEN)를 확인한다.
- [x] 실제 DB 동시 요청에서 저장 건수와 총액, 재전송 결과 id, 실패 후 데이터 불변을 확인한다.

### Task 2. 회귀와 기록

- [x] 전체 테스트, 스타일, 4개 workspace 타입, 웹 서버 번들 빌드를 확인한다.
- [x] 독립 최종 코드 리뷰에서 중요한 문제를 수정하고 관련 검증을 다시 실행한다.
- [x] AC, 학습, 측정 미실행, 후속 순서, 초안 두 파일을 정리하고 기존 파일 해시와 Git 제외를 확인한다.

## AC

| ID | 완료 기준 | 확인 방법 |
| --- | --- | --- |
| D4-S1 | 상세 설계, API 계약, 이번/다음 범위가 명확하다 | 문서와 구현 대조 |
| D4-S2 | 입력 및 실제 세션/소속/회사 정책 검증을 우회할 수 없다 | 계약 테스트, DB caller, HTTP 인증 거부 |
| D4-S3 | 정확한 한도까지 저장하고 초과/동시 초과는 거부하며 실패는 데이터 불변이다 | 실제 DB 상태·월 경계·상태별 합계·동시 요청 |
| D4-S4 | 동일 요청은 한 건이고 다른 내용의 키 재사용은 거부한다 | 순차/동시 재전송, 사용자 격리, unique index |
| D4-S5 | 기존 회귀 및 타입/스타일/서버 번들 검증 결과가 남는다 | 실제 실행 로그, skip/실패 별도 보고 |
| D4-S6 | 학습과 초안, 후속 작업 및 보존 근거가 남는다 | 문서/링크/해시/Git 제외 검사 |

필수 검증은 ① RED→GREEN ② 전체 실제 DB 테스트 ③ 스타일 ④ 타입 ⑤ migration/client ⑥ 웹 빌드 ⑦ 코드 리뷰 ⑧ 문서·보존 검사로 묶는다. 화면 변경이 없으므로 서버 기동과 브라우저 수동 확인은 이번 단계 해당 없음이다.

## 서버 단계에서 남긴 후속 순서 (아래 후속 실행으로 재개)

1. 기존 시안과 `/apply`, RN WebView 수명, 인증 세션 경계를 확인해 폼 연결 계획과 AC를 공유한다.
2. 인증 정보의 URL/로그 노출 없이 앱과 웹의 호출 경로를 설계한다. 입력 검증, 회사 정책, 제출 중/실패/재시도/성공 상태를 연결한다. 초안당 UUID를 만들고 응답 유실 재시도에 같은 키를 유지한다.
3. 생성 성공 후 서버 조회로 홈/내역을 갱신한다. 조회 실패를 신청 실패로 오인해 새 키로 다시 저장하지 않는다. 브릿지 런타임 계약, 계정 전환/재로드/닫기 정리를 검증한다.
4. 브라우저와 iOS WebView에서 실제 사용자 흐름을 확인한다. 영수증 입력은 5일차로 남긴다.
5. FORM_READY를 인증·정책·입력 준비 완료로 정의하고 기존 WEB_READY와 구분한다. 실행 전 시작/종료 경계, 시계, 환경, 반복 횟수(기본 10회), cold/warm 조건을 확정한다. 성공/실패/취소와 원본을 보존하며 실제 표본이 있을 때만 요약한다.
6. 사용자 화면 확인 결과와 4일차 전체 AC를 합친 후 PR 준비 여부를 확인한다. 현재 서버 단계만으로 4일차 전체 완료를 선언하지 않는다.

## 실행 장부

- Task1 완료: 미구현 RED 후 계약/라우터/잠금 저장/unique migration 구현. 실제 DB 동시성과 재전송 검증 통과.
- Task2 완료: 전체200테스트, 타입, 스타일, webpack 빌드 통과. 독립 리뷰의 문자 입력 문제는 RED→GREEN으로 수정했다. [실제 AC와 실패/복구 근거](../verification/day-04.md).
- Ruling: 기존 폴더와 main 상태를 유지하고 브랜치/커밋 자동 스크립트는 적용하지 않았다. 저장소의 사용자 확인 후 PR 규칙과 기존 미커밋 변경 보존을 우선했다.
- Ruling: 일반 Prisma 온라인 문서가 ORM8 API로 연결돼 현재 Prisma7 코드를 그대로 대체하지 않았다. 설치된7.10.1 타입과 실제 DB 테스트, PostgreSQL18 잠금 문서를 근거로 검증했다. 새 의존성 설치/업그레이드는 없다.


## 후속 실행 — 폼 연결과 실측

2026-11-19 사용자 요청으로 후속 범위를 승인받아 진행한다. 서버 단계 기록은 보존한다.

### 설계와 변경 파일

- 앱이 SecureStore 세션으로 API를 호출하고 웹은 제한된 FORM_LOAD/CLAIM_SUBMIT 메시지만 보낸다. 토큰을 웹 메모리로 주입하는 대안은 자격 증명 노출 범위가 커지므로 채택하지 않는다. 웹 쿠키 로그인을 새로 구축하는 대안은 기존 네이티브 인증과 중복돼 범위에서 제외한다. 이 선택은 구현자의 판단이다.
- `packages/contracts/src/bridge.ts`와 새 `form-bridge.test.ts`: 연결 ID, 요청 ID, 정책과 제출 응답의 엄격한 런타임 계약.
- 새 `apps/mobile/src/bridge/claim-host.ts`, `claim-host.test.ts`, `useClaimHost.ts`: 앱의 API 호출과 성공 후 캐시 무효화, 세션/로드 세대 취소. 기존 `ApplyContainer.tsx`, `ApplyContainer.test.tsx`에서 브릿지 수명과 연결한다.
- `apps/web/src/app/apply/page.tsx`, 새 `components/apply/ApplyForm.tsx`, `form-client.ts`, `form-client.test.ts`: 실제 입력/검증/정책 조회/제출/재시도/성공 상태. 기존 `BridgeReceiver.tsx`는 새 폼 클라이언트와 통합한다.
- 폼 성공 시 저장된 결과를 먼저 확정한다. 홈/내역 무효화나 재조회 실패는 생성 실패로 바꾸지 않는다. 응답 유실은 동일 UUID와 입력으로 재전송하며 결과가 불명확한 동안 입력을 잠근다. 검증 실패 등 확정 거부만 수정하도록 푼다.
- 브릿지 연결 ID는 reload/close/session 전환 시 폐기한다. 취소 뒤 서버 저장이 끝날 수 있으므로 서버 멱등성은 유지하고 앱 캐시는 무효화한다. 닫았다가 다시 여는 경우의 초안 복구는 이번 범위가 아니며 내역 확인 안내를 제공한다.
- 단독 브라우저는 익명 미리보기이며 저장하지 않는다. 실제 UI 검증/실측에서는 격리된 로컬 가상 사용자, 실제 HTTP와 DB를 사용하고 인증 토큰은 호스트에만 둔다.
- 새 재현 스크립트 `packages/api/scripts/measure-claim-form.mjs`와 증거 `docs/verification/day-04-form/`, 결과 `docs/verification/day-04-form.md`, raw/environment `docs/metrics/`를 추가한다. `docs/progress.md`, 최신 초안, 로컬 학습 기록을 갱신한다.

### AC와 검증 (최대 9개 묶음)

| ID | 완료 기준 | 검증 |
| --- | --- | --- |
| D4-F1 | 정책/날짜/한도/입력을 확인한 폼과 접근 가능한 상태 안내 | 브라우저 실제 DOM, 계약 및 상태 테스트 |
| D4-F2 | 앱 인증 경로, 입력 잠금, 동일 UUID 재시도와 저장 성공 처리 | 실제 API/DB와 폼 및 호스트 테스트 |
| D4-F3 | 생성 이후 홈과 내역 갱신, 갱신 오류와 저장 오류 분리 | 실제 QueryClient 테스트 및 HTTP 확인 |
| D4-F4 | 잘못된 origin/schema/세대 거부, close/reload/session 정리 | 호스트 및 기존 컨테이너 회귀, 가능한 iOS 검증 |
| D4-F5 | FORM_READY와 제출 실측의 원본/환경/한계를 기록 | 고정 조건 10회, 성공/실패/취소/timeout 모두 보존 |
| D4-F6 | 전체 검증과 학습, 초안 및 기존 변경 보존 | 실제 DB 전체 테스트, style/type/build, 문서/Git 검사 |

① 계약/폼/호스트 TDD ② DB 포함 전체 테스트 ③ style ④ type ⑤ 웹 빌드 ⑥ 브라우저/iOS UI ⑦ 반복 측정 ⑧ 독립 리뷰 ⑨ 문서/보존으로 묶는다.

### 계측 경계 (실행 전에 확정)

- 브라우저 기본 10회: 같은 개발 서버/DB, Chromium 각 새 문서에서 navigationStart(웹 performance.now의 0)부터 인증된 호스트 정책 응답 반영 후 입력이 활성화된 FORM_READY까지. 앱 진입/구글 로그인 시간은 제외한다. 먼저 준비 1회 후 동일 브라우저 컨텍스트의 warm reload 10회, 서버 cold 성능으로 부르지 않는다.
- 제출은 같은 웹 단조 시계에서 submit 이벤트 핸들러 진입부터 CLAIM_RESULT를 받아 성공 상태가 DOM에 반영된 시점까지. 매 회 고유한 작은 금액 신청과 실제 DB/조회 검증, 가상 계정은 finally 정리한다.
- iOS가 가능하면 별도 환경/원본으로 기록한다. Chromium 호스트 어댑터 표본을 WKWebView/실기기 수치로 부르지 않는다. 각 시도는 success/failure/timeout/cancelled, 시작/끝/경과, 빌드와 소스 해시를 남기며 토큰/입력 본문은 기록하지 않는다.

### 실행 장부

- [x] Task F1: 계약/상태/호스트 RED→GREEN과 실제 폼 연결.
- [x] Task F2: 전체 회귀, 브라우저와 가능한 iOS 확인, 반복 실측.
- [x] Task F3: 독립 리뷰 및 수정 검증, 기록과 초안 마무리.
- Ruling: 앞선 서버 변경과 로컬 학습이 미커밋인 현재 폴더를 이어 사용한다. 사용자 승인 없는 commit/push/PR 및 격리 폴더로의 불완전한 복사는 수행하지 않는다.
- Pre-flight: 기존 API 입력 UUID와 브릿지 전송 요청 ID를 분리하며 기존 WEB_READY/PING 계약은 유지한다. FORM_READY는 정책/인증 준비 완료 시에만 별도 전송한다.

- 리뷰 수정 범위 추가: `packages/contracts/src/benefits.ts`와 `packages/api/src/benefits/create-claim.ts`, DB 테스트에서 선택적 expectedCompanyId를 잠금 안에서 비교한다. 웹 브릿지는 이 필드를 허용하지 않고 앱의 검증된 소속만 비교값으로 전달한다. 회사 결정 권한은 계속 서버 Membership에 있다.
- 리뷰 수정 범위 추가: 웹 `request-id.ts`와 테스트, getRandomValues 기반 UUID, 초기 연결 timeout, persisted pageshow 복원과 불명확한 이전 신청의 재제출 차단. 진단 로그는 raw 메시지를 수집하지 않는다.
- Ruling: 같은 세션의 foreground busy는 기존 차단 오버레이 아래에서 살아 있는 동일 인증 scope로 취급한다. 서버는 호출마다 인증을 다시 검증하며 실제 계정/소속 변경이나 만료는 초기화한다. 이 판단이 틀리면 갱신 중 응답 유실 또는 권한 반영 지연이 생기므로 상태/서버 테스트로 확인한다.
- Ruling: 닫기/완전한 새 문서의 초안 영구 복구와 영수증은 범위 밖이다. 복원된 미확정 문서는 내역 확인 안내로 잠그며 새 신청으로 자동 전환하지 않는다. 완전 재로드 전 제출이 진행 중이었다면 내역에서 먼저 확인해야 한다.

- 실측 경계 보정: 첫 탐색의 외부 자동화 클릭 대기 시간을 제외하기 위해 제출 시작 mark를 실제 submit 핸들러에 둔다. 기존 탐색 raw는 별도 보존하고 이 경계로 최종 표본을 다시 수집한다.
- iOS 실행 추가: `packages/api/scripts/verify-claim-native.mjs`는 기존 개발 디버거에서 실제 호스트를 관찰하고 WebView 입력을 자동화한다. 별도 가상 DB 세션을 SecureStore에 잠시 넣으며 원래 저장값을 네이티브 메모리에만 보존하고 finally 복구한다. 사용자 로그인이나 실제 신청 데이터는 사용하지 않는다.

- 화면 확인 후 작은 문구 정정: `apps/mobile/app/home.tsx`, `BenefitBalanceCard.tsx`에서 실제 계정은 신청하기, 익명 데모는 미리보기로 구분한다. 버튼 목적지와 권한은 그대로다.

- F1 완료: 계약/폼/호스트 RED→GREEN, 실제 WebView와 생성 API 연결. 사용자/회사 권한은 서버 결정, 앱 소속 비교값은 트랜잭션 불일치 검사에만 사용.
- F2 완료: 실제 DB228테스트, style102/타입4/webpack 빌드, Chrome와 iOS 준비1+본10 및 실제 저장/갱신. 원본과 경계는 측정 문서에 고정.
- F3 완료: 독립 리뷰 중요6건과 연결복구2건 수정, 실패/탐색 보존, 학습/검증/초안 갱신. 사용자 화면 확인과 PR 승인은 별도이며 자동 수행하지 않음.
- 계측 도구 보정: Hermes의 polyfill Promise 반환은 완료 증거가 아니어서 네이티브 준비/복구 flag 및 SecureStore 값 대조를 기다리도록 수정했다. 최종 restored=true와 fixtureCleaned=true를 확인했고 이전 관찰 원본은 별도 보존했다.


## 전체 PR 준비 — 사용자 확인 이후

서버와 폼 전체의 commit·push·PR을 승인받았다. 기존 단계의 “게시 미실행”은 당시 기록이며 이번에는 `feat/day-04-claim-flow`에서 main 대상 PR을 준비한다. 학습 파일·handoff·next-env는 로컬 보존하고 제외한다.

리뷰에서 화면 종료→fetch abort→조기 캐시 갱신→늦은 저장 경합을 재현했다. `apps/mobile/src/benefits/api.ts`, `useClaimHost.ts`, 새 `api.test.ts`로 발송 전 취소를 유지하면서 발송한 mutation은8초 제한 내 완료 후 갱신하도록 보정한다. AC는 닫힌 화면 응답 폐기/늦은 저장 뒤 홈 갱신/조회·발송 전 취소 및 timeout 유지다. RED→GREEN과 전체232개, 타입·스타일로 확인했다. 서버·웹 코드의 추가 변경은 없다.

PR용 최신 초안은 전체 API·migration·폼·측정 자료를 다루며 이번 검증과 과거 실측을 구분한다. [전체 AC와 결과](../verification/day-04-pr.md).

## 병합 후 보완 검증 — 2026-11-20

PR #6은 2026-11-19 병합됐고 main은 0a66a38이다. 사용자 승인한 후속 범위는 최종 iOS 재실측, 실제 입력/복원 확인, 최신 상태 문서 정리다.

- AC1: 준비1+본10 iOS 표본을 별도 보존하고, 실제 DB 잠금 중 제출→화면 종료→잠금 해제→홈 잔액 갱신을 확인한다.
- AC2: 가능한 실제 UI 키보드 입력과 history 복원을 확인한다. pageshow.persisted 증거 없는 경우 BFCache 성공으로 기록하지 않는다.
- AC3: 병합과 최신 검증을 진행/측정/검증/초안 문서에 반영하며 기존 사용자 변경과 학습/과거 원본을 보존한다.
- 변경 파일: packages/api/scripts/verify-claim-native.mjs, 별도 복원 검증 스크립트가 필요하면 packages/api/scripts/verify-claim-restore.mjs, docs/verification/day-04-followup.md와 증거 폴더, docs/metrics/raw 및 environments의 별도 followup JSON, docs/metrics/daily/day-04.md, docs/progress.md, 최신 PR/커밋 초안.
- 검증 묶음: iOS 정상 재측정, 실제 지연 저장 후 갱신, UI 입력/복원, 전체 테스트 및 스타일, 문서/보존 검사, 최종 독립 검토.
- Ruling: 이번은 기존 병합 코드의 검증 작업이며 실행 중인 서버/Metro와 현재 폴더를 유지한다. 새 커밋/push/PR은 승인 전 수행하지 않는다. 과거 원본은 덮어쓰지 않는다. 잘못 적용하면 검증 대상/기록이 섞일 수 있어 소스 해시와 별도 출력 경로로 확인한다.

- AC1 완료: iOS 본10개 성공, 실제 DB 지연 저장 후 홈 갱신과 늦은 응답 폐기, 원래 세션/fixture 정리 확인.
- AC2 완료(환경 범위): 사용자 직접 키보드 입력·제출·홈87,000원 확인 및 DB13건. production Chrome 실제 BFCache ready/pending 왕복2회 확인. WKWebView BFCache 자체는 미검증이며 Chrome 결과로 대체 주장하지 않는다.
- AC3 완료: PR #6 병합 완료를 최신 진행 요약에 반영, 원본 분리, 검증과 최신 초안 작성, 기존 자료 해시/Git 제외 검사.
- Ruling: 개발 HMR 때문에 실제 BFCache가 차단돼 같은 소스의 webpack production 서버3100을 사용했다. 제품 캐시 정책을 바꾸지 않았다. 이 결과를 개발 모드나 WKWebView로 일반화하면 잘못된 보장이 되므로 환경을 명시한다.
- 최종 리뷰: 검증 도구의 정리 경로2건을 보강하고 실제 페이지 종료/DB 잠금 실패 주입에서 복구·fixture 정리true 확인. 경미한 실행 주석/사용하지 않는 helper/홈 캡처 혼동도 해당 도구 정리에 함께 반영했다. 제품 코드 변화 없음. [검증](../verification/day-04-followup.md).
