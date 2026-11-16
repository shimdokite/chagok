# 2일차 세션 복원 측정 결과

2026-11-16 (Asia/Seoul). 실제 Google 로그인 후 동일 앱 세션으로 프로세스를 종료·재실행한 **10회 모두 성공**했다. 복원 시간은 **중앙값 225.98ms, 최소 140.14ms, 최대 858.87ms**다. 준비 실행은0회이며 첫 실행858.87ms도 포함했다.

| 항목 | 결과 |
| --- | --- |
| 정상 startup 시도/성공 | 10 / 10 |
| 정상 구간 실패·timeout·취소 | 모두0 |
| 중앙값 | 225.97695850208402ms |
| 범위 | 140.14224999397993~858.8681249991059ms |
| 전체 journal | 17개: success11(정상10+복구 retry1), empty4, failure1, expired1 |
| 저장/용량 | saveFailed=false, capacityReached=false (17/100) |

- [공유 JSON 원본17개](../raw/day-02-session-restore-journal.json)를 그대로 보존했다. [정상10회 추출·요약](../raw/day-02-session-restore.json)은 [사전 지정 구간](../../verification/day-02/oauth/startup-window.json)의 startup을 상태와 무관하게 모두 추출했다. [각 회 UI 확인](../../verification/day-02/oauth/startup-ui-checks.json)과 일치한다.
- [환경·원본 해시](../environments/day-02.yaml), [소스 manifest](../../verification/day-02/oauth/source-sha256.json), [Python 독립 재계산](../../verification/day-02/oauth/metrics-check.json)을 결합했다. 선택한10개는 현재 source/build에 해당하며 전체 journal의 초기 empty 실행은 이전 탐색 기록이다.
- 경계: restore 진입→SecureStore 읽기→서버 판정/오류 확정까지 RN performance.now로 측정. UI paint·전체 앱 콜드 스타트·Google 로그인 화면 시간은 제외한다. Xcode27.2/iOS27.2 mini simulator/Debug, Next development, API·PostgreSQL 모두 host-local인 초기 기준선이다. 실기기·Release·원격 서버 성능이나 개선율로 일반화하지 않는다.
- 정상10회 종료 후 별도 장애 실험의 failure1(243.39ms), 서버 복구 retry success1(877.75ms), 만료 expired1(83.49ms)을 전체 원본에 유지했다. 정상 구간 밖의 의도한 장애이므로 정상10회 중앙값에 합치지 않았다. empty4도 삭제하지 않았다.
- 사용자 Copy → Device Hub Get Clipboard → 로컬 TextEdit의 JSON → 파일 순서로 추출했다. 중간 기기 좌표 도구 오류로 재로그인 계속/Copy를 사용자가 조작했으며, 복사 완료를 확인한 뒤 원본17개·저장 오류 없음·중복 runId 없음·필드 종류를 검사했다. 토큰·이메일·회원 ID는 원본에 없다.
- 산식: 성공10개를 정렬한5번째198.17420800030231ms와6번째253.77970900386572ms의 평균이 중앙값이다. Node 요약과 Python statistics.median/min/max를 독립 비교하여 일치했다.

1일차 브리지 약1.83ms와 아래 별도 브리지 수치는 다른 측정 경계이므로 복원 시간과 비교하거나 개선율로 재사용하지 않는다.

## 별도 브리지 회귀 측정

- 실제 iPhone 13 mini simulator/iOS27.2, signed Debug + Next development. 준비3회 후 본 측정20회, 간격100ms/timeout3000ms.
- [공유 원본](../raw/day-02-bridge.json): 20/20 성공, 실패·timeout·취소0. 중앙값1.6881245002150536ms, 범위1.280791997909546~13.023874998092651ms. Python으로 원본 표본에서 요약 재계산 일치.
- **원본 안 sourceRef는 기존 로컬 설정의 1일차 해시다.** 원본을 소급 수정하지 않고 [실제 소스 결합·환경 보충](../environments/day-02-bridge.json)에 이번 manifest SHA-256과 원본 SHA-256을 기록했다. 이 메타데이터 결함 때문에 엄밀한 전후 비교 자료로 사용하지 않는다.
- RN의 PING 송신~같은 requestId의 PONG 수신을 RN 단조 시계로 측정. 세션 복원 시간이 아니며 1일차 대비 개선율을 주장하지 않는다.
