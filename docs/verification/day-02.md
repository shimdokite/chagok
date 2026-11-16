# 2일차 실행 검증 — 인증 기반·신청 UI

최신 판정은 [누적 PR 준비·D2-01~D2-09 AC](day-02/pr-ready/result.md)를 따른다. 실제 Google 로그인·정상 복원10회·만료·로그아웃, 사용자 Option+Tab/Space, 실제 WKWebView 재로드 후 웹/네이티브 close·unmount 세대 일치를 확인했다. 학습 파일은 로컬 보존 후 기존 추적만 제거했다. 최종 사용자 UI 인수와 게시 승인은 별도다.

과거 timeout은 [원인 재조사](day-02/timeout-investigation/result.md)에서 초기화 지연과 응답/종료 순서를 확인했으나 당시 최종 JS 오류 분기는 미확정이다. 정상 재로드·통제된 장애 재현 통과를 과거 원인의 확정으로 바꾸지 않는다.

## 최초 구현 실행 기록 — 아래 상태는 OAuth 설정 전의 역사 기록

2026-11-16 (Asia/Seoul), 실행자 Codex. **코드 구현 및 가능한 자동·기기 검증을 수행했지만 2일차 전체 인수는 미완료다.** Google iOS/Web client ID가 없고 사용자가 준비된 설정이 없다고 답했다. 실제 Google 로그인과 인증 세션 복원10회는 미검증·미측정이며 데모/Mock/DB 테스트로 대체하지 않았다.

시작 HEAD `main/86a95a2574bc08517c145389cb88b41e81deffd9`; [초기 변경·해시](day-02/initial-state.json), [이번 소스 manifest](day-02/source-sha256.json), [실패·수정 장부](day-02/execution-notes.md), [독립 리뷰](day-02/review.md). 기존 사용자 수정과 1일차 시안·측정·학습은 보존했다. 아래 기록은 이번 실행 결과다.

## A. 최초 실행 AC 결과 (최신 판정은 상단 링크)

모든 실행 일시는 2026-11-16 KST. 공통 자동 환경은 macOS arm64 / Node24.22.3 / npm workspace; native는 Xcode27.2, iOS27.2 simulator Debug ad-hoc 서명, 웹은 Next16.4.6 development다. 실제 iPhone·Android·Release까지 확대 해석하지 않는다.

| AC ID | 세부 조건 | 상태 | 실행자·일시 | 환경 | 방법·명령 | 실제 결과·근거 | 한계 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| D2-01 | 실제 Google·사용자 재사용·안전 저장·복원·만료·로그아웃 | **미검증** | Codex 11/16 | 자동+로컬 PG18.6+mini | 서비스/상태 제어/HTTP/실제 DB 테스트, native 빈 저장소 시작 | 실제 DB 동시 로그인5건에서 User1개·Session5개, 해시만 저장·만료·현재 세션 폐기 확인. Google 검증 실패/취소·저장 실패·경합 자동 검사. SecureStore 초기 읽기는 signed build에서 정상 | 실제 Google 계정 흐름은 client ID 부재로 미실행. 실제 로그인 후 재실행·만료·로그아웃은 남음 |
| D2-02 | Tailwind와 Button/Input/Label 실제 사용 | **충족** | Codex 11/16 | Chrome+Next build | import/DOM 및 `npm run build:web` | 컴포넌트3종 사용, label5개 연결, `/apply` 정적 출력, CSS 실제 렌더링 | 설치만으로 판정하지 않음 |
| D2-03 | 기존 문구·테마·작은 화면 | **충족** | Codex 11/16 | Chrome320/360px, mini360pt light/dark | 전후 PNG·DOM 폭·native 시각 비교 | 브라우저 scrollWidth=viewport, 날짜 입력 폭 안에 표시; native light/dark와 상하 스크롤 시 폼 표시 유지 | 사용자 최종 시각 확인 대기. OS 최대 글자/실기기는 이번에 재검사하지 않음 |
| D2-04 | 입력·첨부·제출 비활성·신청 저장 없음 | **충족** | Codex 11/16 | Chrome+WKWebView | DOM disabled6개, 입력 시도, native 날짜/첨부/제출 탭, API/호출부·서버 access log 확인 | 모든 제어 비활성, 입력 fill 거부, 탭 후 화면 변화/파일 선택/신청 제출 없음. 신청 API 추가 없음; DB User/Session만 | 브라우저 네트워크 전수 추적 기능은 사용하지 못함; DOM·실제 조작·소스·access log 근거 |
| D2-05 | 날짜·스크롤·닫기·라벨·활성 버튼 포커스 | **미검증** | Codex 11/16 | mini WKWebView+Chrome | 실제 터치 drag, web 닫기, DOM 라벨 검사 | mini 날짜 정상, 하단 영수증/버튼/안내까지 터치 스크롤, 웹 닫기→홈 성공. label5개 연결 | 활성 shadcn 닫기 버튼의 키보드 포커스는 WKWebView에서 미검증. 사용자 스크롤 사용감 확인 대기 |
| D2-06 | ready·왕복·닫기·재진입·재로드·오류 복구 | **미검증** | Codex 11/16 17시대 | mini WKWebView | 개발 진단 UI, 실제 서버 중단·복구 | WEB_READY, 왕복20/20, 웹 닫기와 재진입 확인. 재로드 중 준비 시간 초과1회→재시도 복구 | 첫 재로드 시간 초과 원인 미확정. 복구 여부와 별개로 무회귀 완료 판정 보류; 하단 실행 메모 참조 |
| D2-07 | 타입·기존/신규 테스트·웹 빌드 | **충족** | Codex 11/16 | Node24+실제 PG | `npm run typecheck`, Vitest 전체, `npm run build:web`, xcodebuild | 타입 exit0, 10파일60테스트 통과, 웹 build exit0, iOS signed Debug BUILD SUCCEEDED | Google SDK 검증기는 mock; DB만 실제. 실제 OAuth 통과 증거 아님 |
| D2-08 | 실제 결과·수동 확인·측정 여부/한계 분리 | **충족** | Codex 11/16 | 문서/원본/UI | 본 A/B표·측정 재계산·소스 보존 | 인증 복원 표본0·통계null, 별도 브리지 원본20개/요약 재계산 일치. 새 로컬 학습·진행·초안 작성 | 브리지 원본의 embedded sourceRef는 기존 설정 값: 보충 환경 파일에서 실제 소스 결합, 비교 성능 주장 안 함 |
| D2-09 | 완료 후 PR 준비: 학습 보존·추적 제거·링크 정리 | **미검증** | Codex 11/16 | Git | `git diff --cached`, `git ls-files`, hash | staged 비어 있음, 기존 day01 학습 해시 보존, 새 day02 학습 ignored | 구현/사용자 확인이 끝나지 않아 PR 준비 단계 미진입. 추적 제거·현 안내 링크 정리·push·PR은 대기 |

## 필수 검증 10묶음

| # | 검사 | 이번 실행 결과·근거 |
| --- | --- | --- |
| 1 | 타입 | `PATH="$PWD/.local-tools/node24/node_modules/.bin:$PATH" npm run typecheck` exit0 — [로그](day-02/typecheck-final.log). 중간 typed route/mock 타입 오류는 수정 후 재실행 |
| 2 | 테스트 | Node24에서 env-file로 로컬 DB를 주입한 `vitest run`: **10파일60개 전부 통과**, skip0 — [로그](day-02/final-tests.log). DB 미설정 기본 실행은 DB통합1개를 skip하므로 실제 DB 실행 결과와 구분 |
| 3 | 웹·native 빌드 | `npm run build:web` exit0 [로그](day-02/build-web-final.log). `xcodebuild -workspace apps/mobile/ios/app.xcworkspace -scheme app -configuration Debug -sdk iphonesimulator -destination 'platform=iOS Simulator,id=802A61DA-1559-48A6-A9EA-328E16CAE45B' -derivedDataPath .local-tools/DerivedData CODE_SIGN_IDENTITY=- build` 성공 [발췌](day-02/ios-build-signed.log). 최초 workspace 이름 오류, unsigned Keychain -34018 실패 후 수정 |
| 4 | 실제 인증·DB | 실제 Google 미실행(사용자 설정 없음). Google verifier boundary/mock 테스트와 실제 PG 동시 upsert/세션 통합 검사는 통과. [설정 재개 절차](day-02/auth-setup.md) |
| 5 | 세션 수명·복구 | 취소·실패·401·expiry·로그아웃 중 늦은 응답·network/timeout·저장 실패 자동 확인, native 빈 저장소 시작 정상. 실제 인증 세션 시나리오·10회 시간은 미검증 |
| 6 | 브라우저 UI | `/apply`320/360px overflow 없음, 제어6개 disabled/label5개. RN Web8082 데모→신청 iframe→홈→데모 종료 성공. health CORS8082 실패를 재현 후 수정, `chagok: ok`; 외부 Origin·production 차단 테스트 포함 |
| 7 | iOS UI·브리지 | mini light/dark·날짜·터치 스크롤·disabled 탭·web 닫기·재진입·WEB_READY·왕복20/20. 재로드 준비 시간 초과1회와 재시도 복구 기록. [스크린샷](day-02/ios-apply-dark.png), [하단](day-02/ios-apply-bottom-dark.png) |
| 8 | 측정 | [복원 원본 상태](../metrics/raw/day-02-session-restore.json)0표본/null통계. [브리지 공유 원본](../metrics/raw/day-02-bridge.json)3warmup+20표본의 횟수/중앙값/min/max 재계산 일치. [sourceRef 한계/실제 환경](../metrics/environments/day-02-bridge.json), [요약](../metrics/daily/day-02.md) |
| 9 | 문서·보존·비밀값 | 초기 해시와 day01 학습/시안3개/측정2개 일치, 알려진 로컬 DB 비밀값이 Git 후보 파일에 없는지 검사. 전체 diff whitespace 오류는 기존 day01 학습9줄에만 있음; 해당 경로 제외 검사 별도. 문서 링크·manifest 검사는 하단 결과 |
| 10 | PR 준비 경계 | staged 비어 있음, `docs/learning/day-02.md` ignored, 기존 day01 여전히 tracked. 사용자 확인 후 PR 준비 때만 추적 제거. 현재 초안은 이번 작업 범위이며 실제 PR 전체 diff 검토·게시 승인을 대신하지 않음 |

실제 DB 테스트 재실행은 아래와 같다. URL/비밀번호를 출력하지 않으며 전용 localhost chagok DB만 허용한다. 테스트는 고유 테스트 subject의 행만 정리한다.

```sh
PATH="$PWD/.local-tools/node24/node_modules/.bin:$PATH" node --env-file=apps/web/.env.local --input-type=module <<'JS'
import { spawnSync } from 'node:child_process';
const r = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run'], {
  stdio: 'inherit', env: { ...process.env, CHAGOK_TEST_DATABASE_URL: process.env.DATABASE_URL }
});
process.exit(r.status ?? 1);
JS
```

## B. 최초 실행 당시 사용자 확인 대기 기록

사용자가 이번 변경을 확인했다고 답한 항목은 아직 없다. 기존 1일차 승인으로 이번 확인을 대신하지 않는다.

| 항목 | 주소/기기 진입 | 재현 단계 | 기대 결과 | 상태 | 사용자가 알려 준 실제 결과·일시 |
| --- | --- | --- | --- | --- | --- |
| 신청 UI | http://localhost:3000/apply | 작은 창, 내용·날짜·첨부/제출 확인 | 65,000원 데모·모든 입력 비활성·가로 넘침 없음 | 대기 | 아직 없음 |
| 브라우저 앱 | http://localhost:8082 | 데모→신청→닫기·홈→데모 나가기 | 로그인 안내/화면 이동 정상, 실제 인증 아님 | 대기 | 아직 없음 |
| native 사용감 | Device Hub → Chagok M09 Mini → 차곡 | 데모→신청, 상하 스크롤, 웹/상단 닫기, 재진입 | 라이트/다크·날짜·하단 안내 정상, 닫기 가능 | 대기 | 아직 없음 |
| 재로드 안정성 | 신청 → 개발 도구 | 웹뷰 다시 로드, WEB_READY 재수신 반복 | 불필요한 준비 시간 초과 없이 복구 | 대기 | 개발자 실행 중1회 시간 초과, 사용자 결과 아직 없음 |
| 실제 Google | [설정 절차](day-02/auth-setup.md) 후 재빌드 | 취소/성공/실패·동일 계정 재로그인 | 취소 시 화면 유지, 동일 사용자 재사용 | 대기 | OAuth 설정 “없음” 답변만 있음; 실제 동작 확인 아님 |
| 인증 세션 | 실제 로그인 후 | 종료·재실행10회, 서버 중단/복구, 만료, 로그아웃 | 저장/복구/만료 정상, 원본 JSON에 성공·실패 보존 | 대기 | 아직 없음 |
| PR 진행 | 코드/본 문서 검토 후 | 결과 확인 및 이번 변경의 PR OK | feat/[슬러그]에서 별도 PR 준비 | 대기 | 이번 PR 승인 없음 |

## 영향·남은 한계

### 실행 종료 메모

- mini에서 서버 프로세스를 의도적으로 중단하고 재로드한 뒤 오류 안내/재시도 버튼을 확인했다. 서버 재시작 후 재시도에서 WEB_READY 재수신, 상단 native 닫기로 홈 복귀했다. [오류](day-02/ios-server-error.png) / [복구](day-02/ios-server-recovered.png). 앞선 자발적 재로드 시간 초과1회의 원인은 별도 미확정으로 남긴다.
- iPhone17에도 동일 signed build를 설치했다. 로그인 안내→데모→신청, [날짜/기본 레이아웃](day-02/ios17-apply-light.png)과 [하단까지 터치 스크롤](day-02/ios17-apply-bottom.png)을 확인했다. iPhone17 다크는 이번에 반복하지 않았고 mini에서 확인했다. 최종 Device Hub는 mini 홈/라이트, 기본 글자 크기다.
- HTTP 최종 확인: `/`307→`/apply`, `/apply`200, `:8082/`200. 브라우저 신청 화면과 앱 미리보기를 열어 두었다. Next3000 / Metro8081 / 웹 미리보기8082 / 로컬 DB55432가 실행 중이다.
- [문서 검사](day-02/document-check.log): 최종 로컬 링크86개 누락0, 초기 보존10파일 불일치0, 소스80파일 해시 일치, 알려진 로컬 DB 비밀값 노출0, staged 비어 있음. `git diff --check -- . ':!docs/learning/day-01.md'` exit0. 전체 검사는 기존 보존 대상 day01 학습9줄 공백 오류로 exit2이며 수정하지 않았다.
- 첫 소스 manifest 대조는 Next 개발 서버가 생성한 `next-env.d.ts`의 dev 타입 경로 차이로 실패했다. 시작 시 이 파일은 수정이 없었으므로 생성된 경로 변경만 원래 내용으로 정리하고80개 해시를 다시 대조했다. 런타임 소스 변경은 없었다.

- `/apply`는 Server Component, DOM 이벤트는 기존 BridgeReceiver 경계를 유지한다. bridge 계약/URL 정책·1일차 원본·신청 저장 기능은 변경하지 않았다. 웹 UI3종만 추가했으며 RN/React/Next 버전을 올리지 않았다.
- auth 응답은 no-store, 내부 stack/DB 메시지를 감춘다. DB는 User/Session만 추가; 토큰 원문은 SecureStore에, DB에는 해시만 보관. 현재 기기의 앱 세션만 로그아웃하며 계정 권한 철회·전체 기기 로그아웃과 다르다.
- foreground 재검증 때 기존 보호 화면을 유지하며 overlay로 막고, 실패 시 접근을 제거한다. 해당 결함·timeout 분류 수정은 재현 RED→GREEN 및 전체 테스트로 확인했다.
- 개발 CORS는 localhost/127.0.0.1의8081·8082만 허용한다. production에서는 비활성이다. 실제 서비스 배포/HTTPS/운영 rate limit·세션 정리는 이번 로컬 구현 범위가 아니다.
- 설정 없는 Google 버튼을 비활성화하고 안내/데모를 제공한다. 네이티브 plugin 변경에는 재빌드 필요. Android·실기기·Release·스크린리더·WKWebView 키보드 포커스는 미검증이다.
- 대용량 Xcode 원본 로그는 Git 제외 `.local-tools/day-02-full-logs/`에 보존하고 추적 후보에는 발췌·[원본 해시](day-02/full-log-manifest.json)를 남겼다. 컴퓨터 제어 도구 시간 초과 후 TextEdit 경유로 공개 익명 측정 JSON을 추출했으며 원본 값을 변경하지 않았다.

## 종료 기록 수정 후속 — 2026-11-16

웹 닫기는 이동 전 공통 close 기록을 통과하고 unmount는 마지막 committed revision을 남기도록 수정했다. 대상7개/전체71개 및 타입 검사를 이번에 실행해 통과했다. 동기 hook host의 자동 검사이며 이번 native OS/React 동시성 실측은 아니다. 화면 구성 변화가 없어 새 서버·브라우저 열기는 해당 없음이다. [이번 AC·증거·한계](day-02/trace-close/result.md). 과거 타임아웃 분기 미확정과 과거 실측 원본은 유지한다.

## iOS 종료 실측 완료 — 2026-11-16

Simulator 실제 native app/WKWebView에서 웹 재로드2회 후 close2→unmount2, native 재로드3회 후 close3→unmount3을 각각1회 확인했다. 웹 클릭은 도구 오류로 사용자가 수행했고 로그/홈 상태는 도구로 검증했다. native 클릭은 도구로 수행했다. 종료 직후 준비 timer도 해제됐으며 이벤트 누락·중복/오류는 없다. 임시 로그 sink를 제거하고 앱/패키지82파일 시작 해시 일치, 최종 타입/실제 DB71테스트 통과. [원본·AC·한계](day-02/native-close/result.md). 물리 iPhone/Release/모든 동시성 검증은 아니며 과거 타임아웃 분기 미확정은 유지한다. 추가 사용자 조작 대기는 없다.
