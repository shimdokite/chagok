# 1일차 실행 기록 — 2026-11-13 KST

현재 최신 상태(2026-11-20, 5일차 전체 연결): 로컬 영수증 업로드, 실제 파일 검증, Expo 선택/촬영 코드, 브릿지 상태와 신청 연결 구현. 자동283테스트, 타입, 스타일122파일, 웹 Webpack 및 iOS Debug 빌드 통과. HTTP22회와 iOS 실제 파일 전송22회 성공. 실제 선택창/촬영 조작과 원격 저장소는 미검증이다. [AC/검증](verification/day-05.md), [측정 원본](metrics/daily/day-05.md). 이후의 준비/Task1 문단은 이전 시점 기록이다.

이전 상태(2026-11-20, 5일차 Task 1): 독립 영수증 메타데이터 계약과26개 경계 테스트를 추가했다. 실제 DB 포함 전체258개, 스타일106파일, 타입4개 workspace 통과. [검증과 한계](verification/day-05-contract.md). 촬영/업로드/화면 연결과 실측은 미완료이며 준비 단계 아래 기록은 당시 상태다.

현재 최신 상태(2026-11-20, 5일차 준비): 시작 HEAD `760d43d`에서 [상세 계획](plans/day-05.md)과 [측정 계획](metrics/daily/day-05.md)을 작성했다. 준비만 승인받았으며 제품 구현·테스트·실측은 시작하지 않았다. [준비 검증](verification/day-05-preparation.md)을 마친 뒤 사용자가 알려 주는 잔여 한도로 독립 메타데이터 계약/테스트 단계의 실행 가능성을 판단한다. 아래 HEAD와 완료 수치는 각 과거 작업 당시 기록이다.

현재 최신 상태(2026-11-20): [PR #6](https://github.com/shimdokite/chagok/pull/6)은 2026-11-19 병합 완료. 로컬 main은 `0a66a38`. [병합 후 iOS 재실측·입력·복원 보완 검증](verification/day-04-followup.md)을 수행했다. 아래 기록은 각 작업 당시의 상태다.

최신 상태(2026-11-17): [3일차 구현·AC·수동 확인](verification/day-03.md). commit·push·PR 없음. 아래 2일차 게시 대기 문구는 당시 기록이며 현재 HEAD는 PR #4 병합 이후다.

이전 2일차 누적 상태: [PR 준비 점검·AC·수동 확인](verification/day-02/pr-ready/result.md). 이전 항목은 당시 실행 기록이며, 게시 승인은 아직 대기 중이다.

계획: `docs/plans/day-01.md`. 작업 위치: `/Users/doyeon/Desktop/chagok`.

- A 실행 기반: iOS 시뮬레이터 설치·실행 완료
- B 네이티브 화면·API: iOS 검증 완료
- C 브릿지: iOS 실측 및 취소·재진입 확인
- D 테스트·측정·학습: 기록 완료, 사용자 검토 및 추가 환경 확인 대기

## 결정 기록

- 빈 폴더이며 Git 저장소·AGENTS.md·기존 생성 및 과금 흐름 없음. 요청한 현재 폴더에서 작업하고 브랜치·PR은 사용자 OK 이후 진행한다. 별도 worktree는 만들지 않는다.
- 승인된 지시서가 설계와 구현 계획을 포함하므로 다시 설계 승인을 요청하지 않는다.
- Git 기반 스킬 스크립트 대신 이 파일을 작업 장부로 사용한다. Git 초기화와 커밋은 현재 요청의 승인 이후 PR 단계에 맞춰 보류한다.
- Expo 58 공식 bundledNativeModules를 기준으로 React 19.3 / RN 0.88.1을 맞춘다. 시스템 Node 25는 지원 범위 밖이므로 임시 경로의 Node 24로 검증하고 `.nvmrc`에 24를 기록한다.
- 네이티브 도구가 없어도 RN Web 미리보기로 화면 검토를 제공한다. 브라우저 검증을 Development Build나 RN RTT 실측이라고 표시하지 않는다.
- B→C: origin과 /apply 경로 계약 일치. C→D: requestId와 lifecycle 취소 경계를 공유. 빈 payload·version 1·방향별 메시지 검증 필요.

## 최초 구현 종료 상태 (Xcode 설치 이전)

- A 실행 기반: **코드 완료 / 네이티브 실행 미완료**. npm workspaces, Expo58/RN0.88.1/React19.3/Next16.4.6/tRPC11.28, lockfile, 공개 origin 예시. Xcode 전체 설치가 없어 iOS prebuild 뒤 중단.
- B 화면·실제 API: **구현 완료 / 브라우저 검증 완료 / 네이티브 확인 필요**. 데모 홈, 비활성 Google, 65,000원, 실제 health 성공·중단·복구.
- C 웹뷰·브릿지: **구현 및 자동 로직 검증 완료 / 실제 WebView 확인 필요**. 정확한 origin/path, strict Zod, 수신 등록 후 ready, 안전 JSON injection, 닫기/재로드 정리.
- D 테스트·기록: **자동 검증·학습 완료 / RN 실측 미완료**. 33테스트·타입·웹빌드·Expo20/20·양 플랫폼 JS export 통과. 실제 20회 원본은 없음.

## 구현 중 추가 결정·검증

- Ruling: 앱이 아닌 RN Web 미리보기도 실제 health 조회를 할 수 있도록 development에서만 localhost/127.0.0.1:8081 CORS 허용 — 두 개발 포트가 다르기 때문. production에서는 허용하지 않음. LAN 브라우저 미리보기는 이 allowlist에 없음.
- Ruling: WebView originWhitelist는 `*`로 callback까지 전달하고 onShouldStartLoadWithRequest에서 정확한 origin/path를 검사 — 미일치 URL을 OS 외부 브라우저로 보내는 기본 whitelist 동작을 피함. native 플랫폼 동작은 수동 확인 필요.
- Ruling: 닫힌 측정은 화면 바깥 메모리에 최근 10건 보관 — 취소 증거를 내보내기 위해 필요. 앱 종료/Fast Refresh 후에는 사라지므로 공유 저장 필요. 영구 저장은 추가하지 않음.
- Task A: workspace 설치·실행 문서 완료, native build는 Xcode blocker 기록.
- Task B: 브라우저 로그인·홈·실제 API 오류/재시도 확인, typecheck exit 0.
- Task C/D: 계약·계측 TDD 15실패→28통과, CORS 회귀 1실패→30통과.
- Final: 독립 리뷰 중요 2개 수정 — 늦은 deadline, 취소 원본 보관/실험 취소 상태. 3실패→33통과. Minor 없음.
- Final: native 이벤트 순서/렌더링/HTTP/실측은 판정 보류 — 기기 없음. 브라우저로 대체하지 않음. 인증/DB 등은 합의한 이후 일차이므로 범위 제외.
- Final: 최종 typecheck/test/build:web exit 0 (`verification/commands.json`). 원본 SHA 동일, 민감 패턴 0건.

## 시안 대비 의도한 차이

Google 버튼 비활성·로그인 준비 중, 데모 데이터 표시, 신청 폼 비활성, 내역/안내 준비 중, 가짜 프레임·시계·배터리·담당자 전환 없음. 시안 DOM/Tweak/window.openai는 제품에 복사하지 않음. 담당자 PNG는 참고·보존만 했으며 담당자 기능은 만들지 않음.

## 직접 확인과 다음 시작점

1. `manual-checks.md`의 브라우저 화면을 직접 검토. 현재 localhost:8081과 localhost:3000/apply 개발 서버/탭 제공.
2. Xcode 전체 설치·시뮬레이터·CocoaPods 준비 후 **먼저 1일차 미완료** 실행/웹뷰/cleanup/20회 측정을 마무리.
3. 시안 HTML의 가상 신청→승인·반려 회귀 M12 직접 확인.
4. 사용자 OK 이후만 `feat/day-01-foundation` 브랜치와 PR. 현재 Git 저장소/remote 없음. 원격 대상은 그 단계에서 확인. `pr-draft.md` 준비.
5. 이후 별도 2일차 요청 시 Google OAuth 앱 식별자·공개 client ID·서버 secret 보관 방식과 PostgreSQL 환경부터 확인. 오늘 계정/DB/인증을 만들지 않음.

최초 구현 종료 시 AC는 `acceptance-day-01.md`: 예 8, 아니오/확인 필요 8, 적용 제외 2. **1일차 전체 완료나 실제 기기 성능 확보라고 주장하지 않음. 2일차 구현은 시작하지 않음.**


## Xcode 설치 후 최종 갱신

사용자 요청: “macOS 업데이트와 Xcode 설치했어. 이후 작업들을 진행해줘.” 이후 Xcode 약관은 사용자가 직접 동의했습니다.

- A: macOS 27.2.1/Xcode27.2, CocoaPods1.17.0, iOS27.2 런타임 준비. Debug arm64 앱 빌드·설치·실행 완료. Device Hub에 iPhone17 홈을 유지.
- B: 실제 iOS 로그인/홈과 API 성공→중단→오류→복구 성공 확인. 브라우저 신청 화면도 다시 열어 둠.
- C: 실제 WebView/WEB_READY/웹 닫기 및 native 닫기 확인. 준비 왕복 중 close/reload 취소 원본 보존, 새 세션 20/20 성공.
- D: 기준선 20/20 성공, 중앙값1.829125ms, 최소1.591292ms, 최대3.023959ms. 전체 실험4건 원본 저장 및 대조. 타입·33테스트·웹 production 빌드 통과.
- 추가 수정: useWebViewBridge의 명시적 공개 환경값, .env.example 설명, next.config.ts의 127.0.0.1 개발 origin, globals.css의 iOS 날짜 입력 너비. 제품 기능 확장은 없음.
- 실제 회귀: iOS WebView에서 Next HMR403으로 준비 실패 → 허용할 로컬 host1개를 명시 → WEB_READY/20회 성공. iOS date 컨트롤 overflow → min-width와 appearance 설정 → 화면 내 정상 너비 확인.
- 최종 AC: **AC 문구 기준 충족16 / 적용제외2** (AC15는 수동 확인 필요 명시 조건으로 충족, 실제 M12 회귀 미완료). 시뮬레이터 검증을 실제 기기·Android·출시 성능과 구분.

남은 확인: 사용자의 화면 검토, 실제 기기/접근성/Android/M08 플랫폼별 차단, 승인 HTML M12. PR/브랜치/remote 생성은 여전히 사용자 OK 이후. **2일차 미시작.**


## 1일차 목표 감사 — 2026-11-13 KST

요청: ‘1일차 AC는 모두 완료되었어? AC 외에 1일차 목표 완료했는지도 확인해줘.’ 원문 계획의 오늘 구현11항목, 작업A~D, 수동검증M01~M12, 종료 산출물을 대조했습니다.

| 구분 | 판정 | 근거·남은 일 |
| --- | --- | --- |
| 핵심 흐름 | 달성 | 앱→데모→네이티브 홈→실제 API→WebView→WEB_READY→PING/PONG→닫기→홈을 시뮬레이터에서 실행 |
| 오늘 구현11항목 | 구현 완료 | workspace/도구 기록, Development Build, native 화면/fixture/비활성 Google, 실제 health, 비활성 신청 폼, 4종 메시지, 순차 계측/공유, 로딩/오류/복구 구현 |
| 작업A 실행 기반 | 완료 — 로컬 범위 | 실제 경로/시안 보존/명령/식별자/빌드 기록. Apple/Google 계정의 전역 bundle ID 등록 여부는 미확인, 오늘 배포·인증 범위 아님 |
| 작업B 화면·API | 완료 — iOS 시뮬레이터 | 로그인/홈/한도, 성공→서버 중단→오류→복구 기록 |
| 작업C 브릿지 | 구현 및 주요 흐름 완료, 검증 일부 남음 | 계약·ready·왕복·닫기·재진입 검증. 실제 WebView 외부 URL/잘못된 메시지 주입 M08 미실행 |
| 작업D 테스트·실측·기록 | 산출물 완료, 수동 검증 일부 남음 | 타입·33테스트·웹/iOS 빌드·Expo 진단 기록. 준비3+20회 원본, 환경/소스해시/요약 및 취소 원본. M09와 M12 미완료 |
| 학습·인수 자료 | 작성 완료 | 실제 코드5곳 입력/출력/이유/오류/연습, 용어/질문, README/변경목록/snapshot/다음 시작점. 학습 문서 첫 문단의 오래된 Xcode 미설치 문구 정정 |
| 범위·승인 | 준수 | 2일차 기능 미시작. 사용자 OK 전 브랜치/PR 생성 보류 |

이번 감사에서 측정 당시 source manifest45개 파일과 현재 파일의 해시 일치를 다시 확인했습니다. 필수 산출물12개 존재와 기준선 준비3개/본20개/성공20/ID 유일성/중앙값/소스해시를 재대조했습니다. 기존 실행 로그를 검토했으며 이번 턴에 UI 테스트·빌드를 다시 실행한 것은 아닙니다.

AC15는 원문이 ‘회귀 확인 또는 수동 확인 필요 명시’를 허용하므로 충족16/적용제외2로 정정합니다. **AC 판정 충족과 모든 수동 테스트 실행 완료는 별개입니다.** 1일차를 검증까지 완전히 닫으려면 M08, M09(네이티브 작은 화면·글자 확대·다크), M12를 마무리해야 합니다. M12는 문서상 보류가 허용됩니다. 실제 iPhone·추가 OS·Release/production 성능은 이후 검증이며 오늘 미완료로 추가하지 않습니다. 사용자 화면 승인과 PR은 별도의 인수 단계입니다.


## AC15 제출 결함 수정 및 M12 실행 완료 — 2026-11-13 KST

사용자 보고: 영수증 미첨부 시 안내 없음, 샘플 첨부 후 신청 무반응. 후속 요청으로 원본 작업 파일 수정·검증을 명시적으로 승인했습니다. 앞선 원본 미수정 조건은 이번 요청에 한해 예외이며, 이전 기록은 당시 상태입니다.

- 계획: 원본 백업 → 실제 브라우저 실패 재현 → iframe allow-forms 1개 추가 → 동일 회귀 → 문서·학습 갱신 → 사용자 테스트 탭 제공.
- 수정 전 Chrome에서 3시나리오 모두 실패, 콘솔에 sandbox allow-forms 미설정으로 제출 차단 기록.
- 수정 후 Chrome 157.0.8103.78에서 3/3 통과: 영수증 누락 안내, 20,000원 신청 후45,000, 승인 후45,000 유지, 별도 초기 상태의 반려 후65,000 복원. 반려 사유 필수 및 직원 내역·사유도 확인. console/page error0.
- 기존 `npm test` 재실행 5파일/33개 통과. HTML 권한만 바뀌어 타입·앱/웹 빌드는 재실행하지 않음. 새 성능 측정은 하지 않음.
- `docs/design/chagok-prototype.html`의 변경은 allow-forms 토큰뿐. 수정 전 원본·전후해시·차이는 `docs/verification/prototype/`에 보존. 지시서·PNG·앱 소스 변경 없음.
- M12는 실제 Chrome 회귀 완료, 사용자 수동 재확인은 대기. AC15는 사용자 승인 예외를 반영해 충족. M08/M09와 사용자 최종 화면 승인은 별도.
- 127.0.0.1:3015 시안 서버 실행, 승인/반려 독립 초기 상태 탭 제공. 절차는 manual-checks.md. PR은 사용자 OK 이후, 2일차 미시작.

## AC15 사용자 수동 확인 완료 — 2026-11-13

> “직접 테스트해봤고 신청·승인·반려 모두 정상 동작해. AC15는 완료로 정리하고, 1일차에서 아직 확인하지 못한 항목들을 알려줘.”

- AC15/M12: 자동 회귀와 사용자 신청·승인·반려 수동 확인 완료. 앞선 사용자 재확인 대기 기록은 당시 상태입니다.
- 1일차 명세의 남은 수동 검증: M08 실제 WebView의 잘못된 메시지·외부 이동 차단, M09 네이티브 작은 화면·OS 글자 확대·다크 모드.
- 검증 한계: M06/M07 취소는 실제 준비 왕복 중 검증했고 본 측정 타이밍 경계는 자동 테스트 근거입니다. 모든 타이밍의 기기 수동 재현은 미실행입니다.
- 추가 환경 검증: 스크린리더, 실제 iPhone, Android·하드웨어 뒤로 가기, Release/production 성능. 1일차 필수 OS 한 곳의 Development Build 실행과 구분합니다.
- 실제 앱 화면 최종 승인과 PR 인수 단계는 별도. 이번 AC15 확인을 전체 PR 승인으로 해석하지 않음. 2일차 미시작.
- 이번 작업은 문서 5개 상태 갱신이며 소스 변경·테스트 재실행 없음.


## M08·M09 검증 종료 — 2026-11-13 KST (최신 상태)

> “그럼 남은 M08과 M09도 직접 검증하고 결과를 기록해줘. 문제가 발견되면 수정하고, 내가 직접 확인해야 하는 부분은 따로 알려줘. 2일차는 아직 시작하지 마.”

- M08 완료: 실제 iPhone 17 WKWebView에서 잘못된 메시지8종, 금지 이동4종, 새 창2종, 미대응/마지막 PONG2종을 실행. 실제 콜백16/16 및 전후 ready/running/result/error 불변을 JSON과 검증 스크립트로 대조했습니다.
- M09 완료: iPhone 13 mini 360×780pt 및 iPhone17, 기본/최대 OS 글자, light/dark에서 실제 화면 관찰. 탭 글자 겹침·잔액 줄바꿈·최근 신청 제목 눌림을 재현하고 수정 후 다시 확인했습니다.
- UI 자동화의 좌표 입력이 불안정하여 로컬 opt-in 개발 버튼으로 실제 ScrollView/WebView를 이동했습니다. 내용 도달/표시와 직접 스크롤 사용감은 구분합니다. 검증 종료 후 버튼 숨김, 기본 글자/라이트 복원, Mini 홈을 확인했습니다.
- 최종 검사: typecheck exit0, 단위 테스트5파일/33개 통과, M08 원본 대조16/16, iOS production JS export 성공. 처음 추가한 ScrollView ref 타입 오류는 ComponentRef로 수정하고 재검사했습니다. 실패 로그도 보존했습니다.
- 성능 기준선20/20·중앙값1.829125ms는 이전 측정 그대로 보존합니다. 새 성능 측정은 하지 않았습니다. 이번 소스는 별도 manifest로 구분합니다.
- AC16개 충족/2개 적용 제외 유지. M08/M09/M12를 포함한 1일차 명세 검증 목록 완료. 실제 화면 최종 승인과 직접 스크롤 사용감은 사용자 확인 사항입니다. 실기기/Android/VoiceOver/웹 본문 Dynamic Type/Release 성능은 추가 범위입니다.
- Chrome의 RN Web 홈8082를 열어 렌더링 확인. 초기 빈 화면은 새로고침 후 정상 표시됐습니다. 기존 native8081/Next3000도 유지합니다.
- 증거: `verification/m08-m09/README.md`, 실제 JSON·전후 PNG·로그. 개념 설명: `learning/day-01.md` 마지막 절. Git 저장소/remote 없음, PR 사용자 승인 전 보류. **2일차 미시작.**

이 절이 앞선 M08/M09 미완료 기록을 대체하는 최신 상태입니다. 앞선 날짜별 기록과 원본 측정 자료는 당시 사실로 보존합니다.


## 사용자 최종 확인 — 2026-11-13 (Asia/Seoul)

> “Device Hub에서 직접 확인했고 화면이랑 스크롤 모두 정상 동작해. 1일차 최종 확인 완료로 기록하고, PR을 올리자.”

Device Hub 실제 화면과 정상 스크롤 사용감의 사용자 확인을 완료했습니다. 1일차 최종 인수를 완료로 기록하며 브랜치·push·PR 생성 승인을 받았습니다. 실기기·Android·VoiceOver·웹 본문 Dynamic Type·Release 성능은 추가 범위입니다. 2일차는 시작하지 않습니다.


## 1일차 PR 게시 완료 — 2026-11-13 (Asia/Seoul)

- 사용자가 GitHub CLI 인증을 완료하고 공개 저장소 생성을 명시적으로 요청했습니다.
- 공개 저장소: https://github.com/shimdokite/chagok
- PR: https://github.com/shimdokite/chagok/pull/1 — feat/day-01-foundation → main, OPEN, 미병합.
- main은 비교 기준용 빈 초기 커밋, PR은 1일차 전체 구현·검증·학습·저장소 지침입니다.
- PR 직전 typecheck·33테스트·M08 저장 원본16/16 대조 통과. 읽기 전용 리뷰 Critical0/Important0.
- 환경 파일·설치 도구·빌드·로컬 압축 백업은 Git 제외. 이번 앱 소스 변경 없음.
- PR 본문에 사용자 피드백/최종 승인 인용과 AC18행(충족16/제외2)을 포함했습니다. 원격 CI는 설정되어 있지 않아 로컬 검증과 구분합니다. 2일차 미시작.


## 2일차 계획 보완 — 2026-11-16 (Asia/Seoul)

- [2일차 계획](plans/day-02.md)을 추가했습니다. 기존 Google 인증·사용자·세션·로그아웃 목표를 유지하고 Next.js 신청 화면의 Tailwind CSS·shadcn/ui 도입 범위를 명시했습니다.
- 범위·시안·브릿지 경계와 하루 5~6시간 예산을 점검했습니다. 입력·첨부·제출은 비활성으로 유지하고, UI 작업 추가에 따른 일정 압박을 기록했습니다.
- 자동 검사·브라우저/iOS 회귀·수동 확인·PR 준비 완료 기준은 향후 수행 항목이며 현재 미검증입니다.
- 이번 작업은 문서 계획 보완입니다. 패키지 설치·설정·앱 소스 수정·테스트 실행·서버 기동·학습 폴더 추적 제거·2일차 구현은 하지 않았습니다. 커밋·PR 게시도 수행하지 않았습니다.

## 2일차 구현·검증 — 2026-11-16 (현재 상태)

- 사용자 요청에 따라 handoff·관련 문서·기존 diff를 확인하고 파일/접근/AC 계획을 먼저 공유한 뒤 2일차 범위만 구현했다. Google 네이티브 로그인 교환, 서버 검증, PostgreSQL/Prisma User·Session, SecureStore 저장/복원/만료/로그아웃과 오류 재시도, Tailwind/shadcn 신청 UI를 추가했다.
- 사용자가 OAuth/DB 준비 “없음”이라고 답했다. 개발용 PostgreSQL18.6은 로컬에 준비했고 실제 DB 테스트는 통과했다. 실제 Google 로그인·인증된 앱 복원10회는 client ID 준비 전까지 미검증/미측정이다.
- 타입 검사·실제 DB 포함10파일60테스트·웹 production·iOS signed Debug 빌드 통과. 빈 migration, foreground 화면 이탈, timeout 분류, 웹 미리보기8082 CORS, unsigned Keychain entitlement 문제를 발견해 수정/재검증했다.
- 브라우저320/360px와 mini light/dark·터치 스크롤·disabled 폼·web/native 닫기·재진입·WEB_READY·왕복20/20을 확인했다. 재로드 시간 초과1회는 재시도로 복구했으나 원인 미확정으로 보류한다. 의도적으로 서버를 중단한 오류 화면은 서버 재시작 후 재시도→WEB_READY로 복구했다.
- 측정은 인증 복원0표본과 별도 브리지 원본20개를 구분했다. 브리지 원본의 기존 sourceRef 값은 수정하지 않고 별도 환경 파일에 실제 소스 manifest를 결합했다. 이전 대비 성능 개선을 주장하지 않는다.
- [실행 AC/사용자 확인](verification/day-02.md), [측정](metrics/daily/day-02.md), [인증 설정 재개](verification/day-02/auth-setup.md)를 작성했다. 로컬 2일차 학습을 추가했고 기존 1일차 학습·시안·측정 해시는 그대로 보존했다.
- **2일차 전체 완료 아님.** 다음 시작점: OAuth 두 client ID 설정→native 재빌드→실제 로그인/취소/동일 계정·복원/만료/로그아웃 검증 및 정상 복원10회, 남은 포커스/재로드 안정성·사용자 확인. 3일차 기능, commit/push/PR, 학습 추적 제거는 수행하지 않았다.

## 2일차 OAuth 설정 후속 검증

두 환경 파일의 ID 형식/일치·callback scheme 검사, signed iOS 재빌드/설치, 타입 검사와 실제 DB 포함60테스트를 통과했다. Google 안내 취소→로그인 화면 복귀→재시도→계정 입력 화면까지 확인했으며 사용자 입력 대기다. 실제 성공·동일 회원 재사용·복원10회·만료·로그아웃·장애 복구는 이어서 검증한다. [현재 AC와 증거](verification/day-02/oauth/result.md). 런타임 코드 추가 변경·커밋·push·PR·학습 추적 제거 없음.

### 실제 Google 로그인 이후 검증

사용자 로그인 완료 후 인증 홈/DB User1·Session1을 확인했다. 프로세스 재실행10회 홈 복원, 서버 중단 시 인증 접근 차단·복구 후 동일 세션 retry, 로그아웃 후 Session0·User1·재실행 로그인 화면을 확인했다. 동일 계정 재로그인 계속 버튼은 좌표 제어 오류로 사용자 입력 대기이며 만료와 duration journal export는 미완료다. [현재 결과](verification/day-02/oauth/result.md).

최신 후속 상태: 동일 계정 재로그인에서 기존 User1 재사용/새 Session1 생성, 해당 검증 세션1건만 만료 후 재로그인 안내 확인. 인증 시나리오 검증은 완료했으며, 측정 공유창 Copy의 사용자 조작과 duration 원본 추출·통계가 남아 있다.

최종 OAuth 후속 결과: 사용자 Copy 완료 후 원본17개 저장, 정상 startup10/10 성공·중앙값225.98ms·범위140.14~858.87ms, 독립 재계산 일치. A1~A6 모두 충족. 앱은 만료 검증 후 데모를 종료한 로그인 화면이다. 실제 인증·측정은 완료했으며 기존 WKWebView 포커스·재로드 안정성·전체 UI 사용자 인수와 PR 준비는 별도 대기다.

## WKWebView 후속 최종 상태 — 2026-11-16

사용자가 Option+Tab으로 웹 닫기 버튼 포커스·Space 홈 복귀를 확인했다. 일반 재로드10/10, 준비 대기 중 연속5회 후 WEB_READY, 닫기/재진입, 서버 무응답 오류→재시도 복구와 왕복20/20, 측정 중 reload 취소를 확인했다. 이번 타입·실제 DB60테스트·웹 빌드 통과. 앱 결함을 재현하지 못해 코드 수정은 없고 과거 timeout1회 원인은 미확정으로 보존한다. [AC W1~W5·근거·한계](verification/day-02/wkwebview/result.md).

2일차 구현 및 요청한 검증·측정·학습 기록을 마무리했다. 전체 UI 인수/PR 승인은 별도이며 학습 추적 제거·commit·push·PR은 수행하지 않았다. 최신 화면은 mini 데모 신청/WEB_READY, Capture Keyboard off이며 브라우저 신청 화면도 열어 두었다.

## 오류 원인 재조사 후속 — 2026-11-16

이전 “검증 완료”는 실행 시나리오 통과를 뜻하며 과거 오류의 원인 규명 완료가 아니었다. 오류 종류를 같은 화면으로 표시하고 원인별 콜백 시각을 남기지 않은 공백을 보완했다. 당시 시스템 로그에서 loadRequest→탐색 시작7.792초, HTTP200, 첫 표시12.46초, 앱 close 뒤 프로세스 종료를 확인했다. 초기화/준비 지연에 의한15초 예산 소모가 가장 유력하나 당시 JS timer/WEB_READY 로그가 없어 마지막 오류 분기는 미확정이다.

개발 도구에 개인정보 없는 revision·로드·ready·타이머·구분된 오류 계측을 추가했다. 실제 WebContent 종료와 서버 무응답 timeout15,001.894ms를 구분했고, 중첩3회 재로드에서 이전 timer 해제·마지막 ready13,637.746ms를 확인했다. 최종 타입·실제 DB64테스트·실제왕복20/20 통과. [원인별 증거·AC·한계](verification/day-02/timeout-investigation/result.md). 과거 원인 완전 확정·수정 완료로 표시하지 않으며 전체 UI 인수·PR 준비는 별도다.

## 종료 기록 수정 후속 — 2026-11-16

웹 닫기는 이동 전 공통 close 기록을 통과하고 unmount는 마지막 committed revision을 남기도록 수정했다. 대상7개/전체71개 및 타입 검사를 이번에 실행해 통과했다. 동기 hook host의 자동 검사이며 이번 native OS/React 동시성 실측은 아니다. 화면 구성 변화가 없어 새 서버·브라우저 열기는 해당 없음이다. [이번 AC·증거·한계](verification/day-02/trace-close/result.md). 과거 타임아웃 분기 미확정과 과거 실측 원본은 유지한다.

## iOS 종료 실측 완료 — 2026-11-16

Simulator 실제 native app/WKWebView에서 웹 재로드2회 후 close2→unmount2, native 재로드3회 후 close3→unmount3을 각각1회 확인했다. 웹 클릭은 도구 오류로 사용자가 수행했고 로그/홈 상태는 도구로 검증했다. native 클릭은 도구로 수행했다. 종료 직후 준비 timer도 해제됐으며 이벤트 누락·중복/오류는 없다. 임시 로그 sink를 제거하고 앱/패키지82파일 시작 해시 일치, 최종 타입/실제 DB71테스트 통과. [원본·AC·한계](verification/day-02/native-close/result.md). 물리 iPhone/Release/모든 동시성 검증은 아니며 과거 타임아웃 분기 미확정은 유지한다. 추가 사용자 조작 대기는 없다.


## 3일차 — 2026-11-17

- 승인 범위를 docs/plans/day-03.md에 작성하고 기존 코드 컨벤션을 적용했다. 기존 컨벤션 변경/handoff/학습/과거 자료 보존, 현재 폴더에서 작업, staging/commit/push/PR 없음.
- Task1: 회사·소속·월 정책·신청 스키마, 실제 세션 검증 읽기 API, 로컬 seed/link 및 통합 테스트 구현. 두 마이그레이션 적용·기존 데이터 보존.
- Task2: TanStack Query5.107.1, 서버 세션의 회사ID를 키에 포함, 30초 메모리 캐시/취소/세션 및 회사 변경 정리.
- Task3: 실제 홈·월/상태 내역·상세 반려 사유·정책 안내, 명시적 상태·재시도, 익명 데모와 개발용 DB 샘플 구분. 비활성 신청 유지.
- Task4: 타입·스타일·실DB 포함130테스트·webpack 빌드·양 플랫폼 JS export, 브라우저 및 iOS 데모 탐색·WebView 열기/닫기, 실제 HTTP1→0→1/1002B 측정. 최초 에이전트 기본 Turbopack 실행은 포트 EPERM으로 실패했으며, 후속 사용자 일반 터미널 실행 로그에서 성공 확인.
- 독립 리뷰 P2 두 건: 소속 변경 시 과거 신청 cascade, 내역 페이지 company 변화 미반영. RED 확인→ON UPDATE RESTRICT와 응답 소속 검증/캐시 초기화→GREEN. 상세 오류 시 오래된 본문도 숨긴다.
- 결정: auth 응답에 companyId를 추가해 별도 소속 API 없이 안전한 캐시 키를 구성했다. 소속 이동 기능은 만들지 않고 이력이 있는 소속의 회사 변경은 거부한다. 과거 이력 이전이 필요하면 별도 모델 설계 비용이 든다.
- 후속 확인: 실제 Google 계정·명시적 그로브 연결 후 조회/네트워크 복구는 개발자 확인, 계정 전환 정보 격리·최대 글자 홈/반려 상세/복지안내·카테고리 여백·Light/3 복원 후 홈은 사용자 확인 완료. 기본 Turbopack 성공은 사용자 제공 로그로 확인. [근거](verification/day-03/followup/user-confirmation.md).
- 승인된 AC: D3-07 포함8개 충족. 원래 기준은 회귀·타입·스타일·빌드와 브라우저/iOS 화면 확인이며 Android 실제 실행을 필수로 요구하지 않는다. 별도 플랫폼 검증: Android 휴대폰·에뮬레이터 부재로 실제 실행 미검증 유지. 이번 문서 정리에서 코드 변경·앱 테스트 재실행·staging·commit·push·PR 없음.


## 3일차 PR 준비 — 2026-11-17

- 원격 main과 HEAD 4be4ffb 일치 확인. 기존 누적 구현·컨벤션·카테고리 변경과 신규 파일을 함께 리뷰했다.
- P2 상세 NOT_FOUND→세션 복원→재활성화 반복을 재현하고 한 번만 확인하도록 수정했다. 이후 UNAUTHORIZED 인증 복구는 항상 수행하며 두 실패 경로의 RED→GREEN 및 독립 재검토를 완료했다.
- 최종 실제 DB 포함156개·타입4개 workspace·간격88파일·webpack·iOS/Android JS export 통과. 에이전트 기본 Turbopack은 포트 EPERM으로 실패했고 이전 사용자 일반 터미널 성공과 구분한다.
- 학습 파일은 이미 2일차 PR #4에서 추적 제거가 병합돼 추가 git rm이 필요 없었다. 로컬3개 해시 보존·tracked0·제외 규칙 확인. handoff와 학습 본문은 게시 후보에 포함하지 않는다.
- [최종 점검](verification/day-03/pr-ready/result.md), [누적 PR 초안](changes/latest-pr.md), [커밋 초안](changes/latest-commit.txt). 예정 브랜치 feat/day-03-benefits → main, 현재 main 유지. staging·commit·push·PR 생성 없이 사용자 최종 검토를 기다린다. D3-01~08 충족, Android 실행은 별도 미검증.

## 4일차 서버 단계 — 2026-11-19

- 사용자 선택1에 따라 서버 단계만 완료했다. [상세 계획](plans/day-04.md), [AC와 실제 검증](verification/day-04.md). 폼 연결과 실측은 다음 단계이며 4일차 전체 완료가 아니다.
- `benefits.create`에 세션/소속 기반 권한, 월 정책/정수 금액/실제 날짜 검증, 소속 행 잠금과 한도 확인·저장 트랜잭션, 사용자별 요청 키 재전송 처리를 추가했다. nullable 키와 unique index migration으로 기존 행을 유지했다.
- 실제 DB 포함20파일200테스트 skip0, 스타일91파일 위반0, 4개 workspace 타입, webpack production 빌드 통과. 환경 접속 실패/DB 정지, 반려 fixture 사유 누락, 리뷰에서 찾은 특수 문자 입력 문제를 구분해 재현·수정·재검증했다.
- DB6개 테이블 기존 행 해시 일치. 빌드가 변경한 next-env는 시작 바이트로 보존했다. 기존 학습/인계 자료를 유지하고 로컬 학습을 추가했다. 초안 두 파일 갱신, commit/push/PR 없음.
- [측정은 표본0·미실행](metrics/daily/day-04.md). 다음 시작점: `/apply`와 RN 인증/브릿지 연결 설계 → 초안당 요청 키 유지 → 성공 후 Query 갱신 → 브라우저/iOS 확인 → FORM_READY 정의와 실측. 사진은5일차, 승인/반려는6일차에 남긴다.


## 4일차 폼 연결과 실측 — 2026-11-19

- 기존 서버 단계 뒤 사용자 요청으로 남은 폼을 연결했다. 앱이 보안 저장소 인증으로 API를 호출하며 웹에는 토큰을 전달하지 않는다. 정책/잔액/입력 확인, 제출/불명확 재시도/성공, 홈과 내역 갱신을 구현했다.
- 독립 리뷰의 회사 전환 경계, foreground 동일 세션, HTTP UUID, 과거 정책 재조회, 불명확 저장 캐시, 진단 본문 노출을 RED→GREEN으로 수정했다. 초기 연결 timeout과 복원된 미확정 문서도 안내한다.
- 최종 실제 DB24파일228테스트 skip0, style102파일 위반0, 타입4개 workspace와 webpack production 빌드 통과. [AC와 실제 실행](verification/day-04-form.md).
- 브라우저와 실제 iOS WebView에서 각각 준비1회+본10회 저장 성공. [측정 원본/환경/한계](metrics/daily/day-04.md). 결과 유실 재시도는 별도 장애 실험으로 기록했다. 최종 가상 데이터 삭제와 iOS 기존 로그인 저장값 재조회 복구를 확인했다.
- 로컬 학습을 확장하고 서버 단계의 기존 근거와 답변을 보존했다. PR/커밋 초안 갱신, staging/commit/push/PR 없음. 개발 서버와 신청 미리보기 탭을 제공했다.
- 사용자 수동 화면 확인 대기. 영수증은5일차, Android/실기기/Release와 실제 OS BFCache 및 키보드 전체 흐름은 별도 검증이다. 과거 서버 단계의 표본0을 현재 상태로 오해하지 않도록 후속 링크를 연결했다.


## 4일차 전체 PR 준비

사용자 확인 후 서버·폼 전체 범위를 검토했다. 독립 리뷰에서 발견한 화면 종료와 저장 후 캐시 갱신 경합을 수정하고 실제 DB232테스트·스타일103파일·타입4개 통과, 웹 빌드·migration 최신을 확인했다. 학습/인계/생성 타입 경로는 로컬 보존하며 제외한다. feat/day-04-claim-flow에서 승인된 commit·push·PR을 진행하고 실제 게시 결과는 완료 응답으로 제공한다. [전체 검증](verification/day-04-pr.md).

## 4일차 병합 후 보완 — 2026-11-20

- PR #6 병합 완료, main `0a66a38`. 이전 절의 PR 준비/화면 확인 대기는 당시 기록이다.
- 최종 제품 코드로 iOS 준비1+본10 성공. 준비 중앙2156.9ms/제출33.0ms. 이전 원본을 유지하고 [별도 결과](metrics/daily/day-04.md)를 추가했다.
- 실제 DB 잠금 중 제출·닫기 후 저장12건/홈88,000원 및 늦은 응답 폐기 확인. 사용자 직접 입력·제출 후 홈87,000원과 DB13건을 확인했고 원래 세션/가상 데이터 정리 완료.
- Chrome production에서 실제 BFCache 왕복2회와 정책 재연결/입력 유지/미확정 재제출 차단 확인. iOS WKWebView의 BFCache 자체 검증으로 확대하지 않는다.
- 검증 도구 실패 정리2건 보강, 실제 실패 주입에서도 세션 복구/fixture 정리 성공. 최종232테스트·스타일104파일 위반0, webpack production 빌드 통과.
- 제품 기능 변경 없이 검증 도구와 기록만 보완했다. 새 commit/push/PR은 수행하지 않았다. Android·실기기·Release 검증, 완전 종료 뒤 초안 영구 복구는 별도 범위다.

## 5일차 준비 — 2026-11-20

- 사진 선택/촬영, 권한, 비공개 업로드, 브릿지, 신청 연결을 5개 단계로 나누고 전체 AC 8개와 검증 7묶음을 작성했다. 파일 정책과 저장소 방식은 구현자 제안으로 표시했다.
- 독립 메타데이터 계약을 다음 작은 후보로 정의했다. 패키지 설치/DB 변경/화면 연결 없이 진행할 수 있으나 사용자 잔여 한도 전달 후 판단하며 아직 착수하지 않는다.
- 측정은 표본0이며 시간 경계, 고정 fixture, 환경과 원본 기록 방법만 작성했다. 구현·앱 테스트·빌드·서버 실행·브라우저 검증은 이번 문서 작업에서 수행하지 않았다.
- 준비 검증/최신 초안을 작성했다. 기존 생성 타입 변경, 인계 파일과 과거 학습 자료를 보존하며 학습은 계속 Git 제외다. commit/push/PR 없음.

## 5일차 Task 1 — 메타데이터 계약

- `@chagok/contracts/receipts`로 strict MIME/정수 바이트 계약과 타입/상한을 제공한다. 기존 신청·브릿지 입력은 변경하지 않았다.
- 공개 export 부재로 RED 확인 후26개 GREEN. 전체 첫 실행은 로컬 DB EPERM으로17실패/241통과였고 허용 환경 재실행에서258통과/skip0을 확인했다.
- 기존 사용자 변경을 보존하고 로컬 학습, 계획, 측정 상태와 최신 초안을 갱신했다. 실측 표본0, 화면 변화 없음, commit/push/PR 없음. 다음 시작점은 Task 2 저장소와 실제 파일 검증 설계 확정이다.


## 5일차 검증 재개 — 2026-11-23

- 기존 DB/웹/Metro 복구, 브라우저 신청 미리보기 확인. 현재 코드로30파일283테스트, 스타일122파일 위반0, 타입4개 workspace 통과.
- 새 로컬 HTTP22/22회 성공, JPEG/PNG 각본10회 중앙16.40/13.60ms. 생성 첨부22건 정리/실패0. 과거 환경과 성능 비교하지 않는다.
- Device Hub 화면은 조회되나 앱 클릭이 noWindowsAvailable로 실패해 사용자 다시 시도/사진 선택 조작 대기. 실기기 가능 여부도 확인 대기다.
- picker/prepare/웹 ACK 계측은 코드 추가가 필요하다. 원격 저장소, 예약 정리, Android/Release와 전체 앱 흐름은 미완료 유지. [이번 검증](verification/day-05/followup/result.md).
- 제품 코드 변경/커밋/push/PR 없음. 최신 초안은 이번 후속 검증 범위로 작성한다.


### 2026-11-23 — 로그인 후 5일차 앱 흐름 확인

- 에이전트가 iPhone17/iOS27.2에서 시스템 사진 선택/취소, PNG 업로드, 교체 취소 시 기존 첨부 유지, JPEG 교체, 삭제/PNG 재선택을 직접 확인했다.
- 테스트 신청1건(1,000원), 최종 첨부 LINKED, 홈 잔여65,000→64,000원과 신청 내역 반영 확인. 저장 파일3/3 원본 바이트 일치. 테스트 신청과 첨부3건은 로컬 보존했고 READY2건은 기존24시간 정리 대상이다.
- [최신 AC/근거/한계](verification/day-05/followup/result.md). 제품 코드 변경 없음. 실제 촬영/권한, 장애 복구/진행 중 종료 UI, picker/prepare/ACK 계측, 원격 저장소/예약 정리와 Android/Release는 남아 있다. 입력 포커스 후 확대/오른쪽 잘림도 후속 확인 대상으로 기록했다.


### 2026-11-23 — 영수증 구간 계측과 실제 표본

- 앱 단일 시계의 picker/prepare/upload/ACK 계측, 개발 전용100표본 JSON과 패널, strict RECEIPT_ACK 구현. 늦은 ACK/동일 request 재사용 회귀 보완.
- 전체291테스트/스타일127파일/타입4 workspace/웹 빌드 통과. 빌드 동시 실행의 기존 테스트1건 timeout과 단독 재실행 성공을 각각 기록했다.
- iPhone17 Simulator에서 JPEG/PNG 각각 준비1+본10회, 취소1회, ACK23건. 준비/업로드/ACK 중앙값 JPEG6.95/67.88/2.55ms, PNG6.45/100.40/2.24ms. picker 조작 대기 포함, 일부 빌드/테스트 병행으로 성능 개선 근거는 아니다.
- 파일22/22바이트 일치·READY·0600, 신규 신청0, 삭제0. 실제 촬영/실패 복구 UI/원격 저장소/예약 정리/Android·Release는 남는다. [이번 AC/근거](verification/day-05/timing/result.md). commit/push/PR 없음.


### 2026-11-23 — 업로드 실패·종료·재연결 UI 검증

- 응답 지연35.32초 오류 후 기존 첨부 유지와 재시도, 업로드 중 닫기/재진입, 웹뷰 reload 후 새 첨부 성공을 직접 확인했다. R1~R4 충족.
- 관련45테스트·스타일127파일 통과. Next 일시정지3회 전부 자동 재개, Next/Metro HTTP200. 제품 코드 변경 없이 검증·측정·학습·초안을 갱신했다.
- 이번 표본7건: 성공4/오류1/중단2. DB 첨부4건 READY·바이트 일치·신규 신청0, 로컬 보존. [상세](verification/day-05/recovery/result.md).
- 실제 세션 변경/서버 오류 코드별 UI, 실기기 카메라/권한, 원격 저장소/예약 정리와 Android/Release는 남는다. commit/push/PR 없음.


### 2026-11-24 — Day5 오류와 세션 경계 후속

실제 iOS 앱에서401/403/413/500/503 오류 안내·기존 PNG 보존, 복구 후 JPEG 성공을 확인했다. 테스트16개를 추가해 세션 구독의 만료/회사 변경 취소, 동일 세션 유지, 실제 DB 만료/소속 변경 및 본문 전송 중 재검증을 확인했다. 최종307테스트·스타일128파일·타입4 workspace 통과. [검증/남은 항목](verification/day-05/errors/result.md). 새 합성 첨부1건·신청0, 임시 API 원복. 실제 계정 변경 전체 UI, 실기기/권한, 원격 운영, Android/Release는 미검증. commit/push/PR 없음.


## 2026-11-24 — Day5 추가 로컬 검증

별도 임시 DB에서 실제 정리 CLI의100건 제한/실패 재시도/최신·연결 첨부 보존을 확인했다. 운영 로컬 저장소 차단 테스트3개 추가 후310테스트/스타일128파일/타입4 workspace 통과. iOS Simulator Release 빌드와 Android production Hermes export 통과. 시뮬레이터에서 카메라 권한 실제 거절→재시도→사진 선택 취소까지 직접 확인해3표본을 추가했다. [AC별 결과와 남은 환경](verification/day-05/local/result.md).

제품 소스/설정/스키마 변경 없음, 기존 DB 새 첨부0/신청0. 카메라 권한은 거절 상태. 실기기 촬영/설정 복귀, 실제 계정 전환 UI, iOS Release 실행/Android native 실행, 원격 저장/운영 예약은 남아 있다. 학습은 로컬 보존, 최신 초안 갱신, commit/push/PR 없음.


## 2026-11-24 — iOS Simulator Release 실행 확인

Release 클라이언트의 기존 로그인 복원·홈·신청 WebView·사진 선택/취소·합성 PNG 업로드·권한 거절 안내와 첨부 보존을 확인했다. Metro를 약51.32초 멈춘 동안에도 앱 프로세스를 재실행해 홈과 신청 화면이 열렸고 Metro는 정상 재개했다. 최초 CODE_SIGNING_ALLOWED=NO 산출물의 Keychain -34018 오류는 시뮬레이터 ad-hoc 서명을 적용한 재빌드로 해소했다. 제품 소스/설정 수정 없이 동일 JS 번들로 검증했다. [실패·성공·AC 상세](verification/day-05/release/result.md).

이번 관련20테스트·스타일128파일 위반0, Release 빌드/서명/설치 해시 대조 통과. 기존 DB/30파일 보존, 새 PNG1건 READY·원본 동일·0600, 신청0. Release에서는 개발 journal이 늘지 않았다. 현재 앱은 Release/로그인된 새 신청 화면이며 카메라 거절 상태다. 실기기 촬영·허용 복귀, 실제 계정 전환 UI, Android native, 배포/원격 저장/운영 예약은 남는다. 학습 로컬 보존, 초안 갱신, commit/push/PR 없음.

## 2026-11-24 — Android 환경과 Release 실행

Java17·SDK/NDK·Gradle·Android Studio·Pixel7/API36 ARM64 에뮬레이터 준비, 원본 Release 빌드/서명/설치와 데모 홈·내역·정책 탐색을 확인했다. Metro 중지 중에도 로그인 화면과 데모 홈이 실행됐다. A1/A2/A4 충족, A3 미충족: 신청 WebView는 Android 메시지 출처 형식과 /apply 검사 불일치로 연결 실패한다. OAuth 미등록으로 로그인/사진/업로드는 미검증이다. [결과와 다음 작업](verification/day-05/android/result.md).

관련23테스트·스타일128파일0위반. 임시 Android HTTP/Next 허용/웹 진단 코드 복구, 기존 DB4테이블/영수증31파일 동일·새 신청/첨부0. 현재 에뮬레이터는 로컬 HTTP 진단용 Release 데모 홈이다. 실제 기기·배포·원격 저장/예약 정리는 남는다. 로컬 학습과 최신 초안 갱신, commit/push/PR 없음.


## 2026-11-25 — Android 로컬 연결·신청 브릿지 수정

명시적 local Release 네트워크 설정과 Next 개발 origin 허용을 재현 가능한 명령으로 정리했다. Android origin-only 메시지를 활성 /apply 문서와 함께 검증하고, 고정 WebView 패치로 직접 하위 프레임 송신을 차단했다. 실제 WEB_READY 뒤 동일 URL history 이벤트가 다시 초기화하던 두 번째 원인도 수정했다.

AC1~4 충족: 최종333테스트/36파일, 타입4 workspace, 스타일132파일0위반, Release 빌드/서명/설치 해시 일치. 에뮬레이터에서25초 안정성·hard reload·다른 경로 차단·정상 웹/네이티브 닫기·재진입·서버 복구 후 재시도 확인. 기존 DB4테이블/영수증31파일 동일, 임시 fixture/로그 제거, 학습 로컬 제외 유지. Android OAuth/실제 영수증·실기기·원격 운영은 미검증. 구형 WebView는 연결을 거부하는 호환성 제한이 있다. commit/push/PR 없음.

[상세 결과](verification/day-05/android-fix/result.md).
