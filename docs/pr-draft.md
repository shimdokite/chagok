# 1일차 누적 PR 기록 — 사용자 최종 승인 완료

제안 브랜치: `feat/day-01-foundation`
제안 제목: `feat(repo): 차곡 1일차 앱·웹·브릿지 기반 구현`
상태: 사용자 화면·스크롤 최종 확인 완료. 공개 저장소에 [PR #1](https://github.com/shimdokite/chagok/pull/1) 생성 완료, 미병합. 최신 전체 PR 본문은 `docs/changes/latest-pr.md`.

## 배경과 사용자 피드백

기존 앱 소스가 없어 승인된 시안에서 실제 RN/Next 연결을 시작할 기반이 필요했습니다. 요청 원문:

> “아직 앱 소스 코드는 없어. 기존 파일과 AGENTS.md가 있는지 확인하고, 지시서에 따라 프로젝트 초기 설정부터 1일차만 구현해줘.”

> “구현뿐 아니라 테스트·측정·학습 기록까지 남기고, 실제 검증 결과와 내가 직접 확인해야 하는 항목을 구분해줘.”

> “2일차 구현은 시작하지 마.”

이는 제품을 사용한 고객 인터뷰 인용이 아니라 프로젝트 소유자의 개발 요청입니다. 확인되지 않은 고객 피드백은 만들지 않았습니다.

## 변경 결과

npm workspaces에 Expo/RN 로그인·홈, Next.js 비활성 신청 폼과 실제 health tRPC, Zod 브릿지 및 순차 측정 도구를 추가했습니다. 고정 fixture의 잔여 한도는 65,000원이며 실제 인증·DB·신청 저장·과금이 없습니다. 화면 종료/재로드 시 요청을 취소하고 닫힌 측정도 내보낼 수 있습니다.

## 검증과 AC

타입 검사·33테스트·웹 production build 통과. Xcode27.2로 iPhone17/iOS27.2 시뮬레이터 Development Build 설치·실행, 실제 API 성공/장애/복구, WebView·닫기·재로드·세션 분리 확인. 기준선 준비3회+본20회 모두 성공, 중앙값1.829125ms. 실제 iPhone/Android/Release 성능은 미검증입니다.

시뮬레이터 검증 중 Next 개발 리소스가127.0.0.1을403으로 차단하는 문제를 발견해 해당 개발 호스트만 허용했습니다. iOS 날짜 입력 overflow도 CSS로 수정했습니다. 실측 환경과 소스 해시를 원본에 포함하고 취소 실험까지 저장했습니다.

| AC | 판정 | 확인 방법과 근거 / 남은 확인 |
| --- | --- | --- |
| AC01 저장소·AGENTS·명령·변경 파일 | **예** | 시작 전 빈 폴더·Git 미존재 확인. repository-map, README, changed-files 기록. Next가 생성한 AGENTS 구분 |
| AC02 Development Build 실행 | **예 — iOS 시뮬레이터** | pod install 및 xcodebuild exit 0, 앱 설치·실행·Metro 연결. 0.1.0 (1), dev.doyeon.chagok. `verification/native/build-result.json`, 로그인 캡처 |
| AC03 시안의 네이티브 로그인·홈 | **예 — iOS 기본·작은 화면·최대 글자·다크** | 로그인·홈의 색상/배치/금액/Safe Area/실제 상태줄 관찰. `native/login.png`, `home-before.png`. 화면 바깥 프레임은 Device Hub UI이며 앱에 복사하지 않음. Expo Tools 배지는 개발 도구. M09 추가 실측·3건 수정: `verification/m08-m09/README.md` |
| AC04 데모 진입·Google 준비 중 | **예** | iOS에서 비활성 Google·준비 중 문구와 데모 진입 직접 확인. 실제 인증 없음 |
| AC05 한도 100,000/35,000/65,000 | **예** | fixture 산식 테스트와 iOS 홈 확인. 최근 도서 15,000/식비 20,000, 반려 제외 |
| AC06 앱의 실제 API 성공·장애·재시도 | **예 — iOS 시뮬레이터** | 앱에서 health 성공 → Next 프로세스 종료 → 오류 안내 → 서버 재시작 후 성공. `api-success.png`, `api-offline.png`, `api-recovered-history.png`, 웹 요청 로그 |
| AC07 실제 WebView /apply·홈 복귀 | **예 — iOS 시뮬레이터** | 네이티브 WebView에서 Next 폼과 WEB_READY 확인. RN 닫기 및 웹 CLOSE_WEBVIEW 버튼으로 홈 복귀. `apply.png`, `home-after.png` |
| AC08 ready 이전 차단·ID 대응 | **예** | 미연결/재로드 중 측정 버튼 비활성, ready 이후 활성 관찰. 원본 20개 ID 유일성 확인. wrong ID·중복 대응은 단위 테스트 |
| AC09 잘못된 메시지 무동작 | **예 — 자동 + 실제 iOS WebView** | 계약 단위 테스트 및 M08 실제 콜백 16/16 확인. 잘못된 메시지8종 거부, 금지 이동4종·새 창2종 차단, 미대응 PONG 무동작·원래 문서 유지. `verification/m08-m09/m08-native.json`, `m08-validation.log` |
| AC10 닫기·재로드·재진입 cleanup | **예 — 관찰 범위 명시** | 준비 왕복 도중 닫기와 재로드 각각 cancelled/close, cancelled/reload 원본 보존. 재진입·재로드 뒤 새 세션 20/20 성공, 이전 세션과 분리. 본 측정 도중 pending·timeout·중복 응답 경계는 자동 테스트. `day-01-bridge-lifecycle.json`, `lifecycle-validation.json` |
| AC11 열기·닫기·계측·재시도 후 한도 불변 | **예** | 전후 홈 65,000/35,000/100,000 유지. 최근 2건 유지. 신청 저장 mutation·DB 없음. `home-before.png`, `home-after.png`, API 복구 화면 |
| AC12 실제 20회 원본·환경·요약 | **예 — 시뮬레이터 실측** | 준비 3회 + 본 측정 20회. 20성공/실패0/timeout0, 중앙값1.829125ms. 앱 Share→Copy→simctl pbpaste로 원본 저장. 환경·소스 해시·중앙값 재계산 대조 통과. `metrics/raw/day-01-bridge.json`, `native/raw-validation.json` |
| AC13 타입·테스트·웹 빌드 기록 | **예** | 최신 M08/M09 변경 후 typecheck exit0·5파일/33테스트·iOS production JS export 통과(`verification/m08-m09/`). 이전 production 웹 빌드·iOS 네이티브 빌드 성공 로그는 `verification/native/`. 이번 웹/네이티브 바이너리 재빌드 없음 |
| AC14 기존 생성 플로우 | **적용 제외** | 최초 폴더 비어 있음. 기존 생성 진입점/worker/API 없음. 오늘 실제 신청 생성 미구현 |
| AC15 승인 시안 보존·회귀 | **완료 — 자동 회귀·사용자 수동 확인** | 사용자 승인 수정 예외로 allow-forms만 추가, 원본 백업 보존. Chrome 회귀 통과: 영수증 누락 차단, 신청 65,000→45,000, 승인 45,000 유지, 반려 65,000 복원. `verification/prototype/green/results.json`. 사용자도 신청·승인·반려 정상 동작 확인(2026-11-13) |
| AC16 크레딧 과금 변화 0 | **적용 제외** | 기존/신규 지갑·과금·ledger·결제 webhook 경로 없음. 복지 fixture를 크레딧으로 간주하지 않음 |
| AC17 민감값 미포함 | **예 — 검토 범위 명시** | 가상 fixture, public origin, 기기/빌드/소스 해시만 사용. 원본에는 신청 내용·인증 정보 없음. source/config 및 실측 JSON 검사 기록 |
| AC18 진행·측정·학습·다음 시작점 | **예** | progress, metrics, learning/day-01, manual-checks를 실제 결과로 갱신. PR은 사용자 OK 이후, 2일차 미시작 |

AC02/03/06/07/10/11/12는 기존 Xcode 부재로 미확인이었던 항목이며 이번 iOS 시뮬레이터 검증으로 갱신했습니다. 실제 기기, Android 뒤로 가기, 스크린리더와 추가 플랫폼의 M08 차단은 별도 검증 범위입니다. M09 네이티브 OS 글자 확대·다크·작은 화면은 추가 완료했습니다.

원본 로그/캡처는 docs/verification/native, 실측 JSON은 docs/metrics/raw, 사용자 직접 확인 절차는 docs/manual-checks.md에 있습니다. 사용자 OK 이후 원격 대상과 최종 검토 결과를 반영해 PR을 생성합니다.

사용자 승인 변경을 반영한 AC 충족16/적용제외2. AC15의 원본 미수정 조건은 후속 수정 요청으로 예외 처리했으며, M12 Chrome 회귀와 사용자 수동 확인까지 완료했습니다. M08/M09는 iOS 시뮬레이터에서 완료했습니다. M09에서 탭 겹침·잔액 줄 분리·최근 제목의 세로 나열을 수정하고 전후 캡처를 보관했습니다. 실제 앱 화면·스크롤은 이후 사용자 최종 확인으로 완료했습니다.

사용자 확인(2026-11-13): “직접 테스트해봤고 신청·승인·반려 모두 정상 동작해. AC15는 완료로 정리하고, 1일차에서 아직 확인하지 못한 항목들을 알려줘.” 이번 확인은 AC15에 한정하며 전체 PR 생성 승인으로 해석하지 않습니다.

## 시안 제출 결함 — 추가 사용자 피드백

> “영수증 촬영, 선택을 안하고 복지비 신청하기 누르면 영수증 사진에 대한 알림이 없음”

> “영수증 샘플 이미지 첨부하고 복지비 신청하기 누르면 아무런 반응이 없음”

> “그럼 원본에서 문제를 수정해줘. 신청→승인·반려까지 직접 검증하고, 내가 AC15를 수동 테스트할 수 있게 해.”

iframe의 sandbox가 submit 이벤트 전에 제출을 차단했습니다. allow-forms만 추가하고 원본 백업을 남겼습니다. 실제 Chrome 회귀 3시나리오가 수정 전 모두 실패 → 수정 후 모두 통과했습니다. 반려 사유 필수 및 직원 내역 반영도 확인했습니다. 기존 단위 테스트 33개 재실행 통과. 브라우저 오류 0건. 상세 로그·캡처: `docs/verification/prototype/`. HTML만 수정한 이번 작업에서는 타입 검사·앱/웹 빌드를 재실행하지 않았습니다.


추가 요청: “남은 M08과 M09도 직접 검증하고 결과를 기록해줘. 문제가 발견되면 수정하고, 내가 직접 확인해야 하는 부분은 따로 알려줘.” 실제 콜백16/16 및 작은 기기/최대 글자/다크 검증 결과는 `docs/verification/m08-m09/README.md`. 검증 도구를 끈 스크롤 사용감, 웹 본문 Dynamic Type 연동, 실기기/Android/VoiceOver는 구분해 남겼습니다. 2일차 미시작.


## 사용자 최종 확인 — 2026-11-13 (Asia/Seoul)

> “Device Hub에서 직접 확인했고 화면이랑 스크롤 모두 정상 동작해. 1일차 최종 확인 완료로 기록하고, PR을 올리자.”

Device Hub 실제 화면과 정상 스크롤 사용감의 사용자 확인을 완료했습니다. 1일차 최종 인수를 완료로 기록하며 브랜치·push·PR 생성 승인을 받았습니다. 실기기·Android·VoiceOver·웹 본문 Dynamic Type·Release 성능은 추가 범위입니다. 2일차는 시작하지 않습니다.
