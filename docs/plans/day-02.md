# 차곡 2일차 계획 — 인증 기반과 신청 화면 UI 도구 도입

> 현재 상태: **실제 iOS 인증·WKWebView 검증 완료, 누적 PR 준비·게시 승인 대기** (2026-11-16 Asia/Seoul). 사용자의 후속 구현 요청에 따라 착수했다. 아래 원래 계획의 추정·체크박스는 당시 계획으로 보존하며, 현재 결과는 [실행 검증](../verification/day-02.md)을 따른다.

**Goal:** 기존 Google 인증·서버 사용자·세션 복원·로그아웃 목표를 유지하면서, Next.js 신청 화면에 Tailwind CSS와 shadcn/ui를 도입한다.

**Architecture:** RN은 로그인·홈·화면 이동을 담당하고, Next.js `/apply`는 웹뷰 안의 신청 UI를 담당한다. UI 전환은 비활성 데모 폼의 표현 계층에 한정하고 기존 브릿지 계약을 유지한다.

**Tech Stack:** 기존 Next.js·React·TypeScript·npm workspaces에 Tailwind CSS v4 계열·PostCSS·shadcn/ui를 추가할 계획이다. 실제 호환 버전은 구현 착수 시 검토하고 루트 lockfile에 고정하며, 이번에 패키지를 설치하거나 버전을 바꾸지 않는다.

**Spec:** [제품 범위](../product.md), [1일차 원본 명세](day-01.md)의 10일 목표·디자인 기준. 원본은 변경하지 않으며 **2일차 UI 도입 추가 범위는 이 문서**를 따른다. 인증 세부 설계 전체를 새로 확정하는 문서는 아니다.

## 범위와 접근

- **기존 2일차 필수:** 실제 Google 인증, 서버의 인증 결과 검증과 DB 사용자 등록/조회, 앱 세션 저장·복원·만료·로그아웃. 데모 진입을 실제 인증 완료로 간주하지 않는다.
- **추가 2일차 필수:** `/apply`의 버튼·입력·라벨을 shadcn/ui로 구성하고 Tailwind로 배치·테마를 적용한다. 도구 설치만으로 도입 완료라고 하지 않는다.
- **유지:** 신청 폼은 비활성 데모다. 신청 생성·한도·중복·권한 검증은 4일차, 사진·첨부·업로드는 5일차, 승인·반려는 6일차에 둔다.
- **제외:** RN UI를 웹 컴포넌트로 교체, 전체 디자인 시스템 구축, 관리자 화면 전환, 달력·모달·새 폼 라이브러리, 브릿지 메시지·URL 정책 변경.

선택한 접근은 기존 Next.js 프로젝트 안에서 신청 화면만 점진적으로 교체하는 것이다. 앱·웹 전체 UI 전환은 RN의 플랫폼 경계와 하루 작업량을 넘고, 라이브러리만 설치하는 접근은 실제 사용 경험을 남기지 못하므로 채택하지 않는다. RN과 웹은 색상·간격 기준을 맞추되 웹 DOM 컴포넌트를 RN에 직접 공유하지 않는다.

## 기존 계획과의 충돌 점검

| 확인 항목 | 판단 | 반영 방법 |
| --- | --- | --- |
| 원본의 Tailwind·shadcn 후속 도입 | 기술 방향 충돌 없음 | 도입 시점을 2일차로 구체화 |
| 2일차 인증 목표 | 대체하면 범위 충돌 | 인증 목표를 삭제·연기하지 않고 UI를 별도 작업으로 추가 |
| 하루 5~6시간·10일 일정 | **일정 압박 있음** | UI 설정·전환·회귀에 추가 5~10시간을 계획용 추정으로 확보해야 함. 인증까지 하루 안에 끝난다고 보장하지 않음 |
| 4일차 신청 기능 | 활성화하면 범위 충돌 | 입력·첨부·제출은 비활성 유지, 업무 API 추가 없음 |
| 승인 시안 | 기본 shadcn 스타일을 그대로 쓰면 충돌 | 기존 녹색·라이트/다크·간격·문구 유지, 재디자인 금지 |
| 기존 전역 CSS | `input, select, button` 일괄 스타일과 Preflight 충돌 가능 | 전환한 요소의 스타일을 컴포넌트·유틸리티로 옮기고 광역 규칙 정리 |
| 기존 다크 모드 | `.dark`만 추가하면 OS 테마 대응을 잃을 수 있음 | `prefers-color-scheme` 기반 의미 토큰과 dark 변형을 일치시키고 새 테마 전환 기능은 만들지 않음 |
| 기존 웹뷰 동작 | 버튼 교체·Client 경계 확대로 회귀 가능 | 닫기·로딩·재시도·메시지 계약 유지, 실제 iOS 웹뷰 재검증 |
| 학습 자료 제외 정책 | 지금 추적 제거하면 시점 충돌 | **2일차 구현 완료 후 PR 준비 때만** 로컬을 보존하며 추적 제거 |

시간 추정은 실측이 아니다. 기존 일정의 ‘일차’는 작업 순서이므로 2일차 범위가 끝나지 않으면 미완료로 기록하고 3일차 기능을 앞당기지 않는다. 실제 날짜가 늘어날 가능성을 기록하며, 착수 시 인증 준비 상황과 UI 소요를 확인해 달력 일정을 조정한다. 10일 내 완료를 보장하거나 이번 문서 작성으로 일정 연장을 확정하지 않는다.

## 공통 제약

- 기존 Node 24·npm workspace 구조 유지. `create-next-app`으로 재생성하지 않고 RN·Next·React 업그레이드를 UI 도입과 섞지 않는다.
- [직원 앱 시안](../design/chagok-mobile-reference.png)과 [HTML 시안](../design/chagok-prototype.html)의 문구·배치 기준 유지. 시안 원본과 1일차 측정 원본은 수정하지 않는다.
- `fieldset disabled`, 첨부·제출 준비 중 안내, 65,000원 데모 표시 유지. 버튼에는 용도에 맞는 `type="button"`과 비활성 속성을 명시한다.
- `WEB_READY/PING/PONG/CLOSE_WEBVIEW`, channel·version·requestId, `/apply` 허용 경로 유지. 인증 구현의 별도 요구가 생기면 UI 전환 변경과 분리해 검토한다.
- `/apply`의 정적 페이지를 불필요하게 전부 Client Component로 만들지 않는다. 브라우저 API·이벤트는 기존 `BridgeReceiver` 경계에 둔다.
- 단순 CSS 변경을 흉내 내는 단위 테스트는 추가하지 않는다. 기존 테스트와 실제 화면·동작 회귀로 확인한다.

## 예상 변경 파일 — 아직 수정하지 않음

아래는 **추가 UI 작업**의 파일 범위다. 인증 파일·OAuth 방식·세션 저장소·DB 연결은 기존 목표에 따라 구현 착수 전에 별도로 구체화한다.

| 처리 | 경로 | 책임 |
| --- | --- | --- |
| 수정 | `apps/web/package.json`, `package-lock.json` | 웹 workspace 의존성·버전 고정 |
| 신규 | `apps/web/postcss.config.mjs` | `@tailwindcss/postcss` 플러그인 |
| 수정 | `apps/web/tsconfig.json` | `@/*` → `./src/*` 별칭, 기존 설정 유지 |
| 신규 | `apps/web/components.json` | shadcn 소스·CSS·별칭 경로, RSC·TS 설정 |
| 신규 | `apps/web/src/lib/utils.ts` | 생성 컴포넌트의 클래스 조합 함수 `cn` |
| 신규 | `apps/web/src/components/ui/button.tsx`, `input.tsx`, `label.tsx` | 필요한 웹 컴포넌트 3종 |
| 수정 | `apps/web/src/app/globals.css` | Tailwind import·의미 토큰·기존 광역 규칙 정리 |
| 수정 | `apps/web/src/app/apply/page.tsx` | 컴포넌트 교체·배치·라벨 연결 |
| 필요 시 수정 | `apps/web/src/components/bridge/BridgeReceiver.tsx` | 닫기 버튼 표현만 교체, 메시지 처리 유지 |
| 신규 기록 | `docs/verification/day-02.md` | 향후 실제 검증·실패·수동 확인 항목 |

## 작업 순서와 검증 계획

모든 체크박스는 앞으로 수행할 작업이다. 지금 통과한 테스트나 완료한 기능을 뜻하지 않는다.

### 작업 1 — 기존 인증 목표와 UI 기준선 확인

- [ ] 실제 Google 인증 설정·앱 식별자·서버 검증 방식·DB 접속 준비를 확인하고 인증 세부 변경 계획을 작성한다. 누락된 계정 설정은 완료로 표시하지 않는다.
- [ ] 원본 2일차 목표의 로그인 성공·취소·실패, 동일 계정 사용자 재사용, 앱 재실행 복원, 만료·로그아웃을 구현·검증한다. 구체적인 인증 방식과 API 이름은 이 UI 추가 계획에서 임의로 확정하지 않는다.
- [ ] UI 전환 전에 `/apply`를 브라우저와 iOS 웹뷰에서 캡처하고 준비 신호·왕복·닫기·오류 복구 상태를 기록한다. 인증에 외부 대기가 생기면 독립적인 UI 준비는 진행할 수 있으나 2일차 전체 완료로 기록하지 않는다.

### 작업 2 — Tailwind·shadcn 설정과 실제 폼 전환

**입력:** 기존 비활성 `/apply`, 의미 색상과 브릿지. **출력:** 같은 경로·문구·비활성 동작을 가진 shadcn 기반 UI.

- [ ] `apps/web/AGENTS.md`와 설치된 Next의 CSS·Server/Client 문서를 읽고 호환 버전을 확인한다. 기존 프로젝트용 설정으로 Tailwind·PostCSS를 웹 workspace에만 추가하고 루트 lockfile을 사용한다.
- [ ] PostCSS와 CSS import, `@/*` 별칭을 구성하고 `components.json`의 경로가 `src/components/ui`, `src/lib/utils`, `src/app/globals.css`를 가리키도록 한다. CLI가 기존 CSS를 덮어쓰거나 루트에 다른 lockfile을 만들지 않았는지 확인한다.
- [ ] Button·Input·Label만 생성·사용한다. 복지 항목은 기존 HTML `select`, 사용일은 `Input type="date"`로 유지하고 복잡한 Select·DatePicker는 도입하지 않는다. Label의 `htmlFor`와 각 입력의 고유 `id`를 연결한다.
- [ ] 녹색 기본 버튼·배경·텍스트·경계선·비활성 스타일을 기존 토큰에 맞춘다. Tailwind v4 테마 토큰과 OS 다크 모드가 같은 값을 쓰도록 구성하고 Preflight 적용 전후 제목·입력·버튼 크기를 대조한다.
- [ ] 레이아웃을 유틸리티로 옮기면서 `min-width: 0`·`max-width: 100%`·날짜 입력 `appearance: none` 등 iOS 수정 효과를 유지한다. 기존 전역 버튼의 `width: 100%`가 닫기 버튼을 늘리지 않도록 해당 광역 규칙을 정리한다.
- [ ] `npm run typecheck`, `npm test`, `npm run build:web`를 실행한다. 모두 성공하고 CSS가 실제 빌드에 포함되었는지 확인하며, 실패하면 로그와 수정 후 결과를 구분한다.

### 작업 3 — 회귀 확인·기록·PR 준비

**검토할 실패 조건:** 비활성 제어 누락, OS 다크 모드 불일치, iOS 날짜 입력 넘침, 닫기 버튼 변형, 준비 신호·메시지 수신 손실. 아래 검증으로 각각 확인한다.

- [ ] `npm run dev:web` 후 브라우저 `http://localhost:3000/apply`와 `/` 리다이렉트를 확인한다. 입력·첨부·제출을 직접 시도해 비활성이 유지되고 신청 API 요청이 발생하지 않는지 확인한다.
- [ ] 키보드로 닫기 등 활성 버튼의 포커스·동작을 확인하고, 입력 라벨 연결·비활성 속성을 확인한다. 기본/작은 화면과 라이트/다크에서 기존 시안과 비교한다.
- [ ] iOS Development Build에서 웹뷰 열기 → `WEB_READY` → 왕복 → 닫기 → 재진입, 웹뷰 다시 로드와 서버 오류·재시도를 확인한다. 지원 가능한 기존 iPhone 13 mini·iPhone 17 환경에서 날짜 입력·스크롤·화면 잘림을 확인하고 실제 기기/OS를 기록한다.
- [ ] 새 성능 측정이 필요하면 동일 환경·새 소스 식별자로 별도 원본을 남긴다. 기존 1일차 약 1.83ms를 이번 변경의 성능이나 개선 효과로 재사용하지 않는다.
- [ ] 검증 문서에 자동 검사 결과와 브라우저/iOS 확인 결과, 사용자 수동 확인 대기를 분리한다. 사용자가 화면을 확인할 수 있도록 개발 서버와 경로를 안내한다.
- [ ] **2일차 구현·확인 종료 후 PR 준비 시** `docs/contributing.md`에 따라 학습 파일을 로컬 보존하고 Git 추적만 제거한다. README 등 현재 안내 링크를 정리하고, 학습 경로 diff는 삭제만 있는지 확인한다. 사용자 승인 뒤에 PR을 게시한다.

## 완료 기준 — 원래 계획 (현재 판정은 실행 검증 참고)

| ID | 2일차 완료 조건 | 향후 확인 방법 |
| --- | --- | --- |
| D2-01 | 기존 실제 인증·DB 사용자·복원·만료·로그아웃 목표 유지 및 완료 | 인증 세부 계획의 자동 검사와 실제 앱 시나리오, 비밀값을 제외한 기록 |
| D2-02 | Tailwind 설정과 Button·Input·Label이 `/apply`에서 실제 사용됨 | 의존성·import·DOM·production 빌드 확인 |
| D2-03 | 기존 시안·문구·라이트/다크·작은 화면 유지 | 전후 캡처와 브라우저/iOS 비교 |
| D2-04 | 입력·첨부·제출 비활성, 신청 저장 기능 없음 | 실제 조작·비활성 속성·네트워크 요청 확인 |
| D2-05 | iOS 날짜 입력·스크롤·닫기 버튼·라벨·활성 버튼 포커스 회귀 없음 | 실제 웹뷰와 브라우저 확인, 미확인 환경 별도 표시 |
| D2-06 | 준비 신호·왕복·닫기·재로드·오류 복구 유지 | 기존 테스트 및 iOS 시나리오 |
| D2-07 | 타입 검사·기존 테스트·웹 빌드 통과 | 명령·환경·종료 코드 기록 |
| D2-08 | 실제 검증·수동 확인·측정 여부와 한계를 구분 | 검증 문서와 사용자 화면 확인 |
| D2-09 | PR 준비 때 로컬 학습 보존·추적 제거·안내 링크 정리 | 로컬 해시·`git ls-files`·staged/PR 전체 diff 확인 |

## 참고 근거

2026-11-16 문서 검토 기준이다. 공식 가이드는 Tailwind의 PostCSS 플러그인·CSS import, shadcn의 기존 프로젝트 설정·별칭, Preflight의 기본 스타일 변경을 설명한다. 위 파일 배치·작업 범위·시간 추정은 차곡 저장소에 적용하기 위한 계획이며, 설치·실행 결과가 아니다.

- [Tailwind의 Next.js 설치 안내](https://tailwindcss.com/docs/installation/framework-guides/nextjs)
- [Tailwind Preflight](https://tailwindcss.com/docs/preflight)
- [shadcn/ui 기존 Next.js 프로젝트 안내](https://ui.shadcn.com/docs/installation/next)

## 구현 착수 결정 — 2026-11-16

현재 사용자 요청으로 2일차 구현을 시작한다. 위의 미시작 표시는 원래 계획 작성 시점 기록이며 실제 판정은 `../verification/day-02.md`를 따른다.

- 기존 미커밋 수정과 미추적 인계를 보존하여 현재 폴더에서 진행한다. 초기 상태/해시는 `../verification/day-02/initial-state.json`. 커밋·push·PR·학습 추적 제거는 보류한다.
- 인증: 네이티브 Google Sign-In → ID token POST → Google Auth Library의 서명·audience·issuer·expiry 검증 → Google sub 고유키 사용자 upsert. 이메일로 계정을 병합하지 않고 필요한 id만 앱에 반환한다.
- DB: PostgreSQL + Prisma 7.10.1, User(googleSub unique), Session(tokenHash unique, userId, expiresAt). 세션은 32 random bytes, SHA-256 해시만 DB 보관, 고정 7일 만료. 자동 연장/refresh token 없음. 현재 세션만 폐기하며 Google 계정 권한 철회와 구분한다.
- API: `auth.signIn({idToken})`, `auth.session`(Bearer), `auth.signOut`(Bearer). health 공개 상태 유지. 인증 오류는 일반화해 토큰/개인정보/DB 접속값을 노출하지 않는다.
- 앱: SecureStore에 토큰만 저장. 시작/foreground 시 서버 검증; 만료·401는 삭제, 일시 네트워크 오류는 저장 유지+로그인 권한 보류+재시도. 로그아웃 시 서버 폐기를 먼저 확인하고 실패하면 완료로 표시하지 않는다. 저장 삭제 실패도 재시도 가능 상태로 남긴다. 중복 작업 잠금과 세대 번호로 늦은 응답 차단.
- UI: 기존 디자인 유지, Button/Input/Label 소스를 가져와 테마·크기를 조정한다. `/apply`는 Server Component를 유지하고 bridge만 Client 경계. 폼·첨부·제출은 disabled 유지.
- 측정: `restore` 진입부터 SecureStore 읽기와 서버 판정/오류 상태 확정까지 `performance.now()`로 측정. UI paint/전체 콜드 스타트 제외. 실제 정상 앱 재실행 10회 계획, 성공/실패/timeout/취소 모두 익명 기록. OAuth 설정 부재 시 실측을 가짜 데이터로 대체하지 않는다.
- 순서: (1) 인증·세션 RED 테스트 → 구현 → GREEN, (2) 웹 UI 전환 및 회귀, (3) 전체 검사·네이티브 재빌드·실측 가능한 범위 확인, (4) AC·수동 확인·학습·초안 작성.
- 실제 Google 로그인에는 사용자 소유 Google Cloud iOS/Web client ID가 필요하다. 현재 환경에는 없음. DB도 아직 없음. 준비 상태를 질문했고 독립 작업을 진행한다.
- 검토할 경계: 잘못된 audience/만료 토큰, 동일 계정 동시 등록, 만료 경계 시각, 로그아웃 중 늦은 복원, 저장·네트워크 장애. 해당 자동 테스트와 실제 앱 확인을 분리한다.

## 진행 상태와 검증 중 보완

- 인증 API·Prisma User/Session·SecureStore 기반 상태 제어·Tailwind/shadcn 전환 구현. 실제 Google client ID는 사용자 답변 “없음”으로 확인; 로컬 PostgreSQL18.6을 별도 구성했다.
- DB 실제 통합 검사로 빈 migration 문제를 발견해 SQL을 다시 생성·적용했다. 실제 Google 검증은 이를 대체하지 않는다.
- 독립 리뷰에서 foreground 복원 중 화면 이탈·tRPC timeout 분류 문제를 재현하여 수정했다.
- 8081 native Metro와 8082 웹 미리보기 동시 실행 중 health 연결 실패 발견. 개발용 CORS에 localhost/127.0.0.1:8082만 추가하고 임의 Origin·production 차단 테스트를 보완했다.
- 측정 journal은 재실행 간 보존하며 최대100개에서 덮어쓰지 않는다. 실제 로그인 복원10회는 OAuth 설정 후 수행; 현재 정상 인증 표본0개.
- 현재 자동·기기 결과와 남은 사용자 확인은 [실행 검증](../verification/day-02.md)에서 항목별 판정한다. 3일차 기능·커밋·push·PR·학습 추적 제거는 수행하지 않았다.

## OAuth 후속 실행

사용자가 두 .env.local 설정을 완료했다. 정적 검사·signed iOS 재빌드·설치·Google 안내 취소/재시도까지 확인했고 실제 계정 입력을 기다린다. 원래 정상 복원10회 계획과 범위는 유지하며 [후속 AC](../verification/day-02/oauth/result.md)에서 결과를 갱신한다.

후속 갱신: 실제 Google 성공 후 정상 재실행10회, 장애 복구, 로그아웃을 확인했다. 기기 좌표 제어 오류로 동일 계정 재로그인 계속 버튼 사용자 입력을 기다리며 만료·duration 원본 export가 남아 있다.

최신 후속 상태: 동일 계정 재로그인에서 기존 User1 재사용/새 Session1 생성, 해당 검증 세션1건만 만료 후 재로그인 안내 확인. 인증 시나리오 검증은 완료했으며, 측정 공유창 Copy의 사용자 조작과 duration 원본 추출·통계가 남아 있다.

최종 OAuth 후속 결과: 사용자 Copy 완료 후 원본17개 저장, 정상 startup10/10 성공·중앙값225.98ms·범위140.14~858.87ms, 독립 재계산 일치. A1~A6 모두 충족. 앱은 만료 검증 후 데모를 종료한 로그인 화면이다. 실제 인증·측정은 완료했으며 기존 WKWebView 포커스·재로드 안정성·전체 UI 사용자 인수와 PR 준비는 별도 대기다.

## WKWebView 포커스·재로드 후속 계획

사용자 요청에 따라 계획 공유 후 현재 폴더에서 기존 미커밋 구현을 이어 검증한다. 커밋·push·PR·학습 추적 제거는 하지 않는다. 초기 상태는 verification/day-02/wkwebview/initial-state.json, 전체 diff는 Git 제외 로컬 도구 폴더에 보존한다.

- [x] W1: WKWebView 닫기 버튼 키보드 포커스 표시·Enter/Space 활성화·홈 복귀, disabled 폼 입력 차단. 결함이면 BridgeReceiver/Button/globals.css 최소 수정.
- [x] W2: ApplyContainer/useWebViewBridge의 정상 재로드10회, 닫기/재진입, 연속 재로드, 서버 중단/복구에서 WEB_READY 및 오류/재시도 판정 검증.
- [x] W3: 필요 시 개발 진단 로그로 loadStart/ready/loadEnd/timeout 순서 수집. 재현 실패 테스트→최소 수정→회귀 확인. 원인이 다른 범위면 수정 전 계획 갱신.
- [x] W4: 관련/전체 테스트, 타입, 웹 빌드 및 실제 WKWebView 확인. native 설정 변경 시에만 iOS 재빌드.
- [x] W5: 현재 소스·검증 증거·AC·사용자 확인·학습·최신 초안 정리. 기존 OAuth/측정 원본과 사용자 변경 보존.

검토 경계: WEB_READY 전후 loadStart, 이전 revision의 늦은 이벤트/타이머, 빠른 연속 reload, 미응답 서버와 복구, 키보드 조작 시 disabled 제어/닫기. 이번 사용자 지시가 실행 승인 범위이므로 계획 승인 질문을 반복하지 않는다.

후속 완료: W1 사용자 Option+Tab/Space 확인, W2 일반10/10·연속5회·장애 복구/왕복20회·측정 취소 확인, W3 결함 미재현으로 수정 해당 없음, W4 타입/DB60테스트/웹 빌드 통과, W5 기록 정리. 과거 timeout 원인 미확정은 보존한다. [상세 결과](../verification/day-02/wkwebview/result.md).

## 오류 원인 재조사 — 사용자 후속 요청

앞선 정상 반복 성공과 원인 규명은 다르다는 사용자 지적을 반영한다. 변경 전 공유한 R1~R5 계획으로 현재 미커밋 변경을 보존하며 진행한다. initial-state는 verification/day-02/timeout-investigation/initial-state.json이다.

- R1: 당시 앱·WebContent·RunningBoard 로그를 제한된 시간대로 다시 확보하여 사건 순서를 재구성한다. 과거 원본은 수정하지 않는다.
- R2: ApplyContainer와 개발 진단 UI, webview-trace/test에 revision·단조 시각·로드/ready·timer·구분된 오류를 추가한다. 원본 URL/message/error description을 기록하지 않으며200개 한도/누락 수를 표시한다. 진단 조회는 명시적 버튼이며 Release에서는 수집하지 않는다.
- R3: 프로세스 재실행 후 첫 웹뷰, 일반/연속 재로드, 실제 서버 무응답과 실제 WebContent 종료를 분리 재현한다. 과거 사건과 통제 실험의 원인을 동일시하지 않는다.
- R4: 재현 결함만 실패 회귀 검사 후 수정하며 타입·실제 DB 전체 검사·실제 WKWebView 확인을 실행한다. 네이티브 의존성 변화가 없으면 재빌드는 생략한다.
- R5: 오류 분류의 증거 부족과 앞선 완료 표현을 정정하고 검증·학습·진행·최신 초안을 갱신한다. 원인 확정 범위와 남은 추정은 분리한다.

수정 전 발견: 기존 오류 화면은 ready-timeout/load-error/http-error/content-process-terminated를 구분하지 않는다. 당시 WebContent 종료 자체는 앱이 요청했고 HTTP200·첫 표시12.46초라는 시스템 로그를 추가로 확인했다. 기존 로그만으로 WEB_READY 수신/타이머 발생 시각은 알 수 없으므로 가설을 확정 사실로 쓰지 않는다.

R1~R5 실행 결과: 오류 종류·당시 사건 순서·진단 공백을 재조사하고 개발 계측을 추가했다. 정상3회/첫 진입, 서버 ready-timeout·WebContent 종료 구분/복구, 응답 대기 중3회 교체와 이전 timer 해제 검증. 타입/실제 DB64테스트/왕복20회 통과. 과거 최종 JS 분기까지100% 확정한 것은 아니며 [상세 판정](../verification/day-02/timeout-investigation/result.md)을 따른다.

최종 독립 리뷰: Critical/Important 없음. Final: minor (deferred): 웹 닫기 close 기록 누락과 unmount revision0은 기능 회귀가 아닌 진단 제한으로 공개하고 보류한다. 최종 판단과 제외 범위는 [리뷰 기록](../verification/day-02/timeout-investigation/review.md)에 보존한다.

## 종료 기록 보류 사항 수정 — 2026-11-16

변경 전 C1~C5를 공유했다. ApplyContainer.tsx 공통 닫기 기록·마지막 committed revision, ApplyContainer.test.tsx의 실제 컴포넌트/bridge 경로 회귀, 검증/학습/초안을 갱신한다. 기존 두 진단 문제만 수정하며15초 제한과 UI/의존성은 유지한다.

C1 웹 close1회·C2 마지막 revision cleanup·C3 RED→GREEN/전체 회귀·C4 결과/한계 기록·C5 로컬 학습과 초안/기존 자료 보존을 확인했다. RED3실패→대상7통과, 전체71통과 및 타입 성공. [결과](../verification/day-02/trace-close/result.md). 독립 리뷰에서 조치 필요 결함 없음. 화면 구성 변경이 없어 새 서버/브라우저 열기 해당 없음, native OS 재실행은 미검증이다.

## iOS 종료 실측 후속 — 2026-11-16

변경 전 N1~N5 계획을 공유했다. webview-trace.ts에 임시 개발 로그 sink를 추가해 종료 이후 원본을 수집하고 검증 후 시작 파일로 복원한다. N1 원본/계측 복원, N2 재로드2회 후 웹 close/unmount 마지막 세대 일치, N3 새 화면 재로드3회 후 native 닫기 동일 조건, N4 원본/자동 검사/범위 기록, N5 학습/초안·기존 원본 보존이 AC다. iOS27.2 Simulator의 실제 native app/WKWebView 기준이며 물리 iPhone 실측은 아니다. 새 증거는 verification/day-02/native-close에 저장한다.

N1~N5 결과: 웹 세대2 close→unmount 각1회(사용자 클릭), native 세대3 각1회(도구 클릭), 홈 복귀·종료 timer 정리 확인. 임시 sink 제거 후 소스82개 보존, 최종71테스트/타입 통과. [최종 검증](../verification/day-02/native-close/result.md). 실제 물리 기기/Release·임의 이벤트 순서 검증은 범위 밖이며 과거 타임아웃 분기까지 해결됐다는 뜻은 아니다.
