# M08·M09 검증 기록

2026-11-13 KST. 사용자 요청: 남은 M08/M09 직접 검증·발견 문제 수정·실제 결과와 사용자 확인 구분. 2일차 미시작.

## M08 — 완료

iPhone 17 / iOS 27.2 / 차곡 0.1.0(1) Debug Development Build / Next development, 실제 WKWebView. 21:01:54~21:02:03 KST.

개발 도구의 `M08 경계 검증`을 직접 눌렀습니다. `injectJavaScript`로 웹 문서 안에서 postMessage/location/window.open/target=_blank를 실행했습니다. 모든 메시지와 이동은 기존 앱의 검증 콜백을 그대로 통과하며, 테스트가 성공 값을 대신 만들지 않습니다. 개발 도구는 접힌 상태가 기본이며 Release UI에서는 숨겨집니다.

| 입력 | 실제 관찰 | 판정 |
| --- | --- | --- |
| 잘못된 JSON, null, 다른 channel/version, 미등록 type, 비어 있지 않은 payload, 추가 키, requestId 없는 PONG | 8건 모두 rejected-schema. 유효하지 않은 CLOSE_WEBVIEW가 화면을 닫지 않음 | 통과 |
| 외부 https origin, 같은 origin의 다른 path, query가 있는 /apply, custom scheme | 실제 onShouldStartLoadWithRequest 4건 모두 false | 통과 |
| window.open, target=_blank | 실제 onOpenWindow 2건 수신, 새 창을 열지 않음 | 통과 |
| 미대응 PONG, 마지막 문서 확인 PONG | 스키마는 accepted. pending 요청/결과 변화 없음. 마지막 메시지 URL도 원래 /apply | 통과 |
| 전후 상태 | ready=true, running=false, result=null, error=false 모두 동일 | 통과 |

`m08-native.json`은 앱 Share → Copy → simctl pbpaste로 저장한 원본입니다. `node scripts/verify-m08.mjs`가 실제 콜백 누락 및 판정을 검사하며 16/16 통과했습니다. `accepted`는 스키마 통과를 뜻하며 임의 PONG이 측정 성공으로 처리됐다는 뜻이 아닙니다.

이 실험은 iOS 주 문서 메시지 및 이동 경계를 검증합니다. cross-origin iframe의 메시지 송신, Android 정책, 실제 기기 동작 전체를 검증했다고 주장하지 않습니다. M08 범위에서 발견된 앱 결함은 없습니다.

## M09 — 완료 (iOS 시뮬레이터 표시 범위)

실제 iPhone 13 mini 시뮬레이터(iOS 27.2, 1080×2340px / 360×780pt)와 iPhone 17에서 확인했습니다. 기본 `content_size=large`와 최대 `accessibility-extra-extra-extra-large`, light/dark를 사용했습니다. 설정 직후에는 RN에 글자 확대가 반영되지 않아 앱을 재실행한 뒤 실제 확대된 화면으로 판정했습니다.

| 확인 | 실제 실행 범위·근거 | 결과 |
| --- | --- | --- |
| 작은 화면 | mini 기본 라이트 로그인·홈, 다크 홈/최근 내역. `mini-light-login.png`, `mini-light-home.png`, `mini-dark-home.png` | 헤더·금액·CTA 정상 |
| 최대 글자 | iPhone17 다크에서 탭 겹침 재현. mini에서 로그인 상단/카드/하단, 홈 금액·CTA·지원 항목·최근 내역, WebView 상단/하단 관찰 | 아래 3건 수정 후 통과 |
| 다크 모드 | mini 홈, 최대 글자의 로그인·WebView. light로 전환 후 로그인·WebView 재확인 | 배경/문자/버튼 구분, 가로 잘림 없음 |
| 상태 유지 | 최대 글자에서도 데모 진입·신청 열기 동작. 금액65,000/35,000/100,000 유지, 최근2건 유지 | 통과 |

### 발견 → 수정 → 재확인

1. 하단 탭의 글자가 이웃 탭과 겹침. `red-max-home-tabs.png`. 각 Text에 자신의 탭 너비100%와 좌우 여백·가운데 정렬을 지정해 영역 안에서 줄바꿈. `green-mini-max-balance.png` 하단 탭에서 재확인.
2. 잔액이 `65,0 / 00 원`으로 나뉨. `red-mini-max-balance.png`. 잔액에만 `numberOfLines=1`, `adjustsFontSizeToFit`, `minimumFontScale=0.4` 적용. `green-mini-max-balance.png`에서 **65,000 원** 한 줄 확인. 전체 앱 글자 확대를 끄지 않음.
3. 최근 신청 제목이 금액에 밀려 한 글자씩 세로로 표시됨. `red-mini-max-recent.png`. `fontScale > 1.5`일 때 행을 세로 배치로 바꾸고 제목에 전체 너비 제공. `green-mini-max-recent.png`에서 제목/날짜/금액을 분리해 읽을 수 있음을 확인.

`mini-max-*-login-*.png`, `mini-max-*-apply-*.png`는 실제 native/WKWebView 화면입니다. 세로 스크롤 경계에서 일부 내용이 잘려 보이는 것은 해당 스크롤 위치이며, 다음 영역/맨 아래로 이동해 전체 내용을 확인했습니다.

### 방법과 한계

Device Hub의 좌표 입력/스크롤과 창 캡처가 간헐적으로 실패했습니다(noWindowsAvailable, SCStreamError -3811/-3812). UI 재실행과 사용자 확인 후 접근성 버튼은 동작했습니다. 영역별 검증은 개발 전용 `EXPO_PUBLIC_VISUAL_CHECKS=1` 버튼을 CUA로 눌러 **실제 ScrollView.scrollTo/scrollToEnd**, WebView의 scrollTo로 이동했습니다. 도구는 로컬 opt-in + __DEV__ 조건이며 검증 후 0으로 복원했습니다. 이 방법은 실제 배치/내용 도달을 확인하지만 모든 손가락 제스처의 사용감까지 검증하지는 않습니다.

현재 WebView 본문은 CSS px 크기이므로 OS Dynamic Type에 따라 확대되지 않습니다. 네이티브 닫기 버튼/홈/로그인 확대와 구분합니다. M09의 잘림·겹침 기준은 통과했으나 웹 본문의 OS 글자 확대 연동이나 VoiceOver 전체 지원을 완료했다고 주장하지 않습니다.

추가로 만든 SE(3세대)는 첫 부팅이 지연되어 종료했고 실제 M09 근거로 쓰지 않았습니다. mini는 정상 부팅·설치·실행했습니다. `m09-large-before-apply.png`는 OS 설정 직후 확대 반영 전, `ios-open-confirmation.png`는 앱 열기 확인 대화상자이므로 합격 증거에서 제외합니다.

### 사용자가 직접 확인할 부분

- 실제 앱의 여백·문구·큰 글자 줄바꿈에 대한 최종 승인.
- 검증 도구를 끈 정상 화면에서 손가락/마우스로 위아래 스크롤했을 때 사용감. 좌표 자동화의 한계와 구분.
- 추가 범위: 실기기, Android, VoiceOver, 웹 본문 OS 글자 확대 연동, Release 성능. 이번 iOS 시뮬레이터 M08/M09 완료와 별개.

## 코드와 검증

M08 관찰 도구와 메시지 판정 반환값을 추가했습니다. 판정 정책·신청 기능·금액 산식은 변경하지 않았습니다. 개발 도구 패널은 세로 스크롤 및 최대 높이45%로 바꿔 늘어난 도구가 WebView를 모두 가리지 않도록 했습니다.

- 최종 타입 검사: `typecheck.log`, exit 0.
- 기존 단위 테스트: `unit-tests.log`, 5파일/33개 통과.
- M08 원본 대조: `m08-validation.log`, 16/16 통과.
- iOS production JS export: `ios-export.log`. 기존 Debug 네이티브 바이너리+최신 Metro JS로 실행했으며 네이티브 재빌드는 하지 않음.
- 웹 코드 변경이 없어 Next 빌드/시안 회귀는 재실행하지 않음.
- 원래 성능 기준선 JSON은 이전 소스의 기록으로 보존. 이번 경계 테스트는 새로운 성능 기준선이 아님.


## 최종 소스 식별과 재측정

`app-source-sha256.txt`는 최종 소스 50개 파일의 manifest입니다. manifest SHA256은 `d62f26c701ae2f39190dd47e422369fa2bdb282ea629e509feae12b167755091`입니다. M08 실험 이후 표시 수정과 ref 타입 수정이 반영된 최종 상태이며, M08 실행 당시 모든 바이트가 같았다는 주장이 아닙니다. 메시지·이동 차단 정책은 유지했습니다.

로컬 `.env.local`의 다음 측정용 sourceRef와 기기명을 현재 Mini에 맞췄습니다. **새 측정 전 Metro를 재시작해 환경값을 반영하고, 다른 기기를 쓰면 기기명을 먼저 바꿔야 합니다.** 현재 열어 둔 앱의 이미 로드된 번들에 새 환경값이 반영되었다고 주장하지 않습니다. 이전 성능 원본은 바꾸지 않았습니다.

최종 사용자 확인 화면은 Device Hub의 Mini 홈과 Chrome `http://localhost:8082/home`입니다. RN Web 최초 로드의 빈 화면은 새로고침 후 홈 금액·최근 내역·탭 표시를 확인했습니다. 네이티브 검증은 브라우저 미리보기와 별도입니다.


## 사용자 최종 확인 — 2026-11-13 (Asia/Seoul)

> “Device Hub에서 직접 확인했고 화면이랑 스크롤 모두 정상 동작해. 1일차 최종 확인 완료로 기록하고, PR을 올리자.”

Device Hub 실제 화면과 정상 스크롤 사용감의 사용자 확인을 완료했습니다. 1일차 최종 인수를 완료로 기록하며 브랜치·push·PR 생성 승인을 받았습니다. 실기기·Android·VoiceOver·웹 본문 Dynamic Type·Release 성능은 추가 범위입니다. 2일차는 시작하지 않습니다.
