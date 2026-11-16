# WKWebView 오류 원인 재조사

2026-11-16 KST. 사용자 피드백: “다시 원인 파악해서 최대한 확정까지 가보자.” 기존 변경을 보존하며 [초기 상태](initial-state.json)를 기준으로 조사했다. simulator iOS27.2 / iPhone13 mini / signed Debug / Next16.4.6 dev / Node24.22.3.

**중요한 검증 공백이 있었다.** 이전 검사는 정상 반복·복구 성공을 확인했지만 당시 오류 종류를 확정하지 못했고, 현재 화면만으로는 준비 timeout·네트워크/HTTP 오류·WebContent 종료를 구분할 수 없었다. 이번에는 당시 시스템 로그를 추가 확보하고 원인별 계측·실제 장애 실험을 보완했다. 과거 사건의 지연 구간은 확인했지만 마지막 JS 오류 분기까지 확정한 것은 아니다. 이전 “후속 검증 완료”는 실행한 시나리오에 한정되며 **과거 사건 원인 규명 완료로 해석하면 안 된다.**

## 당시 사건에서 확정한 사실

추가 조회는 해당 simulator에서 2026-11-16 17:15:35~17:16:45의 app PID24663, WebContent PID31254/25236 및 관련 RunningBoard 기록으로 제한했다. 원본은 Git 제외 `.local-tools/day-02-timeout/historical-app.log`와 `historical-runningboard.log`에 보존한다. [추출 시각·원본 해시/행 번호](historical-timeline.json), [핵심 로드 기록](historical-excerpt.log), [종료 기록](termination-excerpt.log).

| 시각 KST | 직접 관찰 |
| --- | --- |
| 17:15:47.617 | 새 WebPage 생성 |
| 17:15:48.005 | 새 페이지 loadRequest |
| 17:15:51.297 | navigation policy Use 결정 |
| 17:15:55.797 | 실제 provisional load 시작 — 요청 후7.792초 |
| 17:15:56.217 | main resource HTTP200 — provisional start 후0.420초 |
| 17:15:56.647 | main frame commit |
| 17:16:00.246 | 첫 layer tree commit. WebKit 자체 로그: visible rect 요청 후12.46초 |
| 17:16:00.737 | main frame didFinishLoad |
| 17:16:01.101 | 앱의 WebPageProxy::close — load end 후0.364초 |
| 17:16:01.148 이후 | 앱이 RunningBoard에 종료 요청, 프로세스 종료가 뒤따름 |
| 17:16:35~40 | 재시도 페이지 생성·HTTP200·load finish 확인 |

**확정 범위:** 해당 main document는 HTTP200으로 로드됐고, WebContent 초기화/탐색 시작 전 지연 및 늦은 화면 반영이 있었다. 기록된 프로세스 종료는 앱의 close/종료 요청 뒤에 발생했다. 이전 발췌의 entitlement/assertion 오류를 원인으로 단정할 근거는 없다. 과거 서버 로그의 구현 도중 module-not-found는 발생 시각과 해당 navigation 연결이 없어 이 사건 원인으로 채택하지 않았다.

**가장 유력한 설명(추론):** 웹뷰 준비 과정이15초 예산을 대부분 소모했고 BridgeReceiver의 hydration/effect 및 WEB_READY 처리 전에 앱의 준비 제한에 걸렸을 가능성이 높다. HTTP 응답 자체는 탐색 시작 후0.42초였고 이후 화면 반영도 늦었으므로 단순한 서버 응답 지연만으로 설명하지 않는다.

**아직 확정하지 못한 부분:** 당시 timer-armed/ready-timeout/WEB_READY JS 시각과 콜백 종류가 없다. 따라서 실제15초 타이머 발동, WEB_READY가 늦은 정확한 단계, 초기화 지연의 OS 스케줄링/자원 경쟁 원인까지100% 확정할 수 없다. 이번 통제 실험을 과거 사건의 직접 증거로 대체하지 않는다.

## 보완 구현

- `ApplyContainer.tsx`: mount와 revision별 reload/navigation/loadStart/loadEnd/ready/timer armed·cleared·timeout, HTTP/일반 load 오류, WebContent 종료, 앱 상태 변화를 기록한다. 기존15초 제한·reset·retry 동작은 유지했다.
- `webview-trace.ts`: 단조 시계 elapsed와 순서 번호, UTC 시작 시각. 보관200개, 초과 dropped 표시. 허용된 숫자/boolean만 받아 원본 URL·message·native error description·인증값을 보관하지 않는다. Release 수집 비활성.
- `BridgeDiagnostics.tsx`: 개발 도구의 “웹뷰 이벤트 기록 보기”로 명시적 snapshot 조회. 접근성 도구가 긴 텍스트/많은 행을 잘라 읽는 문제를 확인해 최근30개를 개별 Text로 표시하고 hiddenInView를 명시한다. 이벤트 수신마다 UI를 다시 그리지 않으며 기존 측정 경로·bridge 계약을 바꾸지 않았다.
- `webview-trace.test.ts`: 오류 종류/세대/시간, 비밀 필드 제외, bounded history의 누락 표시, Release 비수집4개. [RED](trace-red.log)는 모듈 부재로 suite1실패/테스트 미수집이며4개 assertion 실패로 과장하지 않는다. 구현 후 [4개 GREEN](trace-green.log).

## 필수 검증 8묶음

1. **과거 사건 역추적:** 위 시스템 로그 순서를 확인했다. 원인 확정과 추론의 경계를 분리했다.
2. **첫 진입·정상 reload:** 앱 프로세스 재실행 후 최초 진입 [원본](cold-entry.json) ready까지3,352.715ms. 정상 reload3회 [원본](normal-reloads-final.json) 2,866.696 / 3,234.016 / 4,343.191ms. loadStart→loadEnd→ready→timer-cleared. 이 값은 진단용 timer→ready이며 기존 브리지 RTT/인증 restore와 다른 측정 경계다.
3. **실제 WebContent 종료:** app84469 소유로 로그 확인한 WebContent85931에만 SIGTERM. [조작](process-termination.json), [이벤트](process-terminated-events.json)에서 revision3 `content-process-terminated`, ready-timeout 없음. 오류 화면 후 retry revision4 ready3,990.086ms. 정상 teardown에서도 라이브러리의 같은 native 이벤트를 생성할 수 있어 이벤트명만으로 OS crash라고 단정하지 않는다.
4. **실제 서버 무응답·복구:** 확인된 localhost Next PID78355만 SIGSTOP→SIGCONT. revision5 timer 시작 후15,001.894ms에 ready-timeout, loadEnd/ready 없음. [이벤트](server-delayed-events.json), [복구](server-recovered-events.json): 새 revision6 ready6,392.298ms. HTTP 오류와 동일시하지 않음. **HTTP503 강제 응답 실험은 미실행**이며 HTTP 분기는 trace unit 및 native main-frame 조건 소스 검토만 했다.
5. **연속/중첩 재로드:** 일반 연속5회는 도구 왕복에 약9초가 걸려 실제로는 앞 페이지가 준비된 후 다음 클릭이었다. [원본](consecutive-final-events.json). 이를 로딩 중 경합 검사로 잘못 세지 않았다. 별도로 서버 응답을 멈추고 약3.3초 간격으로3회 reload하여 revision12/13 로딩 중 교체를 보장했다. [조작](overlap-actions.json), [이벤트](overlap-events.json):12/13 타이머 해제, 마지막14 ready13,637.746ms. 이전 두 타이머가 만료됐을 시각 이후에도 오류 없음. 임의로 늦은 native callback을 강제 주입한 검사는 아니므로 모든 경합을 증명하지 않는다.
6. **회귀·타입:** 최종 Node24 `npm run typecheck` exit0 [로그](typecheck-final.log). env-file의 DB를 CHAGOK_TEST_DATABASE_URL로 주입한 `vitest run`, 실제 PG 포함11파일64테스트 통과/skip0 [로그](tests-final.log). 계측 적용 후 실제 왕복20/20, timeout/failure0 [UI 관찰](bridge-final.txt). 웹 소스/빌드 설정·native 의존성 변경이 없어 이번 웹 production 빌드/iOS 재빌드는 미실행; 이전 성공을 이번 실행으로 재사용하지 않는다. 최종 `__DEV__` 추가 파싱 guard는 개발 동작을 바꾸지 않으며 이후 타입/전체 테스트를 다시 실행했다.
7. **문서·보존:** [최종 검사](document-check.json), [소스/원본 해시](manifest.json). 기존 OAuth/성능 원본·사용자 day01 학습 보존. staged 비어 있음, 로컬 day02 학습 ignored. 전체 diff 공백 오류9줄은 기존 day01 학습이며 제외 검사 통과.
8. **화면·환경:** [최종 HTTP 확인](server-final.json)에서 Next `/apply`·Metro `/status`·브라우저 미리보기 모두200. 실제 mini 개발 도구에 진단 버튼/최근 이벤트 표시, 서버 복구·최종 WEB_READY·왕복 성공 확인. [개발 진단 화면](diagnostics.png). 브라우저 미리보기 `http://localhost:3000/apply`는 기존 열린 페이지이며 native 진단 UI를 대신하지 않는다. 사용자 확인 방법: mini → 데모 → 신청 → 개발 도구 → 웹뷰 이벤트 기록 보기. 키보드 Option+Tab/Space는 이전 사용자 확인을 유지하며 이번 재실행은 아니다.

[합친127개 이벤트](combined-events.json)는 동일 시작 시각/seq별 값이 같은 UI snapshot들만 병합했다. 중복 충돌0·seq 누락0이며 인위적 이벤트를 만들지 않았다. [독립 시간 계산](event-analysis.json). Fast Refresh로 생긴 seq47~48 mount/unmount는 원본에 남기고 reload 통계에서 제외했다. 중간 캡처 SCStreamErrorDomain -3812와 clickCount5가 실제 reload를 발생시키지 않은 조작은 성공 실험에서 제외했다. UI snapshot은 최신 상태를 자동 갱신하지 않으므로 버튼을 다시 눌러 조회한다.

## AC 최종 판정

| AC | 상태 | 결과·한계 |
| --- | --- | --- |
| R1 당시 사건 조사 | 충족(조사 기준) | 실제 초기화/탐색/표시 지연과 앱 요청 종료 순서 확정. 최종 JS 오류 분기는 미확정이므로 원인 해결 완료 아님 |
| R2 진단 보완 | 충족 | 오류 종류·revision·타이머 시각 분리, 개인정보 제외·200한도·Release 비수집 검사와 실제 UI 수집 |
| R3 원인별 재현 | 충족 | 첫 진입/정상3회/일반 연속5회/중첩3회·실제 서버 timeout·WebContent 종료/복구 판별. HTTP503/임의 native callback 순서/실기기 미검증 |
| R4 회귀·최소 수정 | 충족 | 진단 공백만 보완. 동작 결함 미재현으로 timeout/브리지 동작 변경 없음. 최종64테스트·타입·실제왕복20/20 |
| R5 기록 정정 | 충족 | 검증·진행·계획·학습·최신 초안을 갱신. 앞선 완료가 원인 규명 완료가 아님을 명시. 커밋/push/PR/학습 추적 제거 없음 |

## 남은 판단

재발 시 이번 trace의 ready-timeout/HTTP/load-error/content-process-terminated와 revision을 먼저 확보한다. 현재 한정된 실험에서 이전 timer 오염은 재현되지 않았으므로 timeout 확대나 ref.reload 방식 변경을 추측으로 적용하지 않았다. Debug simulator 결과를 Release/실기기로 일반화하지 않는다. 전체 UI 인수와 PR 진행은 별도다.

## 독립 리뷰 및 진단 제한

[독립 리뷰](review.md): Critical/Important 없음, Minor1건 보류. 웹 `CLOSE_WEBVIEW`의 명시적 close 기록이 없고 unmount의 revision은0이다. 따라서 mount/unmount를 페이지 세대 판단에 사용하거나 이 trace만으로 모든 정상 종료와 오류 teardown을 구분하지 않는다. 현재 실험의 timer/ready/오류 이벤트와 수치에는 영향이 없다.

후속 해결 — 2026-11-16: 당시 보류했던 웹 close 누락과 unmount revision0을 [종료 기록 수정](../trace-close/result.md)에서 수정·회귀 검증했다. 위 보류 판단과 수집 로그는 당시 상태의 기록으로 보존하며 과거 원본을 다시 쓰지 않는다.
