# iOS 네이티브 종료 검증 결과

2026-11-16 KST. iOS27.2 Simulator / Chagok M09 Mini(iPhone13 mini) / signed Debug / app PID10108 / Next dev. **실제 네이티브 앱·WKWebView에서 실행했으며 물리 iPhone 실측은 아니다.** 사용자 요청은 재로드 후 웹/native 닫기의 close·unmount 세대 일치 확인이다.

## 실제 결과

| 경로 | 재로드 | 마지막 준비 세대 | close | unmount | 홈 복귀 |
| --- | --- | --- | --- | --- | --- |
| 웹 ‘‹’ |2회|2|세대2, seq28, 1회|세대2, seq30, 1회|사용자 조작·완료 응답 후 도구로 확인|
| native ‘닫기 · 홈으로’ |3회|3|세대3, seq37, 1회|세대3, seq39, 1회|접근성 버튼 클릭 후 홈 AX/화면 확인|

웹 run 시작은14:10:21.726Z(23:10:21.726 KST), native run은14:15:27.101Z다. 각 run은 새 화면 진입으로 revision0부터 시작했다. 재로드 사이에 WEB_READY를 확인했고 검증 중 Fast Refresh/코드 변경은 없었다. 각 run의 mount는1회이며 reload 도중 unmount는 없다. 웹31개/native40개 이벤트에 seq 누락·중복0, 기록된 timeout/load/HTTP/process 종료 오류0이다.

[원본 iOS 로그](native-events.log), [원본 행 번호 포함 파싱](parsed-events.json), [개수·순서·세대 분석](event-analysis.json), [UI 조작 시각](ui-actions.json), [사용자 웹 닫기 확인](user-confirmation.json). 웹 close→unmount는29.107ms, native는24.774ms로 관찰됐다. 임시 로그 출력 비용이 포함된 진단 시각이며 성능 개선 또는 일반 응답 지연 수치로 해석하지 않는다.

close와 unmount 사이에 timer-armed가1개씩 있다. 소스를 근거로 보면 기존 reset("close")의 ready=false 변경으로 준비 effect가 잠깐 재실행된 것으로 해석된다(원인 연결은 소스 기반 추론). 로그에서는 각 unmount 직후 timer-cleared를 확인했다. armed→cleared 수명은 웹15.283ms/native10.483ms, unmount→cleared 간격은 각각0.667ms/0.433ms다. ready-timeout은 없었다. 이 관찰을 타이머 누수로 오인해 동작을 변경하지 않았다.

## 수집 방법과 실패 구분

기존 trace는 화면 인스턴스 메모리에만 있어 닫힌 뒤 UI로 조회할 수 없다. webview-trace.ts의 record 뒤에 **임시 __DEV__ console.info sink**를 붙여 기존 비식별 event 필드와 run 시작 시각만 로그로 내보냈다. close/unmount를 인위적으로 만들어 넣거나 native/web 닫기 핸들러를 바꾸지 않았다. [임시 diff](temporary-instrumentation.diff), [수집 중 소스 해시/환경](runtime-manifest.json).

웹 버튼은 Device Hub AX에 노출되지 않았고 좌표 클릭은 noWindowsAvailable로 실패했다. Option+Tab 후 포커스 screenshot은 SCStreamErrorDomain -3811로 실패하여 성공으로 세지 않았다. Capture Keyboard를 원래 off로 복원한 뒤 사용자에게 작은 웹 ‘‹’만 요청했고 “웹 닫기 완료” 응답 및 실제 close/unmount를 수집했다. 이 경로는 **사용자 조작 + 도구 로그 검증**이며 자동 클릭 성공이라고 표시하지 않는다. `web-home.txt`는 홈 AX를 확인한 다음 호출의 ‘변경 없음’ diff만 저장됐으므로 독립적인 전체 AX 스냅샷으로 사용하지 않는다.

native 경로는 [닫기 전 준비 상태](native-before-close.txt), [홈 전체 AX](native-home.txt), [홈 화면](native-home.png)을 저장했다. log stream의 UID501 getpwuid_r 경고는 있었으나 두 run 모두 이벤트가 빠짐없이 수집됐으며 collector는 exit0으로 종료했다.

## 필수 검증 5묶음 및 AC

| AC | 상태 | 확인 방법·실제 결과 |
| --- | --- | --- |
| N1 종료 원본·복원 | 충족 | iOS 로그로 종료 후 원본 확보. 임시 sink 제거 후 앱/패키지82파일이 시작 해시와 일치. [복원 검사](restoration.json) |
| N2 웹 닫기 | 충족(사용자 조작 포함) | 재로드2회 뒤 close2→unmount2 각각1회, 홈 복귀. seq 누락/중복/오류0 |
| N3 native 닫기 | 충족 | 재로드3회 뒤 close3→unmount3 각각1회, 홈 복귀. seq 누락/중복/오류0 |
| N4 회귀·검증 기록 | 충족 | 임시 계측 제거 후 실제 DB 포함12파일71테스트 통과/skip0, 모든 workspace 타입 검사 exit0. [테스트](tests.log), [타입](typecheck.log), [명령](commands.json) |
| N5 학습·보존·초안 | 충족 | 2일차 학습/검증·계획·진행/수동 확인과 최신 초안 갱신. [문서·보존 검사](document-check.json). 기존 원본 보존, staged 비어 있음 |

이번 최종 변경은 문서·증거뿐이며 런타임 소스와 UI는 시작 상태로 복원했다. 서버는 기존 Next `/apply`·Metro `/status` HTTP200을 확인했다([기록](server-check.json)). UI/웹/native 설정·의존성 변경이 없어 새 브라우저 화면 열기·웹 production 빌드/iOS 재빌드는 해당 없음/미실행이다. 기존 화면 주소는 `http://localhost:3000/apply`이며 웹 브라우저 결과를 native 증거로 대체하지 않았다. 이번 사용자 조작은 끝났고 추가 수동 입력 대기는 없다.

## 남은 범위

이는 준비가 끝난 웹뷰에서의 닫기2경로 각1회 실측이다. 모든 native callback 순서/React 동시성·Release·물리 iPhone·Android 또는 진행 중 로드 종료의 모든 경합을 증명하지 않는다. 과거 타임아웃의 마지막 JS 오류 분기 미확정도 유지한다. 기존 인증·성능 원본을 이번 종료 검증 수치로 덮어쓰지 않았다. 커밋·push·PR·학습 추적 제거 없음.

[독립 증거 검토](review.md)에서 종료/타이머/복원 수치를 대조했고, 시간 경계 문구와 수집 종료 줄바꿈에 따른 원본 해시 차이는 위와 같이 정정했다. 원본 이벤트 내용은 변경하지 않았다.
