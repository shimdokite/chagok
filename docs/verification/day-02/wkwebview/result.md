# WKWebView 포커스·재로드 후속 검증

후속 정정: 아래 “검증 완료”는 실행한 정상 반복·복구 시나리오에 한정한다. [추가 원인 조사](../timeout-investigation/result.md)에서 오류 분류/계측 부족을 보완하고 과거 초기화·표시 지연을 확인했다. 아래 기록만으로 과거 사건을 ready-timeout으로 확정하거나 원인 규명이 완료됐다고 해석하지 않는다.

2026-11-16 KST, macOS arm64 / Node24.22.3 / Next16.4.6 development / iOS27.2 iPhone13 mini simulator Debug. 초기 HEAD main/86a95a2574bc08517c145389cb88b41e81deffd9. [초기 상태](initial-state.json)와 기존 미커밋 변경을 기준으로 이번 범위를 구분했다.

**이번 후속 검증은 완료했다. 앱 결함이 재현되지 않아 런타임 코드·의존성·native 설정을 수정하지 않았다.** 기존 준비 시간 초과1회의 원인은 여전히 미확정이다. 반복 성공을 원인 규명이나 모든 이벤트 경합의 부재로 해석하지 않는다. 사용자 전체 UI 인수와 PR 준비는 별도이며 commit/push/PR·학습 추적 제거를 수행하지 않았다.

## AC 판정

| AC | 상태 | 방법과 실제 결과 | 한계 |
| --- | --- | --- | --- |
| W1 | 충족 | 사용자가 실제 WKWebView에서 Option+Tab으로 웹 닫기 버튼 포커스, Space로 홈 복귀를 직접 확인. 이후 홈 AX도 확인했다. 브라우저 disabled6개·label5개 연결 유지 | 포커스/키 입력은 사용자 직접 확인이며 도구가 CSS ring을 촬영한 증거는 아님. Enter는 별도 미실행. disabled 실제 터치 차단은 기존 2일차 검사, 이번은 DOM 재검사 |
| W2 | 충족 | 정상 reload10/10 준비 완료, 준비 대기 중5회 연속 reload 후 WEB_READY, 닫기/재진입, 서버 SIGSTOP으로 무응답→15초 제한 후 오류→SIGCONT/재시도 복구, 복구 후 왕복20/20, 측정 중 reload 취소와 새 준비 완료 | simulator/Debug 한정. 이전 revision의 임의 이벤트 순서를 강제 주입한 검사는 아니며 과거 타임아웃 원인 미확정 |
| W3 | 해당 없음 | 이번 정상·연속 재로드에서 불필요한 timeout 또는 상태 오염을 재현하지 못했다. ApplyContainer/useWebViewBridge/BridgeReceiver와 설치된 WebView14.0.1 콜백 경로를 검토하고 수정·진단 코드 추가를 하지 않음 | 재현 근거 없이 timeout을 늘리거나 이벤트 순서를 추측하여 수정하지 않음 |
| W4 | 충족 | 이번 실행 타입 exit0, 실제 PostgreSQL 포함10파일60테스트 통과(skip0), production 웹 build exit0, 실제 WKWebView 시나리오 확인 | 최초 DB 테스트는 sandbox EPERM으로59통과1실패. 권한 허용 후 재실행 성공. native 변경이 없어 iOS 재빌드는 해당 없음 |
| W5 | 충족 | 현재 결과·사용자 확인·자동 로그·소스 해시·학습·진행·최신 PR/커밋 초안 정리. 기존 OAuth 원본/학습 보존 검사 | 전체 UI 승인·커밋·push·PR 및 학습 추적 제거는 수행하지 않음 |

## 필수 검증 8묶음

1. **키보드·비활성 UI:** 사용자 답변: “option+tab으로 닫기 버튼에 포커싱이 되고 space 누르니까 홈으로 돌아갔어.” [홈 관찰](keyboard-home.txt), [웹 제어 DOM](web-controls.json). 좌표 도구의 noWindowsAvailable 오류 때문에 사용자 조작을 요청했으며 코드 실패로 분류하지 않았다. Tab만으로는 포커스를 확인하지 못했고 Option+Tab/Space를 성공 경로로 기록한다.
2. **일반 reload10회:** [관찰 원본](baseline-reloads.json). 1회차의 ready=false는 클릭 직후 로딩 중 관찰이고 후속 finalReady=true다. 2~10회는 준비 완료를 확인한 후 다음 실행. UI 관찰 시각은 브리지 duration이나 성능 표본이 아니다.
3. **연속 reload·취소·재진입:** [5회 입력](rapid-reloads.json)은 각 클릭 직후 loading=true, 마지막 [준비 완료](rapid-final.txt). 이후 별도 왕복 진행 중 reload는 [cancelled/reload](cancelled-reload.txt), 새 WEB_READY 확인. 해당 run은 성공4회 뒤 요청 간 간격에서 중단되어 summary.cancelled=0이지만 전체 status=cancelled다. 정상20회 결과로 섞지 않았다. native 닫기→홈→신청 재진입 후 WEB_READY도 확인했다.
4. **서버 무응답·복구:** apps/web cwd·port3000을 확인한 PID78355에 SIGSTOP/[정지 시각](server-pause.json), 15초 제한 뒤 [오류 화면](server-paused.png), SIGCONT/[재개 시각](server-resume.json), 다시 시도 후 [WEB_READY](recovered.txt). 복구 후 [왕복20/20·failure/timeout0](post-recovery-benchmark.txt), [화면](recovered.png). 새 코드 없이 기존 오류/재시도 경로 정상. 의도적 장애는 정상 reload 실패율에 합치지 않는다.
5. **타입·실제 DB 전체 테스트:** Node24 PATH로 `npm run typecheck` exit0 ([로그](typecheck.log)). `node --env-file=apps/web/.env.local --input-type=module`에서 CHAGOK_TEST_DATABASE_URL을 DATABASE_URL로 전달하여 `vitest run`:10파일60통과 ([로그](tests.log)). 최초 sandbox 실행은 connect EPERM 127.0.0.1:55432로1실패 ([실패 로그](tests-sandbox-failed.log)); 로컬 DB 연결 권한으로 재실행했다. 값은 출력하지 않았다.
6. **빌드:** Node24에서 `npm run build:web` exit0 ([로그](build-web.log)). `/apply` 정적 출력. 이번 소스 변경이 없어 native 재빌드 생략; 기존 signed Debug 앱으로 실제 확인했다.
7. **문서·보존:** [문서 검사](document-check.json), [현재 소스](source-sha256.json). 기존 OAuth journal17개·정상복원10개·bridge원본 및 기존 day01 학습 보존. full diff whitespace 실패는 기존 day01 학습9줄이며 해당 경로 제외 검사는 통과. 로컬 day02 학습은 Git 제외, staged 비어 있음.
8. **사용자 확인 환경:** http://localhost:3000/apply 브라우저 탭을 열어 유지했다. Device Hub → Chagok M09 Mini는 데모 신청/개발 도구의 WEB_READY 상태, Capture Keyboard off. Next3000·Metro8081·웹 미리보기8082·PG55432 유지. UI 자체를 변경하지 않았지만 실제 검증 요청에 따라 화면을 열었다. 사용자 최종 디자인/사용감 인수와 PR 승인은 별도다.

## 코드 검토·판단

- ApplyContainer는 revision을 key로 WebView를 교체하고 reload/close/error에서 bridge.reset한다. effect는 ready/error/revision 변경과 unmount에서 이전 준비 타이머를 해제한다. BridgeBenchmark의 reload/close 취소·늦은 PONG 무시·타이머 해제 기존 테스트도 이번 전체 실행에서 통과했다.
- WebView14.0.1의 iOS native 코드는 허용된 최상위 navigation 결정에서 onLoadingStart를 전달한 후 navigation을 허용한다. 이번 일반·연속 실험에서 `WEB_READY`가 뒤늦은 loadStart로 취소되는 현상은 보지 못했다. 이 소스 검토만으로 모든 native 이벤트 경합을 증명하지는 않는다.
- Ruling: 기존 미커밋 작업을 현재 폴더에서 이어 검증했고 별도 worktree/commit을 만들지 않았다. 사용자 요청과 보존 규칙을 우선했으며 초기 해시로 범위를 확인했다.
- Ruling: 재현되지 않은 과거 timeout을 추측으로 수정하지 않았다. 잘못된 판단일 경우 드문 경합이 남을 수 있으므로 재발 시 loadStart/ready/loadEnd/timeout 시각과 revision을 먼저 수집한다.
- 이번 왕복20회의 화면 요약은 기능 회귀 근거다. 새 raw JSON을 export하지 않았으므로 성능 결과 파일을 추가하거나 기존 성능 수치를 바꾸지 않았다. 기존 인증 복원10회·브리지 원본과 환경 기록은 그대로 유지한다.
- [Apple 외장 키보드 안내](https://support.apple.com/guide/iphone/control-iphone-with-an-external-keyboard-ipha4375873f/ios)는 Full Keyboard Access의 Tab/Space 동작을 설명한다. 이번 확인을 위해 iOS 접근성 설정을 변경하지 않았으며 사용자 Option+Tab 결과와 구분한다.

[독립 검토](review.md): Critical/Important/Minor 지적 없음. 최종 초안/문서 검사는 주 작업자가 별도 확인했다.

## 남은 경계

실기기·Android·Release·스크린리더·Enter 별도 조작은 이번 범위에서 미검증이다. 최초 timeout1회의 원인 규명은 미완료지만 이번 재현 가능한 시나리오는 통과했다. 따라서 2일차 구현/요청한 검증·학습 기록은 마무리하고, 전체 UI 인수 및 PR 준비 승인 이후의 학습 추적 제거는 다음 단계로 남긴다.
