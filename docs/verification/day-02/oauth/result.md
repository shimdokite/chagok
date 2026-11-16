# OAuth 설정 후속 검증 — 2026-11-16

두 `.env.local`의 정적 검사와 iOS 재빌드는 통과했다. 사용자가 Google 로그인을 완료한 뒤 인증 홈과 DB User1/Session1을 확인했다. 앱 프로세스 재실행10회 모두 홈 복원, 서버 중단/복구 시 기존 세션 재시도, 로그아웃 후 Session0/User1 및 재실행 로그인 화면까지 확인했다. 같은 계정 재로그인도 기존 사용자1개를 재사용하고 새 세션을 생성했다. 해당 로컬 테스트 세션1건만 만료시킨 후 재실행에서 재로그인 안내를 확인했다. 사용자 Copy 조작 후 전체 journal17개를 저장했고 정상10회 중앙값225.98ms(140.14~858.87ms)를 독립 재계산으로 확인했다. 이번 OAuth 후속 검증 AC6개는 모두 충족했다.

2026-11-16 17시대 설정·빌드·자동 테스트와 18시대 실제 계정 검증을 구분한다. 런타임 코드 변경이 없으므로 통과한 타입/60테스트를 사용자 입력 전후로 반복하지 않았다.

## AC 결과

| AC | 상태 | 확인 방법·실제 결과 |
| --- | --- | --- |
| A1 환경 설정 | 충족 | [설정 검사](config-check.json)의 ID·scheme 일치와 실제 Google→앱 복귀→서버 로그인 성공으로 현재 iOS/Web 조합 동작 확인. Cloud Console 설정 화면 자체는 별도 열람하지 않음 |
| A2 iOS 재빌드·실행 | 충족 | prebuild·pod install·xcodebuild exit0, simctl install/launch 성공. [최종 빌드](build-result.json)의 bundle ID 및 scheme 일치. native Google 버튼 활성, 빈 SecureStore 시작 정상. Signature=adhoc이지만 명시적 application-identifier entitlement는 없음 |
| A3 실제 계정·세션 수명 | 충족 | 실제 로그인, 동일 사용자 재사용/새 세션, 장애 시 접근 차단→복구 후 같은 세션 retry, 로그아웃→Session0/User1·재실행 로그인 화면, 테스트 세션1건 만료→재로그인 안내 확인. [흐름 결과](flow-checks.json), [재로그인 DB](db-after-relogin.json), [만료 fixture](expiry-fixture.json), [만료 DB](db-after-expiry.json), [화면](session-expired.png). 실제 토큰 재전송 없이 세션 행 폐기와 앱 복원 결과를 근거로 함 |
| A4 정상 복원10회·측정 | 충족 | [사전 구간](startup-window.json)의 startup10/10 성공. [공유 원본17개](../../../metrics/raw/day-02-session-restore-journal.json)와 [10회 요약](../../../metrics/raw/day-02-session-restore.json) 보존. 중앙값225.98ms, 범위140.14~858.87ms; [독립 재계산](metrics-check.json) 일치. 저장 오류/용량 초과/중복runId 없음. 별도 장애·만료·empty 표본도 보존 |
| A5 실행·학습 기록 | 충족 | [실행 장부](execution-notes.md), 새 소스 manifest, 테스트/설정/빌드 증거, 기존 검증·진행·수동 확인 문서를 연결. 로컬 day02 학습에 ID 역할·재빌드·서명 관찰의 한계 추가. 이전 실행 기록은 보존 |
| A6 초안·기존 변경·비밀값 보존 | 충족 | 최신 초안2개를 이번 후속 검증 범위로 갱신. `.env.local`·ios·로컬 도구·새 학습 ignored, staged 없음. 알려진 로컬 설정값 추적 후보 노출0. 최종 문서 검사는 document-check.json 참조 |

## 자동 검증과 실행 환경

- Node24.22.3에서 `npm run typecheck`: exit0 — [로그](typecheck.log).
- 실제 localhost PostgreSQL18.6을 연결한 `node node_modules/vitest/vitest.mjs run`: 10파일60테스트 통과, skip0 — [로그](tests.log). DB 접속값은 env-file로만 전달; 테스트 고유 행만 정리.
- Xcode27.2 / iOS27.2 iPhone13mini simulator / Debug / ad-hoc 서명. 빌드 원본은 Git 제외 `.local-tools/day-02-oauth/ios-build.log`, SHA-256은 build-result.json에 기록. 생성 파일과 환경 파일은 추적하지 않음.
- Next 개발 서버3000 / Metro8081 / 웹 미리보기8082 / PostgreSQL55432. `/apply` 및 웹 미리보기 HTTP200. 웹 production 빌드는 이번 작업에서 재실행하지 않음: 런타임 소스 변경 없이 설정·native 실동작 검증 범위다.
- 필수 검증은 위 AC6묶음에 타입·테스트·문서 검사를 포함해 관리한다. 60개 테스트의 개별 케이스 수는 묶음 제한과 별개다.

## 사용자 확인과 최종 상태

사용자가 최초 Google 로그인·같은 계정 재로그인·원본 Copy를 직접 완료했고 개발자가 앱/DB/JSON으로 확인했다. 기기 좌표 도구의 noWindowsAvailable 오류로 재로그인 계속과 공유 Copy만 사용자에게 넘겼다. 마지막 원본 확보 후 데모를 종료해 로그인 화면으로 정리했으며 키보드 캡처는 off다. 검증 계정의 현재 세션을 의도적으로 만료시켰으므로 다음 사용 시 다시 로그인하면 된다.

개발자 확인과 사용자 전체 UI 인수는 구분한다. 이번 실제 인증과 정상 복원 측정은 완료했지만 기존 2일차 WKWebView 키보드 포커스·재로드 준비 시간 초과 원인/반복 안정성·전체 UI 사용자 확인은 별도로 남아 있다. 학습 추적 제거·커밋·push·PR 단계에는 진입하지 않았다.

[브라우저 미리보기](http://localhost:8082/)와 [신청 UI](http://localhost:3000/apply)는 수동 UI 확인용이다. 웹 Google 버튼은 네이티브 전용 구현으로 비활성이며 iOS 인증 검증을 대신하지 않는다. 이번 후속 작업은 런타임 화면 코드 변경이 없어 추가 화면 구현 검증은 해당 없음; 실제 인증 화면/복원 경로는 위에서 직접 확인했다.

계정 정보가 보이는 Google 화면은 파일로 저장하지 않았다. [인증 홈](authenticated-home.png), [서버 중단 안내](server-unavailable.png), [만료 안내](session-expired.png)는 개인정보 없는 앱 증거다. JSON에는 익명 실행 ID·시각·trigger·status·duration만 있다.

## 실패·영향·한계

초기 npx PATH 오류(exit127)와 pod 완료 전 lockfile 검사(ENOENT)는 환경/순서 문제를 확인하고 재실행하여 통과했다. 첫 Google 연결 안내에는 지연이 있었고 native 로그에서 SafariViewService 시작을 확인한 뒤 안내가 표시됐다. 두 번째 안내는 즉시 표시; 원인은 확정하지 않았다.

앱 런타임 코드·의존성 버전·DB schema는 이번 작업에서 변경하지 않았다. 재빌드 산출물과 개발 서버만 갱신했고 기존 사용자 미커밋 변경을 유지했다. 기존 dev-web.log에는 서버 종료 전 로그가 추가됐고, Next 자동 생성 next-env.d.ts의 dev 경로 변경은 시작 내용으로 정리했다. 1일차 학습의 기존 공백 오류는 보존했다. 2일차 전체 인수·학습 Git 추적 제거·커밋·push·PR은 대기다.
