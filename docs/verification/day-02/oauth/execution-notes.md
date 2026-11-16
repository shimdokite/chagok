# OAuth 설정 후 검증 실행 — 2026-11-16

- 기존 day02 구현·미커밋 사용자 변경을 이어서 검증한다. 초기 상태/해시는 initial-state.json, 전체 diff는 Git 제외 로컬 실행 폴더에 보존.
- Ruling: 구현을 새로 시작하는 작업이 아니므로 현재 폴더/브랜치에서 검증한다. 기존 사용자 지침대로 커밋·push·PR·학습 추적 제거는 수행하지 않는다. 기존 구현 리뷰를 반복하지 않고 실제 로그인 검증에 집중한다.
- A1 초기 검사: iOS/Web 필수 ID 존재·형식 정상·모바일/서버 Web ID 일치·iOS와 Web ID 다름·프로젝트 번호 동일·중복 키 없음·모바일에 secret/password/DB 키 없음. 값은 출력하지 않음.

- 실행 환경: Node24.22.3, Xcode27.2, iOS27.2 mini simulator, Debug ad-hoc 서명, Next development, localhost PostgreSQL18.6.
- 초기 npx prebuild는 하위 디렉터리 PATH에 npx가 없어 exit127; 절대 Node24/Expo 경로로 재실행하여 exit0. pod install 완료 전 Podfile.lock 읽기는 ENOENT로 실패했으며 설치 exit0 후 재검사에서 통과. 두 실패는 설정 또는 앱 결함으로 판정하지 않음.
- 현재 실행 타입 검사 exit0, 실제 개발 DB를 연결한 Vitest 10파일60개 전부 통과(skip0). 웹 /apply 및 미리보기 HTTP200.
- 기존 dev-web.log에는 기존 서버 종료 전 실행 로그가 추가됨. 기존 내용 삭제 없음. Next가 생성한 next-env.d.ts의 dev 경로만 작업 시작 내용으로 되돌림.
- 재현 명령: Node24로 `node node_modules/expo/bin/cli prebuild --platform ios --no-install`(mobile cwd), 로컬 Ruby/CocoaPods로 `pod install`(ios cwd), 루트에서 `xcodebuild -workspace apps/mobile/ios/app.xcworkspace -scheme app -configuration Debug -sdk iphonesimulator -destination "platform=iOS Simulator,id=802A61DA-1559-48A6-A9EA-328E16CAE45B" -derivedDataPath .local-tools/DerivedData CODE_SIGN_IDENTITY=- build`. 빌드 원본은 Git 제외 `.local-tools/day-02-oauth/ios-build.log`.
- 자동 명령: Node24 PATH에서 `npm run typecheck`; `node --env-file=apps/web/.env.local`로 읽은 DATABASE_URL을 CHAGOK_TEST_DATABASE_URL에 전달하여 `node node_modules/vitest/vitest.mjs run`. 비밀값 출력 없음.
- signed iOS 재빌드 exit0 및 simctl install/launch 성공. 최종 Info.plist callback scheme 일치. codesign 결과 Signature=adhoc이며 명시적 application-identifier entitlement는 없음(이 항목을 통과로 주장하지 않음). 빈 저장소 시작은 오류 없이 로그인 화면 도달.
- 첫 Google 로그인 누름 후 안내 표시가 지연되어 native 로그 확인: SafariViewService 실행 관찰, 이후 OS accounts.google.com 연결 안내 표시. 원인 확정/코드 변경 없음. OS 취소→로그인 화면 복귀 및 버튼 재활성 확인, 두 번째 시도는 안내가 바로 표시됨. Google 계속을 눌러 계정 화면 진입 중.

- 사용자 “로그인 완료” 후 native 인증 홈/로그아웃 버튼과 DB User1·Session1을 확인. 정상 process terminate/relaunch10회 모두 인증 홈 복원 확인; 성능 값은 아직 journal export 전.
- Next3000 중단→curl HTTP000→앱 재실행에서 보호 홈 제거·연결 재시도 안내. 서버 재시작/HTTP200 후 retry→동일 세션으로 홈 복구. DB 사용자/기존 세션 유지 확인.
- native 로그아웃→로그인 화면 및 DB Session0·User1 확인. 실제 토큰을 추출해 재전송하지 않았으며 폐기 근거는 기존 session 행 부재와 별도 자동 서버 테스트다.
- 로그아웃 후 process 재실행에서도 로그인 화면 유지. 동일 계정 재로그인 단계에서 CUA 좌표 클릭 noWindowsAvailable 반복. AX 창 활성화/재선택으로 해결되지 않아 키보드 캡처→Tab/ShiftTab으로 기존 Google 계정 선택까지 진행. 계속 버튼은 사용자 입력 요청, 키보드 캡처는 원래 off로 복귀. 계정 정보가 보이는 화면은 증거 파일로 저장하지 않음.
- 사용자 재로그인 계속/홈 복귀 확인 후 DB User1·Session1: 기존 사용자 ID 유지, 최초 로그아웃 세션은 부재, 새 session은 같은 user에 연결. native 인증 홈도 확인.
- localhost/chagok 및 기존 검증 user로 범위를 제한한 script가 활성 session1건의 expiresAt만 과거로 변경. 앱 재실행에서 “로그인이 만료됐어요. 다시 로그인해 주세요.” 확인. User1/Session1/active0이며 다른 user/session 변경 없음.
- 만료 후 데모 진입은 익명 측정 journal export 도구 접근용이며 인증 성공/성능 표본으로 세지 않음. 공유창 Copy에서 동일 좌표 도구 오류가 재현돼 사용자 Copy 조작 요청.

- 사용자 Copy 완료 후 앱의 “17회 · 저장 오류 없음”을 확인. Device Hub Edit/Get Clipboard→TextEdit 새 임시 문서에 Cmd+V→AX의 JSON 원문을 파일로 저장. 임시 RTF는 /private/tmp/day02-session-restore-clipboard.rtf에 저장하고 편집 문서는 닫음.
- 원본17개(saveFailed=false, capacityReached=false, runId 중복0). 사전 지정 구간 startup10개를 상태 필터 없이 선택했으며 모두 success. Node 요약과 Python 독립 계산 일치: median225.97695850208402/min140.14224999397993/max858.8681249991059ms. 정상10개 외 empty4/failure1/retry success1/expired1을 전체 journal에 유지.
- 최종 데모 나가기→Google 로그인 화면 확인, 키보드 캡처 off. 사용자 계정 재로그인이 필요한 상태는 의도한 만료 검증 결과다. 로컬 DB User1/Session1(active0), 회원·다른 데이터 보존.
