# 1일차 실제 검증 결과

최초 검증: 2026-11-13 KST. 호스트 macOS 15.6.1 arm64, 검증 Node v24.22.3, npm 11.6.2.

## 최초 구현 시 자동 검증

| 명령 | 결과 | 원본 |
| --- | --- | --- |
| `npm run typecheck` | exit 0, 모든 workspace 통과 | typecheck.log |
| `npm test` | exit 0, 5파일·33테스트 통과 | tests.log |
| `npm run build:web` | exit 0, /apply 정적 화면 및 /api/trpc 동적 route 생성 | build-web.log |
| mobile에서 `npx expo-doctor` | exit 0, 20/20 | expo-doctor.log |
| mobile에서 `npx expo export --platform ios --platform android --output-dir dist` | exit 0, 양 플랫폼 Hermes JS 번들 | export-native.log |
| mobile에서 `npx expo run:ios --no-install` | exit 1, prebuild 완료 후 Xcode 요구 | native-build-attempt.log |
| 원본 SHA256 비교 | 지시서·PNG 2개·HTML 동일 | source-preservation.log |
| source/config 민감 패턴 스캔 | 0건 + 수동 검토 | sensitive-scan.json |

네이티브 JS export는 설치·실행이 아닙니다. `--no-install`은 기기 실행 가능성을 확인하기 위한 시도이며 CocoaPods 설치나 native 컴파일을 완료하지 않았습니다.

## 처음 실패와 수정 후 결과

- 최소 stub로 계약 테스트 먼저 실행: 28개 중 15개 실패, 13개 통과. 미구현 `not-implemented` 때문에 미처리 Promise rejection도 5개 표시됨. 원본 `tests-red.log`. 완료 상태로 기록하지 않음.
- 계약/계측 구현 후 28개 통과: `tests-green-core.log`.
- 첫 타입 검사: WebView 14의 `P=undefined` 기본값이 props 교집합을 never로 만듦. 설치된 선언을 확인해 `WebView<object>`를 명시함. `typecheck-first.log` → 최종 `typecheck.log`.
- CORS 회귀 테스트 1실패/1통과: `cors-red.log`. Next.js 응답에는 200이 있지만 localhost:8081 허용 헤더가 없어 미리보기 실패. 개발 환경의 두 로컬 origin만 허용 후 전체 30개 통과.
- 최종 독립 리뷰의 중요 문제 2개(관련 회귀 3개): `review-red.log` 3실패/30통과 → 수정 후 `review-green.log` 33통과.
- 첫 코드 포맷 명령은 루트 glob `*.{json}` 오타로 exit 2. 포맷된 앱 파일은 보존하고 최종 명령에서 명시 파일명으로 수정: `format-final.log`.
- 최초 sandbox 안의 npm 조회는 DNS 접근 실패, dev 서버는 포트 bind 또는 `.expo` 생성 EPERM. 승인된 실행 권한으로 공식 registry 설치와 로컬 서버 시작 성공. 자동 승인 검토의 거절은 없었음.

## 브라우저에서 실제 수행

Chrome 연결 도구로 구현 화면을 직접 조작했습니다.

1. `/` → Google 비활성/준비 중 → 데모 버튼 → `/home`.
2. 한도 65,000, 신청·승인 35,000, 총 100,000 및 최근 2건 확인.
3. 개발 도구를 열어 실제 `health.check`: 최초 CORS 실패, 수정 후 성공, 서버 프로세스 종료 후 오류, 서버 재시작 후 재시도 성공.
4. `/apply` 열기 → Next.js 폼 표시, 모든 입력/첨부/제출 비활성 → 닫기 → 홈 한도 유지.
5. 내역·복지 안내 버튼은 준비 중 안내. 관찰한 한국어 조사 어색함은 ‘기능은 준비 중’으로 문구 수정.
6. 390×844 및 320×740 홈 레이아웃 확인. 세로 스크롤·금액·CTA 확인. 실제 OS 글자 확대·다크·스크린리더는 미확인.
7. 별도 `http://localhost:3000/apply` 진입: 앱 이용 안내, 오류 없는 비활성 폼 확인. `apply-dom.txt` 보관.
8. 기준 HTML은 file URL 보안 정책으로 열기 거절. 우회하지 않음. 동작 회귀는 미확인.

스크린샷은 `home-browser.jpg`, `login-browser.jpg`, `apply-browser.jpg`. **모두 브라우저 화면이며 RN 실기기 캡처가 아닙니다.** 정상 테스트 페이지 두 탭을 유지했고 임시 viewport는 복원했습니다.

## 독립 코드 리뷰와 대응

실행 계획 스킬에 따라 별도 읽기 전용 리뷰어가 전체 새 소스를 검토했습니다. Critical 0, Important 2, Minor 0.

1. 늦은 타이머 전에 4초 PONG이 성공으로 잡힘 → 단조 경과 시간과 3초 deadline 비교. 재현 테스트 RED→GREEN.
2. 닫힌 화면 원본 소실·간격 중 취소 표시 누락 → 화면 밖 최근 10개 메모리 원본, run-level cancelled/reason, 홈 Share. 재현 테스트 2개 RED→GREEN.

네이티브 렌더링·이벤트 순서·HTTP 정책·실기기 RTT는 환경 부재로 리뷰에서도 판정하지 않았습니다. 이를 그대로 수동 검증 대상으로 유지합니다. 문서 완성도는 주 작업에서 확인했고, 2일차 이후 인증·DB·업로드·승인·재무 검증은 구현하지 않았습니다.

## 공식 자료와 실제 설치 기준

- [Expo SDK 58 reference](https://docs.expo.dev/versions/latest/), 설치 `expo/bundledNativeModules.json`의 React 19.3 / RN 0.88.1 / WebView 14.0.1 조합.
- [Expo monorepos](https://docs.expo.dev/guides/monorepos/), [Router 수동 설치](https://docs.expo.dev/router/installation/).
- [Development Build](https://docs.expo.dev/develop/development-builds/introduction/): 네이티브 빌드와 Metro 구분.
- [Next.js 설치](https://nextjs.org/docs/app/getting-started/installation), 설치 버전 번들 route handler 문서.
- [tRPC 11 App Router adapter](https://trpc.io/docs/client/nextjs/app-router-setup).
- [React Native WebView guide](https://github.com/react-native-webview/react-native-webview/blob/master/docs/Guide.md), 설치 패키지 선언 및 네비게이션 소스 확인.

버전은 임의의 최신 React를 따로 설치하지 않고 Expo의 호환 목록과 npm 실제 버전을 사용했습니다. 최종 재현 버전은 package-lock.json입니다.


## Xcode 설치 후 iOS 검증 추가 — 최신 결과

macOS 27.2.1 (26B131), Xcode 27.2 (27B52), iPhone 17 시뮬레이터/iOS27.2 (24B8117). Debug arm64 Development Build 0.1.0 (1), bundle ID dev.doyeon.chagok. CocoaPods 설치·pod install·xcodebuild 모두 성공. 자세한 환경/설치 실패와 복구 과정은 `ios-setup.md`, 원본은 `native/`에 있습니다.

| 검증 | 실제 결과 | 증거 |
| --- | --- | --- |
| 네이티브 앱 설치/실행 | 성공, Metro 연결 및 로그인/홈 표시 | build-result.json, xcodebuild.log, login.png, home-before.png |
| 실제 API | 성공→서버 중단 오류→재시작 성공 | api-success.png, api-offline.png, api-recovered-history.png |
| 실제 WebView | 로딩 실패/ready 대기/복구, RN 및 웹 버튼 닫기 성공 | webview-offline.png, apply.png, home-after.png |
| 실측 | 준비3+본20 성공, 정확한 환경 및 원본 보존 | metrics/raw/, raw-validation.json |
| lifecycle | 준비 도중 close/reload 취소, 새 세션20회 성공 | lifecycle-validation.json, reload-cancelled.png |
| 한도 불변 | 전후65,000/35,000/100,000 및 최근2건 유지 | home-before.png, home-after.png |
| 변경 후 자동 검사 | typecheck0 / 33테스트 통과 / build:web0 | native/typecheck.log, tests.log, build-web.log |

추가 수정의 재현: `127.0.0.1` HMR 요청403 및 WEB_READY 부재 → Next의 공식 allowedDevOrigins 설정에 로컬 호스트만 추가 → WebView 준비/측정 성공. 미허용 external origin은 계속403. 일반 HTTP GET의 수정 후404는 HMR WebSocket endpoint에 handshake 없이 보낸 진단 요청 결과이며 API 성공코드로 해석하지 않습니다. `dev-origin-*.headers` 참조.

iOS 날짜 입력 컨트롤은 min-width만으로 해결되지 않아 appearance:none을 더한 뒤 화면 내 너비 정상화 확인. `apply.png` 참조. 별도 제품 기능은 추가하지 않았습니다.

검증 한계: 실제 iPhone/Android, 글자 확대·다크·스크린리더, WebView에 잘못된 메시지·외부 이동을 실제 주입하는 M08, 원본 HTML M12는 미확인입니다. 취소 실험은 준비 왕복 중 수행하여 본 samples0인 취소 원본이 정상입니다. 본 측정 도중의 타이밍 경계는 자동 테스트로 확인했습니다.


## M08·M09 추가 검증 — 2026-11-13 최신 상태

위의 미확인 목록 중 M08/M09는 이번에 완료했고, M12는 별도 Chrome 회귀와 사용자 확인으로 완료했습니다. 상세 조건·실패 재현·수정 전후 캡처는 [M08·M09 기록](m08-m09/README.md)에 있습니다.

| 항목 | 확인 결과 | 증거 |
| --- | --- | --- |
| M08/AC09 | 실제 WKWebView 경계 이벤트16/16, 상태 불변 | m08-m09/m08-native.json, m08-validation.log |
| M09/AC03 | 작은 화면·최대 글자·다크 표시 확인, 결함3건 수정 후 재확인 | m08-m09/red-*.png, green-*.png 및 README |
| 최종 타입·단위 테스트 | exit0, 5파일/33개 통과 | m08-m09/typecheck.log, unit-tests.log |
| iOS JS production export | 성공, Hermes bundle 생성 | m08-m09/ios-export.log |
| 사용자 확인 화면 | Mini native 홈, Chrome localhost:8082/home 렌더링 | final-mini-home-tools-hidden.png, manual-checks.md |

추가 도구의 ScrollView ref 타입 오류로 첫 최종 검사는 실패했습니다(`typecheck-red.log`). `ComponentRef<typeof ScrollView>`로 수정한 뒤 전체 타입 검사와 테스트를 다시 실행해 통과했습니다. 웹 코드·네이티브 의존성 변경이 없어 Next production build와 Xcode 바이너리 빌드는 재실행하지 않았습니다. production JS export는 설치/실기기 실행 검증이 아닙니다.

남은 사용자 확인은 정상 스크롤 사용감과 화면 최종 승인입니다. 실제 iPhone·Android·VoiceOver·웹 본문의 OS 글자 확대·Release 성능은 별도 검증 범위입니다. 개발용 스크롤 이동으로 검증한 표시 결과를 모든 제스처 검증으로 확대하지 않습니다. 2일차 미시작, PR 보류.


## 사용자 최종 확인 — 2026-11-13 (Asia/Seoul)

> “Device Hub에서 직접 확인했고 화면이랑 스크롤 모두 정상 동작해. 1일차 최종 확인 완료로 기록하고, PR을 올리자.”

Device Hub 실제 화면과 정상 스크롤 사용감의 사용자 확인을 완료했습니다. 1일차 최종 인수를 완료로 기록하며 브랜치·push·PR 생성 승인을 받았습니다. 실기기·Android·VoiceOver·웹 본문 Dynamic Type·Release 성능은 추가 범위입니다. 2일차는 시작하지 않습니다.
