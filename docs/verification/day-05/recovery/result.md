# 5일차 후속 — 업로드 실패 복구와 진행 중 종료

2026-11-23 KST. 현재 제품 코드의 실제 동작을 검증한 작업이며 코드·설정·DB 스키마는 수정하지 않았다. 기존 미커밋 변경을 포함한772파일의 시작 SHA-256과 diff를 기록했다.

## AC 결과

| AC | 상태 | 확인 방법과 실제 결과 |
| --- | --- | --- |
| R1 시간 초과/재시도 | 충족 | 기존 JPEG 첨부가 있는 상태에서 서버 응답을55초 지연했다. PNG upload35319.87ms 후 `업로드하지 못했어요. 사진을 다시 선택해 주세요.` 표시, 기존 JPEG 유지와 버튼 활성화를 확인했다. 서버 복구 후 같은 PNG 재선택이93.28ms에 성공했고 오류 안내가 사라졌다. |
| R2 진행 중 닫기 | 충족 | 서버를25초 지연하고 JPEG 업로드 중 native `닫기 · 홈으로`를 눌렀다. 홈64,000원 유지, trace interrupted/aborted. 서버 복구 뒤 재진입한 양식에 이전 첨부/오류가 없고 새 JPEG 업로드가34.29ms에 성공했다. |
| R3 진행 중 웹뷰 reload | 충족 | 서버를25초 지연하고 PNG 업로드 중 개발 도구의 `웹뷰 다시 로드` 실행. 로딩→서버 복구→WEB_READY 수신을 확인했다. 이전 첨부 없이 새 양식이 열렸고 새 PNG 업로드67.76ms 성공. 이전 trace는 interrupted/aborted다. |
| R4 복구/회귀/기록 | 충족 | pause3회 모두 finally에서 재개, Next3000·Metro8081 HTTP200. 관련7파일45테스트와 스타일127파일 위반0. 원본 표본7건·로컬 DB/바이트4건·학습·초안·보존 검사 기록. |

## 검증 5묶음

1. **관련 자동 검사:** Node24.22.3에서 `npm test -- apps/mobile/src/bridge/claim-host.test.ts apps/web/src/components/apply/form-client.test.ts apps/mobile/src/receipts/picker.test.ts apps/mobile/src/receipts/native.test.ts apps/mobile/src/receipts/metrics.test.ts apps/mobile/src/receipts/metrics-native.test.ts apps/mobile/src/components/ApplyContainer.test.tsx --maxWorkers=2` → [7파일45통과](tests-final.log), pretest 스타일127파일 위반0. 첫 명령은 존재하지 않는 upload.test.ts 경로를 포함해6파일39개만 실행했다 [기록](tests.log). 실제 업로드 검사가 있는 picker.test.ts를 포함해 다시 실행했다. 전체 DB 스위트·타입·빌드는 제품 코드 변경이 없어 이번에 반복하지 않았다. 이전291테스트 통과는 이번 실행 결과로 사용하지 않는다.
2. **에이전트 실제 UI:** iPhone17 Simulator/iOS27.2, 기존 로그인 Debug 앱·Metro JS·Next 개발 서버. 합성 JPEG/PNG만 선택했으며 사용자에게 조작을 넘기지 않았다. 위 R1~R3을 화면에서 확인했다. 서버응답을 지연한 도중 `업로드 중` 상태를 먼저 관찰한 뒤 닫기/reload를 실행했다. 이번 화면 증거는 CUA 관찰 기록이며 별도 이미지 파일은 만들지 않았다. 사용자 최종 검토는 대기다.
3. **장애 주입/원본:** 이 프로젝트의 웹 포트3000 PID85458·cwd apps/web을 확인한 뒤 SIGSTOP→finally SIGCONT. [timeout55초](timeout-fault.json), [close25초](close-fault.json), [reload25초](reload-fault.json), [복구/표본 재계산](recovery-check.log). 전체 개발 서버 응답을 지연한 것이며 OS 네트워크를 바꾸거나 서버 오류 응답을 주입한 것은 아니다. [원본](../../../metrics/raw/receipt-ui-1795426328923-recovery.json)·[환경](../../../metrics/environments/receipt-ui-1795426328923-recovery.json)·[이번7표본](measurement-summary.json). 같은 앱 실행의1~23번은 이전 작업,24~30번만 이번 작업이다. 이전 원본을 덮어쓰지 않았고 prefix23개가 동일함을 확인했다.
4. **읽기 전용 DB/파일:** [저장 대조](storage-check.json). 이번 시간 구간 생성 첨부4건 전부 READY/미연결·fixture 바이트 일치·0600, 신규 신청0. 시간 초과/닫기/reload의 추가 첨부 행은 이번 실행에서 관찰되지 않았다. 성공4건은 로컬 보존했고24시간 지난 미연결 정리 대상이다. 기존 데이터·로그인 세션·신청은 수정하거나 삭제하지 않았다. 클라이언트 abort가 모든 시점의 서버 롤백을 보장한다는 뜻은 아니다.
5. **문서/보존:** [최종 검사](document-check.log)에 시작772파일 대비 허용 문서 변경, 나머지 해시 일치, 상대 링크, git diff 공백, 학습 Git 제외·staged 상태를 남긴다. 화면 구현 변경은 없어 추가 브라우저 열기는 해당 없음. 기존 미리보기 `http://127.0.0.1:3000/apply`와 앱 실제 화면을 사용했고 서버를 정상 복구했다. commit/push/PR은 수행하지 않았다.

## 관찰과 한계

성공4건·오류1건은 ACK 수신, 중단2건은 aborted이며 대기/누락/저장 실패0이다. 중단 trace에는 완료되지 않은 uploadMs와 ACK가 없다. 이를0ms로 해석하거나 성공 통계에 합치지 않는다. 시간 초과35.32초는 설정35초의 실제 개발환경 관찰값이며 정밀 deadline 또는 성능 보장이 아니다.

준비 중 개발 패널의 스크롤이 끝나기 전에 클릭해 일반 웹뷰 reload가 먼저 발생했다. 이후 새 기준 JPEG를 올린 뒤 R1을 시작했다. 초기 화면의 입력 확대/오른쪽 잘림은 이전에 기록된 현상이며 재진입 이후 정상 폭을 확인했다. 이번 실패 복구 경로에서 새 제품 결함을 발견하지 않아 코드 수정은 하지 않았다.

남은 항목은 실기기 카메라/권한 거절, 실제 로그인 만료·회사 전환 중 업로드 UI, 서버가401/403/413/5xx를 반환하는 UI, Android/Release, 원격 비공개 객체 저장소와 운영 예약 정리다. 이번 성공만으로 D5-01/03/05/07 전체를 충족 처리하지 않는다. 종료는 신청 화면 닫기이고 앱 프로세스 강제 종료·영구 초안 복구를 검증한 것이 아니다.

사용자 직접 확인은 로그인 앱에서 첨부를 선택한 후 개발 도구 기록을 보거나, 서버 정상 상태에서 닫기·재진입하는 방식으로 가능하다. 인위적 서버 정지는 모두 해제돼 있다. 브라우저 미리보기에서는 시스템 picker가 비활성인 것이 정상이다.
