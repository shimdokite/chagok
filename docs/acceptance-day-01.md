# 1일차 Acceptance Criteria 결과

최종 갱신: 2026-11-13 KST, iOS M08/M09 검증·표시 결함3건 수정 및 AC15 사용자 확인 반영. **사용자 승인 변경을 반영한 AC 충족 16개 / 적용 제외 2개.** AC15의 원문 ‘시안 미수정’ 조건은 사용자의 후속 수정 요청으로 예외 처리했습니다. 백업 원본은 보존했고, 수정된 시안의 M12 회귀는 실제 Chrome에서 통과했습니다. 네이티브 실행 증거는 iPhone 17 시뮬레이터(iOS 27.2), Debug Development Build입니다. 실제 iPhone·Android·출시 성능 검증으로 확대 해석하지 않습니다.

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
| AC18 진행·측정·학습·다음 시작점 | **예** | progress, metrics, learning/day-01, manual-checks를 실제 결과로 갱신. 사용자 최종 확인·PR 승인 기록, 2일차 미시작 |

AC02/03/06/07/10/11/12는 기존 Xcode 부재로 미확인이었던 항목이며 이번 iOS 시뮬레이터 검증으로 갱신했습니다. M08과 M09(작은 화면·최대 글자·다크)는 iOS 시뮬레이터에서 추가 완료했습니다. 실제 기기, Android 뒤로 가기, 스크린리더, 웹 본문의 OS 글자 확대 연동은 별도 범위입니다.


## 1일차 완료 여부 재점검

원문 AC15는 ‘회귀 확인했거나 수동 확인 필요로 명시했다’입니다. 기존 ‘예15/추가확인1/제외2’ 집계는 회귀 실행 여부와 AC의 대체 충족 조건을 혼동했으므로 ‘충족16/제외2’로 정정합니다. 당시에는 원본 보존과 수동 확인 필요 명시만 완료했습니다. 이후 사용자 요청에 따라 제출 결함을 수정하고 M12 실행까지 완료했습니다(아래 승인 예외 참고).

AC09는 자동 계약 검증에 더해 실제 iOS WebView의 M08 검증을 완료했습니다. 16개 입력의 실제 콜백과 상태 불변을 원본 JSON으로 보관했습니다. AC10은 자동 타이밍 경계 테스트와 시뮬레이터 준비 왕복 중 취소·재진입 확인을 근거로 판정했습니다. 모든 네이티브 상황을 검증했다는 뜻은 아닙니다.

**1일차 핵심 구현·기준선·명세의 검증 목록을 완료했습니다(적용 제외 항목과 아래 검증 한계 포함).** M08 실제 경계 콜백16/16과 M09 작은 화면/최대 글자/다크 표시 검증을 추가 완료했고 표시 문제3건을 수정했습니다. 사용자 화면·스크롤 최종 승인과 1일차 인수는 2026-11-13 완료했습니다. PR 생성도 명시적으로 승인받았습니다. M12는 Chrome 회귀와 사용자 신청·승인·반려 수동 확인까지 완료했습니다. 실제 iPhone·추가 OS·Release/production 성능은 오늘의 필수 목표와 분리합니다. 오늘 명세는 우선 OS 한 곳의 Development Build와 실제 실행 환경 기록을 요구하며 시뮬레이터 실행을 배제하지 않습니다.

## AC15 원본 수정 승인 예외

사용자 후속 요청: “그럼 원본에서 문제를 수정해줘. 신청→승인·반려까지 직접 검증하고, 내가 AC15를 수동 테스트할 수 있게 해.” 원문 지시서를 소급 변경하지 않고 이 요청을 우선했습니다. 작업본 HTML은 변경되었으므로 ‘원본과 동일 해시’라고 주장하지 않습니다. 원래 바이트는 `verification/prototype/chagok-prototype.before.html`에 보존했습니다. 실제 코드 변경은 sandbox의 allow-forms 토큰 1개이며 디자인·산식·신청 상태 로직은 동일합니다. 검증은 같은 파일을 로컬 HTTP로 제공한 Chrome 기준이며 file URL·다른 브라우저 결과로 확대하지 않습니다.


## 사용자 최종 확인 — 2026-11-13 (Asia/Seoul)

> “Device Hub에서 직접 확인했고 화면이랑 스크롤 모두 정상 동작해. 1일차 최종 확인 완료로 기록하고, PR을 올리자.”

Device Hub 실제 화면과 정상 스크롤 사용감의 사용자 확인을 완료했습니다. 1일차 최종 인수를 완료로 기록하며 브랜치·push·PR 생성 승인을 받았습니다. 실기기·Android·VoiceOver·웹 본문 Dynamic Type·Release 성능은 추가 범위입니다. 2일차는 시작하지 않습니다.
