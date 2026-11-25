# Android 로컬 연결·신청 브릿지 수정 — 2026-11-25

Android API36 에뮬레이터의 Release 앱에서 신청 연결, 25초 이상 화면 유지, 실제 새로고침, 닫기·재진입, 다른 경로 차단, 서버 복구 후 재시도를 확인했다. 기존 Android 검증의 신청 연결 실패를 해소했다. OAuth 실제 로그인·영수증 업로드까지 완료한 것은 아니다.

## AC 결과

| AC | 상태 | 확인 방법과 실제 결과 |
| --- | --- | --- |
| AC1 재현 가능한 로컬 연결 | 충족 | Expo prebuild로 Release 전용 네트워크 정책 생성. 명시적 로컬 모드에서10.0.2.2만 HTTP 허용, 기본 모드 재생성 시 예외 제거를 실제 플러그인/파일 테스트로 확인. 최종 APK 정책도 대조. Next 개발 origin 허용과 /apply 응답200 확인. |
| AC2 브릿지·경계 | 충족 | origin-only 출처와 활성 /apply 문서 검증, main-frame native 패치, 실제 load/history 구분. 단위 테스트의 외부 출처·경로·미로드·종료·이전 revision 거부. 에뮬레이터에서 srcdoc 직접 CLOSE 송신 후 화면 유지, about:blank에는 송신 함수 미노출, 다른 경로 history 차단. 동일 origin 스크립트의 부모 창 제어까지 격리한다는 의미는 아니다. |
| AC3 회귀·실행 | 충족 | 최종333테스트/36파일, 타입4 workspace, 스타일132파일0위반. 최종 Release 빌드 exit0·서명·설치 해시 일치. 동일 URL history·hard reload·정상 웹 닫기·네트워크 재시도 및 최종 임시 코드 없는 폼의25초 안정성 확인. |
| AC4 보존·기록 | 충족 | 기존 DB4테이블/영수증31파일 해시 동일, 기존 파일 누락0. 임시 웹 fixture와 앱 로그 복구, 학습 로컬 제외 및 초안 갱신. commit/push/PR 없음. |

자동 검사와 에이전트의 ADB 실제 화면 확인 결과다. 사용자 수동 검토는 대기다. 에뮬레이터는 최종 Release의 데모 신청 화면에 남겼다. 사용자 확인: 상단 닫기→홈→신청 화면 미리보기, 15초 이후에도 폼 유지. 브라우저 [로컬 /apply 미리보기](http://127.0.0.1:3000/apply)도 열어 확인했다. 브라우저 단독 미리보기는 네이티브 연결 검증을 대신하지 않는다.

## 원인과 수정

1. Release의 로컬 HTTP 예외가 생성 프로젝트의 임시 파일에만 있어 재생성으로 사라졌다. Expo 플러그인이 Release overlay와 정책을 생성하게 하고 `android:local` 명령을 추가했다. 기본 deny, 로컬 모드의10.0.2.2만 예외다. Debug의 기존 네트워크 정책은 건드리지 않는다.
2. Android WebView14.0.1은 메시지에 전체 페이지 URL 대신 sourceOrigin을 보낸다. 실제 [수신 로그](source-origin.log)에서 `http://10.0.2.2:3000`을 확인했다. `ApplyContainer`에서 현재 로드된 exact `/apply`와 메시지 출처를 함께 검증한 뒤 기존 브릿지/ClaimHost에 검증된 문서 URL을 전달한다. 탐색 URL 검사는 완화하지 않았다.
3. origin만으로 하위 프레임을 구분할 수 없다. 리뷰 후 srcdoc의 직접 CLOSE가 실제 앱을 홈으로 돌려보내는 것을 재현했다. CSP만으로 해결되지 않아 고정 버전 패치로 `!isMainFrame`을 거부하고 식별 불가능한 구형 fallback을 노출하지 않는다. `postinstall --error-on-fail`과 로컬 prebuild 재적용으로 설치 재현성을 보장한다.
4. 첫 수정본도 폼 표시 후15초 뒤 실패했다. [실제 이벤트 로그](event-order-before.log)는14:42:38.521 WEB_READY accepted →38.524 timer-cleared →38.527 load-start(ready:true) →38.528 timer-armed →53.544 timeout을 보여준다. Next 동일 URL history 갱신이 Android에서 다시 load-start로 전달된 것이다. 패치가 실제 `onPageStarted`에서 시작 이벤트를 보내고 같은 URL history는 생략한다. 다른 경로/query/hash는 계속 호스트에 전달하며 실제 hard reload는 초기화한다.

[네이티브 패치와 호환성 설명](../../../../patches/README.md), [리뷰](review.md).

## 필수 검증 8개 묶음

1. **실패 재현:** 새 Android 초기화/닫기/재진입3건 RED, 출처 helper4건 RED를 확인했다. [컴포넌트 RED](bridge-red.log), [출처 RED](source-red.log). 당시 기존8건은 통과했다. origin 로그와 실제 history 재초기화 로그, srcdoc 전후 화면을 별도로 남겼다. 단위 테스트만으로 네이티브 이벤트를 통과 처리하지 않았다.
2. **설정·패치:** `npm run prebuild:android:local -w @chagok/mobile`, 실제 플러그인 default→local→default 파일 생성 검사, 잘못된 로컬 origin의 config 실패, `npm run postinstall`. [APK 네트워크 정책](apk-network.txt), [잘못된 설정 거부](local-mode-guard.log), [패치 적용](patch-apply.log). 독립 임시 원본에서 패치 최초/반복 적용 exit0, 의도적으로 불일치시킨 소스 exit1, 두 Java 파일이 설치 소스와 일치했다. [원본](patch-verification.json).
3. **자동 회귀:** Node24.22.3에서 로컬 `.env.local`의 DATABASE_URL을 출력하지 않고 프로세스의 CHAGOK_TEST_DATABASE_URL로 전달한 `npm test -- --maxWorkers=2` →333/333,14:50KST 실행. 최초 기본 실행은306통과/DB27skip이었으며 이후 opt-in 전체 실행으로 보완했다. [전체 결과](tests.log), [스타일](style.log), [타입](types.log). `npm run style:check`132파일0위반, `npm run typecheck`4 workspace exit0.
4. **Release 산출물:** 아래 Gradle 명령 exit0, 최종2m30s/900tasks(41executed). [빌드 이력](builds.json), [최종 APK](artifact.json), [서명](signature.log). APK32,776,713B, SHA256 `25fdeb0605abb14feed696c44723555a4d89e13104c43f43535fcc062d92e5a0`, 설치 base.apk 해시 동일, v2 개발 키 서명. JS번들3,207,932B이며 source/order 진단 marker 없음. 스토어 배포용 서명이 아니다.
5. **실제 경계·수명:** [수정 전 srcdoc 송신 후 홈](screen-fix-frame-settled.png), [최종25초 후 폼/송신 증거](screen-fix-stable-25.png), [재조회](screen-fix-stable-recheck.png), [hard reload25초](screen-fix-reload-stable.png), [다른 경로 차단](screen-fix-history-blocked.png), [최상위 웹 닫기](screen-fix-mainframe-close.png). srcdoc는 posted=true인데 폼 유지, about:blank는 두 구성에서 posted=false로 브릿지 미노출이었다. 후자는 송신 성공 후 거부된 표본이라고 주장하지 않는다. [임시 fixture](lifecycle-probe-fixture.txt)는 인증/FORM_INIT을 주입하지 않으며 검증 후 원본으로 복구했다.
6. **연결 복구·최종 화면:** Next PID42178을 약22.31초 정지, HTTP timeout과 native 오류/재시도 확인 후 finally/watchdog로 재개해200. [실행 기록](network-retry.json), [오류 화면](screen-fix-network-error.png). 재시도 후 임시 코드 없는 폼이25초 이상 유지됐다. [최종 화면](screen-fix-final-clean.png), [최종 안정성](final-stability.json). Google 로그인 없는 데모이므로 첨부·제출은 비활성 상태다.
7. **보존:** [DB/파일 대조](data-preservation.json). Attachment31/Claim10/Membership3/Session3 전체 행과 저장 파일31개 동일. 테스트 fixture는 정리됐으며 실제 계정·세션·회사·첨부를 변경하지 않았다. [파일/Git/링크 검사](checks.json). 임시 BridgeReceiver는 바이트 원복, 진단 로그 제거, 학습 Git 제외 유지.
8. **리뷰·문서:** 별도 읽기 전용 리뷰에서 프레임 P1을 찾아 실제 재현 후 수정했고, 로딩 이벤트 보완도 검토했다. [리뷰 기록](review.md). 계획·진행·누적 검증·측정·로컬 학습·latest-*에 이번 범위와 결과를 반영했다. 웹 production build와 iOS 앱 재빌드는 Android 수정 범위에서 재실행하지 않았다. 웹 응답 헤더/화면과 기존 iOS 출처 회귀 테스트는 확인했다.

```sh
# 저장소 루트, 로컬 설치 환경 예시
source .local-tools/android/env.sh
npm run android:local -w @chagok/mobile

# 이번 검증에서 prebuild 후 사용한 ARM64 빌드 명령
CHAGOK_ANDROID_LOCAL=1 EXPO_PUBLIC_WEB_ORIGIN=http://10.0.2.2:3000 NODE_ENV=production \
  ./apps/mobile/android/gradlew -p apps/mobile/android :app:assembleRelease \
  -PreactNativeArchitectures=arm64-v8a --max-workers=2 --console=plain
```

최종 APK는 `.local-tools/android/app-release-verified.apk`에 보존했다. `android:local`은 패치 적용→prebuild→Release 실행을 묶는다. 생성 android/는 마지막 모드가 남으므로 운영 빌드 전 CHAGOK_ANDROID_LOCAL 없이 prebuild를 다시 실행해야 한다. 기존 iOS `.env.local`은 수정하지 않았다.

## 실패·도구 제약과 남은 범위

- 중간 APK의 origin 수정만으로 완료되지 않았고 프레임 격리와 history 재초기화 문제를 추가 발견했다. 중간 성공 화면은 최종 안정성 증거로 재사용하지 않았다.
- 최종25초 검사 첫 UIAutomator 결과는 WebView subtree를 누락해 스크립트 exit1이었다. 같은 시점 PNG에는 정상 폼·frame proof가 보였고 즉시 새 XML 조회로 확인했다. [원본과 판독](stability-review.json). 이후 hard reload/최종 복구25초 검사에서는 XML도 통과했다.
- 초기 DB 해시 helper의 출력 경로 인자 누락, 문서 명령의 작업 디렉터리 착오, APK 리소스 원래 이름 조회 실패는 수정 후 재실행했다. 실제 정책은 최적화된 `res/so.xml`을 읽었다. 첫 실패를 제품 성공으로 바꾸지 않았다.
- Gradle/상위 라이브러리 deprecation 경고가 있었지만 빌드는 성공했다. 최종 앱 프로세스에는 Chromium seed signature 경고가 있어 모든 로그가 깨끗하다고 주장하지 않는다. 의도적으로 차단/타임아웃시킨 이전 WebView renderer 종료도 구분한다. npm 설치 감사 요약은 기존과 같은 moderate3/high3이며 강제 업그레이드는 하지 않았다.
- WEB_MESSAGE_LISTENER 미지원 구형 System WebView는15초 뒤 연결 실패 UI로 종료한다. 해당 구형 환경 실행과 전체 Android 버전 호환성은 미검증이다. 같은 origin의 임의 스크립트/XSS/부모 창 호출을 이 패치가 격리한다고 주장하지 않는다.
- Android OAuth 미등록으로 실제 로그인·사진 선택·업로드·신청 생성은 미검증. iOS 실기기, 실제 촬영·권한 설정 복귀, 원격 저장소, 운영 HTTPS/배포 서명/예약 정리, 실제 계정 세션 전환 UI는 별도 후속이다.
- 이번에는 Android 영수증 지연 표본을 수집하지 않았다. 빌드 시간·ADB Activity 시작 시간·25초 안정성 대기는 성능 벤치마크가 아니다. Metro 중지 검증은 이번 산출물에서 반복하지 않았다.
