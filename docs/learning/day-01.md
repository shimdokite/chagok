# 차곡 1일차 학습 기록

React·Next.js·Node.js 경험을 출발점으로 설명합니다. 실제 변경한 코드와 확인 범위를 연결합니다. 오늘 구현은 완료된 인증이나 실제 신청 서비스가 아닙니다. Xcode 설치 후 iPhone 17/iOS 27.2 시뮬레이터에서 네이티브 실행과 브릿지 실측을 확인했습니다. 실제 iPhone 실행은 미확인입니다.

## 작업 A — 프로젝트 실행 기반

npm workspaces는 세 개의 서버를 만드는 도구가 아니라 여러 패키지를 한 저장소에서 설치·연결하는 방법입니다. 실제 실행 프로세스는 Expo/Metro와 Next.js 두 가지입니다. `packages/contracts`는 React 없이 순수 TypeScript/Zod를 공유합니다.

웹에서 JSX의 div는 DOM이 됩니다. RN에서는 View가 네이티브 컨테이너, Text가 네이티브 텍스트, Pressable이 터치 가능한 요소가 됩니다. CSS 파일 대신 StyleSheet 또는 RN 스타일 객체를 씁니다. 단위 없는 숫자는 화면 밀도를 고려한 논리적 크기이며 CSS cascade와 똑같이 동작하지 않습니다.

Development Build는 `expo-dev-client`와 프로젝트의 네이티브 모듈이 들어간 앱입니다. Metro는 JS를 공급하지만 앱 자체를 설치하는 빌드가 아닙니다. `expo export` 성공도 앱 실행 성공이 아닙니다. Expo Go와 Development Build도 구분해야 합니다.

## 작업 B — 화면·fixture·API

### 1. `apps/mobile/app/_layout.tsx`, `index.tsx`, `home.tsx`

- 함수: Layout, Login, Home.
- 입력: 현재 경로와 화면 상태. 출력: Stack 안의 로그인·홈·신청 화면.
- 이유: 익숙한 Next.js 파일 기반 라우팅과 비슷하지만 화면 전환과 뒤로 가기는 네이티브 Stack의 생명주기를 따릅니다.
- 핵심 코드: `router.replace('/home')`는 로그인 화면을 대체해 데모 진입합니다. 실제 인증 토큰이나 세션을 만들지 않습니다. `router.push('/apply')`는 홈 위에 신청 화면을 올립니다.
- 오류/미구현: Google 버튼은 disabled, 내역/안내는 준비 중입니다. SafeAreaProvider와 SafeAreaView로 노치·시스템 영역을 피합니다.
- 연습: 데모 버튼의 replace를 push로 바꾸면 뒤로 가기 이력이 어떻게 달라지는지 예상하고, 실기기 환경 준비 후 확인한 다음 되돌립니다.

### 2. `packages/contracts/src/demo.ts`와 `BenefitBalanceCard.tsx`

- 함수: `balance(requests, total)` → `{total, used, available}`.
- 입력: 원 단위 정수의 신청 배열. 출력: 100,000 - 15,000 - 20,000 = 65,000.
- 이유: 웹과 앱에 65,000이라는 상수를 따로 두면 데이터가 어긋납니다. 단일 fixture와 순수 산식으로 표시를 맞춥니다.
- 핵심 코드: `item.status === 'REJECTED' ? 0 : item.amount`. 검토 중과 승인 완료만 예약 금액에 포함합니다. 이 함수는 현재 **표시용 fixture 계산**이며 보안 검증이나 DB 한도 처리가 아닙니다.
- 오류 처리: 실제 입력 폼을 막고, 저장·금액 변경 API를 만들지 않았습니다. 서버 검증은 이후 신청 구현 범위입니다.
- 연습: 도서비 fixture를 15,000→10,000으로 바꿔 홈과 웹 안내가 70,000으로 함께 바뀌는지 보고 원복하세요. 관련 테스트의 기대값은 승인 기준선이라 실패하는 이유도 설명해 보세요.

### 3. `apps/mobile/src/lib/trpc.ts` → `packages/api/src/router.ts` → 웹 `api/trpc/[trpc]/route.ts`

- 호출: `trpc.health.check.query()`.
- 입력: 없음. 출력: 실제 서버에서 `{status:'ok', service:'chagok'}`.
- 이유: 앱과 서버가 AppRouter 타입으로 연결되어 경로와 결과의 타입이 맞습니다. 타입 공유가 HTTP 통신을 없애지는 않습니다.
- 핵심 코드: `import type { AppRouter }`는 컴파일 뒤 사라집니다. 모바일 번들에서 서버의 initTRPC나 비밀값을 실행하지 않습니다. Next.js는 Node.js 런타임 fetch adapter로 요청을 처리합니다.
- 오류 처리: 5초 후 abort, 실패 안내, 직접 재시도. fixture를 성공 응답으로 대체하지 않습니다. 브라우저 미리보기는 개발 환경에서 localhost/127.0.0.1:8081만 CORS 허용합니다.
- 연습: Next 서버를 끄고 앱 개발 도구에서 오류를 확인한 뒤 다시 켜서 성공을 확인하세요. 네이티브의 localhost와 Mac의 localhost가 다른 이유도 설명해 보세요.

## 작업 C — 웹뷰와 런타임 계약

### 4. `packages/contracts/src/bridge.ts`, `useWebViewBridge.ts`, `BridgeReceiver.tsx`

- 입력: 신뢰할 수 없는 unknown/문자열. 출력: 검증된 BridgeMessage 또는 실패.
- 이유: TypeScript 타입은 런타임에 지워집니다. 다른 실행 환경에서 온 JSON은 Zod로 검증해야 합니다.
- 순서: 웹 수신 함수 등록 → WEB_READY → 앱 PING(requestId) → 웹 PONG(동일 requestId).
- 웹→앱: `window.ReactNativeWebView.postMessage(JSON.stringify(message))`.
- 앱→웹: 검증된 객체를 JSON.stringify한 후 `injectJavaScript`로 등록 수신 함수에 전달합니다. ID를 코드 문자열에 직접 삽입하지 않습니다. 끝의 `true;`는 WebView 주입 실행의 반환값을 명시합니다.
- 검증: channel, version=1, 네 가지 type, 빈 payload, 1~128자 requestId, 불필요한 필드 거부. 수신 방향도 제한합니다.
- 오류 처리: 잘못된 메시지는 동작하지 않고 개발 로그에 이유만 표시합니다. origin과 정확한 /apply 경로를 검사하고 새 창은 열지 않습니다. origin은 인증을 대신하지 않습니다.
- 연습: 계약 테스트의 메시지를 version=2로 보내 거부를 확인합니다. WEB_READY는 입력 폼·인증·정책 준비 완료를 뜻하지 않는다는 점도 설명하세요.

## 작업 D — 테스트·측정·정리

### 5. `bridge-benchmark.ts`, `benchmark-history.ts`, 개발 도구

- 함수: `runBridgeBenchmark({count:20, intervalMs:100, timeoutMs:3000})`와 `runRecordedBenchmark`.
- 입력: 준비된 브릿지와 환경 정보. 출력: 준비 표본·본 표본·요약·실험 상태를 포함한 원본.
- 이유: Promise를 순서대로 await하고, 각 응답/시간 초과 이후 100ms 기다려 동시 요청의 간섭을 줄입니다.
- 시계: RN `performance.now()`로 전송과 수신을 모두 측정합니다. 웹과 RN 시계의 기준점이 다르므로 웹 timestamp를 빼지 않습니다. KST 벽시계는 기록 날짜용이고 duration 계산용이 아닙니다.
- 대응: 진행 중 Map에서 requestId를 찾고 한 번 완료하면 제거합니다. 중복 PONG과 뒤늦은 PONG은 추가 성공이 되지 않습니다.
- 오류 처리: timeout, send failure, cancelled를 분리합니다. JS 타이머가 늦을 수 있으므로 응답 수신 시 실제 경과 시간도 검사합니다. reset은 pending·간격 타이머를 정리하고 세션을 바꿉니다.
- 원본 보관: 화면 바깥의 작은 메모리 저장소가 최근 10개 실험을 유지합니다. 홈 개발 도구에서 닫힌 실험도 공유할 수 있습니다. 앱 재시작까지 보존하는 DB는 아닙니다.
- 연습: 기기 준비 후 측정 중 닫고 홈에서 원본을 공유하세요. 개별 sample 취소 수가 0인데 run이 cancelled일 수 있는 경우(응답 사이 간격 중 닫기)를 설명해 보세요.

## 오늘 검증에서 배운 점

- 처음 28개 중 15개 실패는 미구현 때문이었습니다. 구현 후 28개 통과.
- 브라우저에서 서버는 200이어도 CORS 때문에 클라이언트가 실패할 수 있었습니다. 재현 테스트 후 개발 origin만 허용했습니다.
- WebView 14의 기본 제네릭 `undefined`가 props 교집합을 never로 만들었습니다. `WebView<object>`로 명시해 타입 검사했습니다. any로 숨기지 않았습니다.
- 리뷰로 찾아낸 늦은 타이머·닫힌 원본 손실은 테스트 3개를 먼저 실패시킨 뒤 수정했습니다. 전체 33개 통과.
- 네이티브 번들 생성과 expo-doctor 통과는 실제 기기 실행·메모리 누수·RTT 실측을 보장하지 않습니다.

## 용어

| 용어·발음 | 의미 |
| --- | --- |
| React Native(리액트 네이티브) | React로 네이티브 화면 구성 |
| Expo(엑스포), Metro(메트로) | 앱 개발 도구 모음, JS 번들러 |
| Development Build(디벨롭먼트 빌드) | 프로젝트의 네이티브 모듈을 포함한 개발 앱 |
| WebView(웹뷰), Bridge(브릿지) | 앱 안의 웹 화면, 서로 다른 실행 환경의 메시지 연결 |
| Handshake(핸드셰이크) | 수신 준비 확인 |
| Runtime validation(런타임 밸리데이션) | 실행 중 실제 입력 검증 |
| tRPC(티알피시), Zod(조드) | 타입 공유 API, 런타임 스키마 라이브러리 |
| Origin(오리진) | 프로토콜·호스트·포트 조합 |
| RTT(알티티) | 요청과 응답의 왕복 시간 |
| Monotonic clock(모노토닉 클록) | 시스템 시각 변경에 영향받지 않는 경과 시간 시계 |
| Cleanup(클린업) | 화면 종료·재로드 때 자원 정리 |
| Baseline(베이스라인), AC(에이시) | 실제 비교 기준선, 완료 판정 기준 |

## 예상 질문과 답변 — 실제 확인한 범위로 말하기

**Q. 웹 개발과 무엇이 달랐나요?**

리액트의 컴포넌트와 상태 개념은 같지만, 화면 요소와 실행 환경을 따로 다뤄야 했습니다. 웹의 디브와 CSS 대신 뷰, 텍스트, 프레서블로 화면을 구성하고 안전 영역과 화면 이동을 처리했습니다. 또 앱의 메트로와 넥스트 서버가 별도 프로세스라는 점을 확인했습니다. 처음에는 엑스코드가 없어 브라우저와 번들까지만 확인했지만, 설치 후 아이폰 시뮬레이터에서 네이티브 앱과 웹뷰를 실행했습니다. 앱 빌드, 메트로, 넥스트 서버가 별개라는 점을 직접 확인했습니다. 실제 아이폰과 시뮬레이터의 검증 범위도 구분했습니다.

**Q. 타입스크립트가 있는데 왜 런타임 검증이 필요한가요?**

외부 메시지의 실제 값은 타입스크립트만으로 보장할 수 없기 때문입니다. 웹뷰 메시지는 먼저 언노운으로 받고 조드 스키마로 채널, 버전, 종류, 페이로드와 요청 ID를 검사합니다. 검증을 통과한 메시지만 준비 상태나 요청 응답 처리에 사용합니다. 잘못된 JSON과 버전, 빈 ID, 추가 필드를 거부하는 테스트도 작성했습니다. 타입을 공유하는 티알피시도 인증과 권한 검증을 대신하는 것은 아니므로, 실제 인증은 다음 단계로 분리했습니다.

**Q. 측정은 어떻게 했나요?**

아이폰 시뮬레이터의 개발 빌드에서 준비 세 번과 본 측정 스무 번을 실행했고 모두 성공했습니다. 중앙값은 약 1.83밀리초였고 원본의 요청 ID, 환경값, 시각 차이를 다시 대조했습니다. 실제 아이폰의 출시 성능을 뜻하지는 않습니다. 설계상 같은 리액트 네이티브 시계로 전송 직전과 응답 수신 시각을 비교하며, 준비 세 번과 본 측정 스무 번을 나눕니다. 요청 ID로 응답을 대응시키고 시간 초과와 취소도 기록합니다. 리뷰에서는 타이머가 늦게 실행되면 삼 초를 넘긴 응답도 성공이 될 수 있다는 문제를 찾아 실제 경과 시간 검사로 수정했습니다. 원본은 공유 메뉴로 저장했으며 재진입 후 측정도 별도 실험으로 남겼습니다.

**Q. 닫힌 화면의 응답은 어떻게 처리하나요?**

화면 종료 시 이전 요청과 타이머를 취소하고 새 세션과 분리합니다. 응답은 진행 중인 요청 ID에만 대응되며, 이미 처리했거나 시간 초과된 ID는 다시 성공으로 집계하지 않습니다. 처음에는 화면을 닫으면 취소 원본도 사라지는 문제가 있었는데, 화면 밖 메모리에 최근 실험을 보관하도록 수정했습니다. 덕분에 홈에서 닫힌 세션도 내보낼 수 있습니다. 단위 테스트 외에도 시뮬레이터에서 준비 왕복 도중 닫기와 재로드를 실행해 취소 원본이 보관되고 새 세션에서 스무 번 측정이 성공하는 것을 확인했습니다. 본 측정 중 모든 응답 타이밍을 수동 재현한 것은 아닙니다.

**Q. 지금 완료한 것과 남은 것은 무엇인가요?**

지금은 데모 화면과 서버·웹뷰 연결 기반까지 구현했습니다. 브라우저에서 데모 진입, 고정 한도, 비활성 신청 폼, 실제 서버 성공과 장애 복구를 확인했습니다. 자동 테스트와 타입 검사, 웹 빌드, 네이티브 번들도 확인했습니다. 실제 구글 로그인, 데이터베이스 저장, 사진 업로드와 승인·반려는 구현하지 않았습니다. 이후 엑스코드로 일일차의 시뮬레이터 검증과 측정도 마쳤습니다. 다음은 사용자의 화면 승인과 남은 실기기·접근성·시안 회귀 확인이며, 이일차 기능은 별도 요청 이후에 시작합니다.

## Xcode 설치 후 이어서 배운 개념

### 앱 빌드와 JavaScript 서버는 별도 단계

Next.js에서 `next dev`는 브라우저가 읽을 웹을 제공합니다. RN에서는 Xcode와 CocoaPods로 네이티브 실행 파일을 먼저 만들고, Metro가 그 앱이 읽을 JavaScript를 제공합니다. WebView 라이브러리는 네이티브 바이너리에 포함되어야 합니다. 따라서 `expo export` 성공만으로 iOS 설치·실행 성공을 대신할 수 없습니다.

이번 준비의 입력은 `app.config.ts`, 생성된 `ios/Podfile`, npm 의존성입니다. `pod install`의 출력은 Pods와 Xcode workspace, Xcode 빌드의 출력은 시뮬레이터용 `.app`입니다. 이후 JS 변경은 보통 Metro로 반영하지만 네이티브 의존성 변경은 앱을 다시 빌드해야 합니다.

### 개발 도구 경로가 실행 결과에 영향을 줌

`DEVELOPER_DIR`는 이번 명령이 사용할 Xcode를 지정합니다. `PATH`는 Node·Ruby·pod 바이너리 탐색 순서이고, `GEM_HOME`은 Ruby 패키지를 설치하고 찾는 위치입니다. OS 업데이트 후 임시 Node가 사라져 프로젝트 `.local-tools`에 복구했습니다. 시스템 Node/Ruby 버전과 실제 빌드에 사용한 버전을 구분해 기록했습니다.

확인 연습: 프로젝트 루트에서 README의 환경을 설정한 뒤 `which node`, `node -v`, `pod --version`, `xcodebuild -version`을 실행해 기록과 대조합니다. Xcode 앱 설치, 약관 동의, 시뮬레이터 런타임 다운로드는 서로 다른 단계입니다.

### 실측 환경값을 원본에 포함하기

`apps/mobile/src/bridge/useWebViewBridge.ts`에서 `process.env.EXPO_PUBLIC_BENCHMARK_DEVICE` 등 공개 설정을 읽어 각 실험의 환경값으로 전달합니다. 입력은 `.env.local`의 확인된 모델·빌드·웹 모드·소스 해시이고 출력은 공유 JSON의 environment 및 sample 필드입니다. 기본값은 ‘미지정’ 또는 working-tree이므로 미설정 상태를 실측 완료로 간주하지 않습니다.

Expo가 번들에 넣는 `EXPO_PUBLIC_*`에는 비밀값을 넣으면 안 됩니다. 기기명을 바꾸면 자동 탐지되는 구조가 아니므로 시뮬레이터/실기기 전환 때 설정을 갱신하고 Metro를 다시 시작해야 합니다. RN의 `Platform.Version`은 실행한 iOS 버전을 읽고, 소스 manifest의 SHA256은 측정한 코드 묶음을 식별합니다.

시뮬레이터 왕복 수치는 Mac의 CPU·호스트 부하·개발 서버 조건을 포함합니다. 실제 iPhone이나 출시 빌드의 성능으로 일반화하지 않습니다.


### iOS 실행에서만 발견한 두 문제

첫째, `apps/web/next.config.ts`의 `allowedDevOrigins: ["127.0.0.1"]`는 iOS 시뮬레이터가 쓰는 루프백 호스트의 Next 개발 리소스 접근을 허용합니다. API CORS와 다른 계층입니다. 실제 API는 성공해도 HMR이403이면 웹 준비가 실패할 수 있었습니다. 설치된 Next 문서를 읽고403을 재현한 뒤 호스트 한 개만 추가했습니다. 미허용 외부 origin은 계속403이고 WebView에서는 WEB_READY 및 PONG을 확인했습니다. [Next 공식 문서](https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins)

둘째, `apps/web/src/app/globals.css`에서 grid label/컨트롤의 `min-width: 0`과 날짜 입력의 `appearance: none`을 지정했습니다. 브라우저 Chrome에서 정상이어도 iOS의 기본 date 컨트롤은 화면 너비를 넘길 수 있었습니다. min-width만 적용한 첫 시도는 충분하지 않았고 appearance까지 조정한 뒤 실제 WebView 화면으로 해결을 확인했습니다. 날짜 값·비활성 상태·신청 로직은 바꾸지 않았습니다.

연습: Expo Tools의 Reload는 RN JavaScript 실행 환경을 새로 시작하고, 차곡 개발 도구의 ‘웹뷰 다시 로드’는 WebView 세션만 다시 만듭니다. 두 동작에서 메모리 측정 이력이 언제 유지되는지 설명해 보세요. 원본 파일을 먼저 저장한 뒤 실험합니다.


## AC15 시안 수정에서 배운 핵심 개념

### 작업 1: iframe 권한과 submit 이벤트

파일: `docs/design/chagok-prototype.html` 13행.

```html
<iframe sandbox="allow-scripts allow-forms" ...>
```

`sandbox`는 iframe 안 문서가 할 수 있는 일을 제한합니다. `allow-scripts`는 JavaScript 실행, `allow-forms`는 폼 제출 절차를 허용합니다. 기존 코드는 클릭으로 샘플 첨부 상태를 바꿀 수 있었지만, submit 이벤트가 발생하기 전에 브라우저가 제출을 차단했습니다. 그래서 submit 핸들러 안의 영수증 검사와 완료 화면 전환이 모두 실행되지 않았습니다. Next.js/React에서도 iframe 안에 폼을 넣으면 이 브라우저 규칙이 먼저 적용됩니다.

이번 수정은 allow-forms 한 토큰입니다. 기존 `e.preventDefault()`가 실제 문서 이동을 막고, `items.unshift(...)`와 `render()`로 가상 신청 상태·화면을 바꿉니다. `form-action 'none'` CSP와 다른 sandbox 제한은 유지됩니다. 실제 파일 업로드나 서버 저장을 추가한 것은 아닙니다.

### 작업 2: 실제 클릭을 사용하는 회귀 테스트

파일: `scripts/verify-prototype.mjs`.

입력은 시안 URL과 결과 저장 폴더입니다. Chrome의 새 BrowserContext를 각 시나리오마다 만들어 localStorage를 분리하고, 화면 입력·클릭으로 영수증 경고·잔여 금액·승인/반려 상태를 검사합니다. DOM에 submit 이벤트를 강제로 주입하면 실제 브라우저 차단을 우회해 버리므로 그렇게 테스트하지 않습니다. 예상 금액은 구현 함수를 재사용하지 않고 65,000→45,000→45,000/65,000으로 직접 대조합니다.

수정 전 3실패, 수정 후 3통과를 결과 JSON과 캡처로 남겼습니다. 기존 앱 단위 테스트33개도 다시 통과했습니다. 이 결과는 시안 회귀이며 RN 실제 신청 기능 구현 완료와 다릅니다.

### 작업 3: 저장 상태와 수동 검증 분리

원본은 pathname과 query string을 localStorage 키에 포함합니다. 따라서 `?manual=approve-1`과 `?manual=reject-1`은 같은 HTML을 읽어도 시연 데이터가 분리됩니다. 새로고침은 초기화가 아닙니다. 새 테스트는 아직 쓰지 않은 쿼리로 시작하고 첫 화면65,000원을 확인해야 합니다.

연습: 영수증 없는 신청이 왜 단순 click 핸들러가 아니라 submit 핸들러까지 도달해야 검사되는지 설명하고, 승인과 반려를 같은 신청에 연속 적용하지 않고 각 초기 상태에서 검증하는 이유를 설명해 보세요.


## M08·M09에서 배운 개념과 코드

### 작업 1: 타입 검사와 실제 WebView 경계 검증

파일: `apps/mobile/src/dev/useBoundaryProbe.ts`, `apps/mobile/src/components/ApplyContainer.tsx`, `apps/mobile/src/bridge/useWebViewBridge.ts`, `scripts/verify-m08.mjs`.

TypeScript 타입은 외부에서 들어온 문자열을 실행 시점에 안전하게 만들지 않습니다. 실제 WebView의 postMessage 입력을 JSON/스키마로 검사하고, 이동 URL은 별도 정책으로 검사해야 합니다. 이번 도구는 웹 안에서 실제 메시지·location 변경·새 창 요청을 발생시킨 뒤 앱의 onMessage/onShouldStartLoadWithRequest/onOpenWindow 콜백을 기록합니다. 테스트를 위해 차단 정책을 완화하지 않았습니다.

입력은 잘못된 메시지8종과 이동/새 창/미대응 응답8종, 출력은 실제 콜백과 전후 상태를 담은 JSON입니다. 검증 스크립트는 예상 사례가 각각 도착했는지와 판정을 대조합니다. 유효한 PONG의 `accepted`는 스키마 통과입니다. 현재 대기 중인 requestId가 없으면 측정 성공으로 집계되지 않습니다. 실제 결과16/16과 result=null 유지가 그 차이를 보여 줍니다.

연습: 메시지를 JSON으로 파싱할 수 있다는 사실과 허용된 계약이라는 사실, 계약에 맞는 응답과 현재 요청의 응답이라는 사실을 각각 구분해 설명해 보세요.

### 작업 2: 큰 글자에 맞춰 RN 배치 바꾸기

파일: `apps/mobile/app/home.tsx`, `apps/mobile/src/components/BenefitBalanceCard.tsx`, `apps/mobile/src/components/RecentRequestList.tsx`.

RN의 Text는 OS 글자 크기를 반영합니다. 웹 브라우저에서 기본 크기로 보기 좋은 배치도 작은 iPhone의 최대 글자에서는 깨질 수 있습니다. 탭 글자는 너비100%와 좌우 여백을 주어 자신의 칸 안에서 줄바꿈하게 했습니다. 잔액은 숫자가 두 줄로 나뉘면 금액을 오독할 수 있어 해당 Text에만 한 줄 맞춤을 적용했습니다.

```tsx
<Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4}>
  {won(demoBalance.available)} 원
</Text>
```

위는 핵심 속성을 보여 주는 축약 예시입니다. 한 줄 맞춤은 긴 금액의 가독성을 지키지만 최대 글자 크기를 모두 유지하지 못하는 절충입니다. 전체 앱의 `allowFontScaling`을 끄지는 않았습니다.

최근 신청은 제목과 금액이 같은 가로 행을 나눠 써서 제목이 한 글자씩 세로로 늘어났습니다. 글자 크기가 크면 내용을 세로로 배치해 공간을 확보했습니다.

```tsx
const { fontScale } = useWindowDimensions();
const stacked = fontScale > 1.5;
// row/column 및 제목의 전체 너비를 함께 변경
flexDirection: stacked ? "column" : "row"
```

입력은 OS fontScale, 출력은 가로/세로 배치입니다. mini 최대 글자의 수정 전후 실제 캡처로 금액 한 줄, 탭 영역 분리, 제목·날짜·금액 표시를 확인했습니다. 브라우저의 responsive viewport만으로 OS 글자 확대를 검증한 것으로 보지 않습니다. 현재 WebView CSS px 글자는 OS Dynamic Type에 연동되지 않습니다.

연습: 긴 신청 제목과 큰 금액을 동시에 표시할 때 글자를 무조건 줄이는 대신 행 배치를 바꾸는 편이 좋은 이유를 설명해 보세요.

### 작업 3: ScrollView ref와 개발 전용 검증 도구

파일: `apps/mobile/src/dev/useVisualCheckScroll.ts`, `apps/mobile/src/dev/VisualCheckControls.tsx`.

React의 ref 개념은 웹과 같지만 RN에서는 HTMLElement가 아니라 네이티브 컴포넌트가 제공하는 인스턴스 메서드를 사용합니다. 이번 설치 버전에서 `ScrollView` 자체를 인스턴스 타입으로 쓰면 typecheck가 실패했습니다. React의 ComponentRef로 실제 ref 대상 타입을 얻어 수정했습니다.

```tsx
const ref = useRef<ComponentRef<typeof ScrollView>>(null);
ref.current?.scrollTo({ y: 0, animated: false });
ref.current?.scrollToEnd({ animated: false });
```

onLayout으로 보이는 높이, onScroll로 현재 위치를 읽어 다음 영역으로 이동합니다. Device Hub 좌표 입력 실패에 대응해 실제 ScrollView가 이동하고 내용이 잘리는지 확인했습니다. 이 검증은 사람이 직접 드래그하는 사용감까지 증명하지 않습니다.

도구 표시는 `__DEV__ && process.env.EXPO_PUBLIC_VISUAL_CHECKS === "1"`일 때만 허용합니다. 검증 후 로컬 값을0으로 복원했고 화면에서 숨김을 확인했습니다. EXPO_PUBLIC 값은 번들에 공개되므로 보안 비밀을 넣는 장소가 아닙니다. 개발용 M08 패널은 기존 개발 도구 안에서 명시적으로 실행할 때만 작동합니다.

### 작업 4: 증거와 주장 범위 맞추기

타입 검사·단위 테스트33개·M08 실제 콜백16개·iOS JS export는 각기 다른 문제를 확인합니다. 스크린샷은 화면 배치를, callback JSON은 실제 플랫폼 이벤트를, 타입 검사는 코드의 타입 일관성을 보여 줍니다. 처음 타입 실패도 로그로 보존하고 재실행 통과와 구분했습니다.

기존 성능 기준선은 이전 소스에서 측정한20회 결과입니다. 이번 화면 수정 후 같은 성능이라고 추정해 원본을 바꾸지 않았습니다. 현재 소스 manifest를 별도로 저장했습니다. 새 성능을 재려면 실제 기기명·소스 해시를 설정하고 Metro를 다시 시작한 뒤 새 원본으로 저장해야 합니다.
