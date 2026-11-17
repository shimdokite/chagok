# import·함수 선언 간격 확장 검증

2026-11-17, `/Users/doyeon/Desktop/chagok`, Node v24.22.3 (`.local-tools/node24/node_modules/.bin/node`).

## 범위와 기준 상태

사용자 피드백: “import 문 다음에도, export function... 이전에도 무조건 공백 한 줄 추가해줘.”

import 묶음 뒤와 함수 정의 앞에 실제 빈 줄 한 줄을 추가했다. 함수 뒤 규칙·함수 정의 대상은 유지한다. import끼리는 붙이고 JSDoc은 선언과 붙인다. 자동 검사는 import 묶음과 다음 코드의 경계를 검사하며 import 정렬은 수행하지 않는다.

시작 시 `git status --short`, `git diff`, `git diff --cached`를 확인했다. 기존 3일차·코드 컨벤션 작업이 미커밋 상태였으며 staged diff는 비어 있었다. 기준 diff·소스 스냅샷은 `/tmp/chagok-spacing-before/`에 보관했다. 아래 60개 파일에는 빈 줄 109개만 추가했다. 검사 스크립트·테스트·규칙 문서·이번 검증 및 초안은 별도 수정 대상이다.

## AC

| 항목 | 상태 | 확인 방법·결과 |
| --- | --- | --- |
| AC-1 지속 적용 | 충족 | AGENTS.md → docs/code-style.md 연결, docs/contributing.md 안내를 갱신했다. 기존 style:check 및 npm test pretest에 확장 검사가 적용된다. |
| AC-2 기존 위반 해소 | 충족 | 직접 작성한 87개 소스 검사, 위반 0건. SessionProvider의 import/Context/함수 선언 사이 빈 줄을 확인했다. |
| AC-3 자동 누락 감지 | 충족 | 신규 import·함수 앞 경계 15개 실패를 먼저 확인하고 수정 후 전체 검사 테스트 54개 통과. 주석·CRLF·여러 줄 import·type import·export·함수 변수·메서드 및 파일 끝 예외를 포함한다. |
| AC-4 코드 내용 보존 | 충족 | 간격 수정 60개 파일의 빈 줄 제외 원문과 TypeScript transpileModule의 출력 JavaScript가 각각 작업 전과 동일하다. |

## 자동 검증 — 5개 항목

1. **검사 회귀:** Node 24로 `node node_modules/vitest/vitest.mjs run scripts/check-function-spacing.test.ts` 실행. 기존 검사에서 신규 사례 15개 실패·39개 통과, 구현 후 54개 통과. 테스트 실패는 규칙 미지원으로 예상된 결과이며 최종 실패가 아니다.
2. **전체 테스트와 간격:** Node 24 PATH로 `npm test` 실행. pretest에서 87개 파일 위반 0건, Vitest 15개 파일 151개 통과·2개 파일 2개 건너뜀. `CHAGOK_TEST_DATABASE_URL`을 지정하지 않아 auth/store 및 benefits DB 통합 테스트는 이번 실행에서 미실행. 이번 작업은 DB 동작을 바꾸지 않으며 이전 결과를 이번 결과로 재사용하지 않았다.
3. **타입 검사:** 같은 PATH로 `npm run typecheck` 실행. mobile/web/api/contracts 4개 워크스페이스 모두 종료 코드 0.
4. **내용 보존:** 작업 전 소스 스냅샷과 현재 파일을 비교. 60개 파일의 실제 빈 줄을 제외한 모든 줄이 동일하며 `ts.transpileModule` 결과도 동일. 옵션은 ESNext target/module, ReactJSX, removeComments=true. 생성 파일·문자열·JSX 텍스트 변경 없음.
5. **문서·diff:** `git diff --check` 통과. 규칙과 예시·검사 명령 연결, PR 5개 절·커밋 4개 필수 항목을 확인. staged diff와 docs/learning·docs/pr-draft.md diff는 비어 있다. commit·push·PR은 수행하지 않았다.

## 사용자가 직접 확인할 항목

- 선택 확인: `apps/mobile/src/auth/SessionProvider.tsx`에서 마지막 import → Context → export function 사이가 각각 한 줄 띄워져 있는지 읽어 보기.
- 화면/서버/브라우저 검증: 해당 없음. 앱 소스는 빈 줄만 변경했고 변환 JavaScript도 동일하다. 이번 작업에서 빌드·네이티브 실행은 반복하지 않았다.
- 3일차 실제 Google 계정 UI와 기타 미검증 항목은 [3일차 검증 기록](day-03.md)에 그대로 남아 있다. 이번 간격 검사로 통과 처리하지 않는다.

## 사이드이펙트

확장 검사 때문에 앞으로 import 뒤·함수 앞 간격이 누락된 신규 코드도 `npm test`의 pretest에서 실패한다. 기존 함수 정의 판별 방식과 생성 파일 제외 범위는 유지했다. 의존성·런타임 로직·API·권한·DB 스키마·화면 동작은 이번 작업에서 변경하지 않았다. 함수 책임·복잡성은 기존처럼 리뷰 영역이며 이 검사로 판정하지 않는다. 기존 3일차 검증 로그·소스 해시 파일은 당시 기록으로 보존했다.

## 빈 줄만 수정한 파일

- `apps/web/next.config.ts`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/apply/page.tsx`
- `apps/web/src/app/api/trpc/[trpc]/route.ts`
- `apps/web/src/components/bridge/BridgeReceiver.tsx`
- `apps/web/src/lib/utils.ts`
- `apps/mobile/app.config.ts`
- `apps/mobile/app/index.tsx`
- `apps/mobile/app/_layout.tsx`
- `apps/mobile/src/metrics/bridge-benchmark.ts`
- `apps/mobile/src/metrics/benchmark-history.test.ts`
- `apps/mobile/src/metrics/bridge-benchmark.test.ts`
- `apps/mobile/src/metrics/benchmark-history.ts`
- `apps/mobile/src/auth/metric-journal.test.ts`
- `apps/mobile/src/auth/metric-journal.ts`
- `apps/mobile/src/auth/storage.ts`
- `apps/mobile/src/auth/api.ts`
- `apps/mobile/src/auth/SessionProvider.tsx`
- `apps/mobile/src/auth/google.ts`
- `apps/mobile/src/auth/session.ts`
- `apps/mobile/src/auth/session.test.ts`
- `apps/mobile/src/auth/metrics.ts`
- `apps/mobile/src/bridge/useWebViewBridge.ts`
- `apps/mobile/src/components/RecentRequestList.tsx`
- `apps/mobile/src/components/ApplyContainer.test.tsx`
- `apps/mobile/src/components/ApplyContainer.tsx`
- `apps/mobile/src/components/ApplyContainer.web.tsx`
- `apps/mobile/src/components/BenefitCategoryList.tsx`
- `apps/mobile/src/components/BenefitBalanceCard.tsx`
- `apps/mobile/src/components/ui.tsx`
- `apps/mobile/src/theme/tokens.ts`
- `apps/mobile/src/lib/trpc.ts`
- `apps/mobile/src/dev/BridgeDiagnostics.tsx`
- `apps/mobile/src/dev/webview-trace.ts`
- `apps/mobile/src/dev/useBoundaryProbe.ts`
- `apps/mobile/src/dev/useVisualCheckScroll.ts`
- `apps/mobile/src/dev/SessionDiagnostics.tsx`
- `apps/mobile/src/dev/ServerDiagnostics.tsx`
- `apps/mobile/src/benefits/cache.test.ts`
- `apps/mobile/src/benefits/queries.ts`
- `apps/mobile/src/benefits/api.ts`
- `apps/mobile/src/benefits/cache.ts`
- `packages/contracts/src/demo.ts`
- `packages/contracts/src/demo.test.ts`
- `packages/contracts/src/bridge.test.ts`
- `packages/contracts/src/bridge.ts`
- `packages/api/prisma.config.ts`
- `packages/api/scripts/measure-benefits.ts`
- `packages/api/src/http.test.ts`
- `packages/api/src/router.ts`
- `packages/api/src/auth/google.test.ts`
- `packages/api/src/auth/service.test.ts`
- `packages/api/src/auth/context.ts`
- `packages/api/src/auth/store.integration.test.ts`
- `packages/api/src/auth/google.ts`
- `packages/api/src/auth/service.ts`
- `packages/api/src/auth/store.ts`
- `packages/api/src/benefits/benefits.integration.test.ts`
- `scripts/verify-prototype.mjs`
