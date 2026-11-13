제목: feat(repo): 차곡 1일차 앱·웹·브릿지 기반 구현
작성일: 2026-11-13 (Asia/Seoul)
대상 범위: 공개 저장소 shimdokite/chagok의 main → feat/day-01-foundation. main은 비교용 빈 초기 커밋이며 이 PR은 최초 1일차 전체 구현을 포함합니다.

게시: [PR #1](https://github.com/shimdokite/chagok/pull/1), 공개 저장소, 미병합.

## 요약

앱 소스가 없던 차곡 프로젝트에 React Native 로그인·홈, Next.js 신청 화면, 실제 API 연결 및 WebView 브릿지 측정 기반을 구현했습니다. iOS 시뮬레이터 검증·기준선 측정을 마쳤고, 사용자가 Device Hub 화면·스크롤까지 확인해 1일차를 최종 승인했습니다.

## 내용

- 배경·목적: 승인된 시안에서 네이티브 앱과 웹 연결을 시작하고 테스트·측정·학습 근거를 함께 남깁니다.
- 구현 방식·선택 이유: Expo Development Build와 Next.js를 npm workspaces로 구성했습니다. 공유 Zod 계약으로 입력을 검증하고 requestId·세션을 분리해 순차 왕복을 측정합니다.
- 범위·제외 사항: 1일차 기반만 포함합니다. 실제 OAuth·DB·업로드·신청 저장·승인/반려 API·과금·배포는 없습니다. 조작 가능한 HTML 시안과 비활성 앱 신청 폼은 별개입니다. 2일차 미시작.
- 관련 이슈: 없음. 아래는 프로젝트 소유자의 직접 요청이며 고객 인터뷰를 만들어 인용하지 않았습니다.

> “아직 앱 소스 코드는 없어. 기존 파일과 AGENTS.md가 있는지 확인하고, 지시서에 따라 프로젝트 초기 설정부터 1일차만 구현해줘.”

> “구현뿐 아니라 테스트·측정·학습 기록까지 남기고, 실제 검증 결과와 내가 직접 확인해야 하는 항목을 구분해줘.”

시안 결함 피드백:

> “영수증 촬영, 선택을 안하고 복지비 신청하기 누르면 영수증 사진에 대한 알림이 없음”

> “영수증 샘플 이미지 첨부하고 복지비 신청하기 누르면 아무런 반응이 없음”

최종 인수·PR 승인:

> “Device Hub에서 직접 확인했고 화면이랑 스크롤 모두 정상 동작해. 1일차 최종 확인 완료로 기록하고, PR을 올리자.”

## 변경

| 영역·파일 | 변경 전 → 변경 후 | 영향 |
| --- | --- | --- |
| 루트 workspace·lockfile·app.config | 앱 소스 없음 → Node24·Expo/RN·Next·공유 패키지 | 재현 가능한 설치·개발 빌드 |
| mobile app/components | 시안만 존재 → 데모 로그인·홈·한도·최근 내역·신청 이동 | 고정 한도65,000원 확인, 실제 인증·저장 없음 |
| apps/web, packages/api | 연결 기반 없음 → 비활성 신청 폼·실제 health tRPC | 성공·장애·재시도 검증 |
| contracts, bridge, metrics | 브릿지 없음 → 계약·origin/path·요청 대응·취소·원본 공유 | 잘못된 입력·이동 차단, 닫힌 실험 보존 |
| mobile dev 및 표시 수정 | 플랫폼 경계·큰 글자 미검증 → M08 도구·M09 배치 수정 | 탭 겹침·잔액 분리·제목 눌림 수정, 이동 도구 기본 숨김 |
| docs/design/chagok-prototype.html | sandbox submit 차단 → allow-forms 추가 | 가상 신청·승인·반려 정상화, 원본 백업 보존 |
| docs/verification, metrics, learning | 근거 없음 → 실제 JSON·로그·캡처·개념 설명 | 환경·실패·수정·사용자 확인 구분 |
| AGENTS, .github, .gitmessage, contributing | 작성 기준 없음 → 필수 PR·커밋 작성 규칙 | 기존 사용자 추가 지침 보존·적용 |
| .gitignore | 압축 백업도 게시 후보 → snapshots 제외 | 환경·도구·빌드·중복 백업은 로컬 보존 |

## 검증

| 명령·시나리오 | 결과 | 근거·환경 |
| --- | --- | --- |
| 이번 npm run typecheck | exit0 | Node24.22.3, 4개 workspace; docs/verification/pr-final/typecheck.log |
| 이번 npm test | 5파일·33개 통과 | docs/verification/pr-final/tests.log |
| 이번 node scripts/verify-m08.mjs | 저장 원본16/16 대조 통과 | pr-final/m08-artifact-validation.log; 이번 UI 재주입 없음 |
| 이번 staged 공백 검사 | 소스·설정·편집 문서 통과; 원본 로그·헤더27개 경고 보존 | pr-final/README.md; 원본 CR/말미 공백을 수정하지 않음 |
| 이번 읽기 전용 리뷰 | Critical0 / Important0 | pr-final/review.md; 최종 승인 문구 갱신 반영 |
| 이전 웹 production·Xcode 빌드·iOS JS export | 성공 로그 확인 | verification/native, m08-m09/ios-export.log; 이번 앱 소스 변경 없어 재실행하지 않음 |
| 이전 실제 iOS API·WebView·cleanup | 성공→장애→복구, 열기·닫기·세션 분리 통과 | iPhone17/iOS27.2 Development Build; verification/native |
| 이전 기준선 측정 | 준비3+본20 성공, 중앙값1.829125ms | metrics/raw; 이전 소스·시뮬레이터 결과, 최신/실기기 성능으로 일반화하지 않음 |
| 이전 M08/M09 | 실제 콜백16/16, 작은 화면·최대 글자·다크 통과 | verification/m08-m09; 표시3건 수정 전후 PNG |
| 이전 HTML 회귀 | 수정 전3실패 → 수정 후3통과 | verification/prototype; 사용자 신청·승인·반려 확인 완료 |
| 이번 사용자 최종 수동 확인 | 화면·스크롤 정상, 1일차 승인 | 2026-11-13 Device Hub 직접 확인 보고 |

- 남은 확인: 1일차 최종 사용자 확인은 완료했습니다. 실기기·Android·VoiceOver·웹 본문 OS 글자 확대 연동·Release 성능은 추가 범위로 미검증입니다. CSS px 웹 본문은 OS Dynamic Type에 연동되지 않습니다. 실제 취소 검증은 준비 왕복 중 수행했고 본 측정 타이밍 경계는 자동 테스트 근거입니다.

### AC 체크 결과

AC 16개 충족, 2개 적용 제외. 아래는 전체 1일차 누적 결과이며 이번 재실행과 과거 실행은 위 표에서 구분했습니다.

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

## 사이드이펙트 검토

| 검토 대상 | 영향·판단 근거 | 대응·남은 확인 |
| --- | --- | --- |
| 기존 기능·호출부·하위 호환성 | 최초 프로젝트, 송수신 계약 공유. 시안 수정은 사용자 요청에 따른 allow-forms 한 토큰 | 원본 백업·실제 Chrome 회귀, 산식 유지 |
| API·데이터·스키마·마이그레이션 | health 읽기 전용 API와 고정 fixture, DB·저장 mutation 없음 | 마이그레이션 불필요, 2일차 미포함 |
| 보안·권한·개인정보·로그 | exact origin/path·스키마 검사, 외부 이동·새 창 차단. 로그에 로컬 경로·시뮬레이터 ID 포함 | 환경·키·도구·빌드 제외, 자격 증명 패턴 검사·리뷰. 공개 저장소는 사용자 명시 요청 |
| 성능·의존성·설정·배포 환경 | Expo 호환 lockfile·Debug 기준선. Next 허용 개발 origin은127.0.0.1 | 실기기·Release 별도, 환경 변경 후 Metro 재시작. 배포 없음 |
| UI·접근성·플랫폼 차이 | 큰 글자 줄바꿈·세로 배치, 금액만 한 줄 맞춤. 이동 도구는 opt-in+__DEV__ | 작은 화면·라이트/다크 및 사용자 스크롤 확인. VoiceOver·웹 Dynamic Type 별도 |

- Breaking change: 없음 — 기존 배포 앱·공개 소비자가 없는 최초 구현입니다.
- 롤백: PR 구현 커밋을 revert하면 빈 main 기준으로 돌아갑니다. DB·저장 데이터 복구는 필요하지 않습니다. .gitmessage가 없어지면 로컬 commit.template 설정을 해제합니다. 로컬 snapshots 백업은 보존됩니다.
