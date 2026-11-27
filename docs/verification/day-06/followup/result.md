# 6일차 후속 검증과 PR 준비 — 2026-11-27

2026-11-28 빌드 후속: 기본 Turbopack은 동일 코드·설정의 일반 macOS 터미널에서 성공했다. 아래 F3 실패는 당시 Codex 실행 결과이며 그 환경의 EPERM은 여전히 재현된다. [최신 빌드 AC](../turbopack.md).

최신 상태: [직원 실계정·Safari 후속](../employee-live.md)에서 Safari 인증·상세·반려와 iOS 화면 재진입/앱 활성화 갱신(97,000원 유지→99,000원 복원)을 완료했다. 아래 표와 기록은 앞선17시 실행 당시 상태다. 이후 [Android 에뮬레이터 검증](../android-live.md)에서도 실제 직원 로그인과 화면/앱 복귀 자동 갱신을 완료했다. 물리 기기는 미검증이다.

사용자가 담당자 로그인·신청 조회·연습용 승인/반려·영수증·사유·본인 신청 제한을 직접 확인했다. 이후 직원 앱, 추가 브라우저, 빌드, 전체 PR 준비를 요청하여 가능한 검증을 진행했다. 아래 미검증 항목은 자동 테스트 통과와 구분한다.

## AC 결과

| AC | 상태 | 근거와 남은 작업 |
| --- | --- | --- |
| F1 직원 앱 승인/반려 갱신 | 미검증(실제 화면), 준비 충족 | 최신 iOS Simulator·Android emulator Release 빌드와 데이터 유지 설치, 산출물/설치 해시 일치. 사용자 승인한 보조 Google 계정의 실제 앱 로그인 대기. 회사 연결·새 테스트 신청 생성·담당자 처리·복귀 후 상태/잔액 관찰은 아직 실행하지 않았다. |
| F2 추가 인증·브라우저 | 부분 충족 | Chrome 계정 선택창 닫기로 취소 → 로그인 버튼 유지 → 재시도 → 실제 담당자 회사 목록. 내장 브라우저는 현재 인증 세션과 새로고침 후 목록 조회 성공. Safari는 Google 인증 입력 화면까지 진입, 사용자 직접 인증 대기. |
| F3 빌드 재확인 | 충족(재검사), 기본 빌드는 미충족 | 기본/권한 확장 Turbopack 모두 CSS 처리 과정의 자식 프로세스 포트 바인딩 EPERM 실패. Webpack production build exit0. 제품 코드 변경 없이 제한을 보존했다. |
| F4 전체 범위 PR 준비·보존 | 충족(초안), 게시 대기 | 6일차 전체 기능·검증·제한으로 최신 초안을 재작성. 기존 소스24개 해시, 기존 next-env/handoff 보존. 학습은 로컬 보존·Git 제외. PR 생성·push·커밋 없음. |

## 이번 실행 검증 — 6그룹

1. **전체 자동 검사:** Node24.22.3에서 로컬 DB URL을 `CHAGOK_TEST_DATABASE_URL`로 전달하고 테스트 프로세스의 `SUPABASE_*`/`RECEIPT_*`를 제외한 `npm test -- --maxWorkers=2`: 41파일364테스트, pretest 스타일149파일0위반. [로그](tests.log). `npm run typecheck`: 4 workspace exit0([로그](types.log)). 17:16 KST 실행. 이전 결과를 재사용한 수치가 아니다.
2. **웹 빌드:** `npm run build:web` 기본 실행 및 권한 확장 재실행 exit1, 같은 EPERM. [기본](build-turbopack.log), [확장](build-turbopack-unrestricted.log). `npm run build -w @chagok/web -- --webpack` exit0([로그](build-webpack.log)). 빌드가 생성한 next-env의 production 경로는 작업 시작 시 dev 경로 내용으로 복구했다.
3. **네이티브 빌드/설치:** `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer`와 로컬 Node24로 기존 Release derivedData에 `xcodebuild ... CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=- build`: 성공, codesign 검증 성공. Android는 로컬 환경 스크립트 및 `CHAGOK_ANDROID_LOCAL=1 EXPO_PUBLIC_WEB_ORIGIN=http://10.0.2.2:3000 NODE_ENV=production ./apps/mobile/android/gradlew -p apps/mobile/android :app:assembleRelease -PreactNativeArchitectures=arm64-v8a --max-workers=2 --console=plain`: 5m38s 성공. [iOS 로그](ios-build.log), [Android 로그](android-build.log), [산출물](native-artifacts.json). simctl install과 adb install -r 성공, 설치된 iOS JS 번들/Android APK 해시가 빌드와 일치. 실제 기기/배포 서명 검증은 아니다.
4. **실제 브라우저:** Chrome 기존 실제 담당자 세션에서 로그아웃 → Google 팝업 열기 → 선택 없이 닫기 → 버튼으로 다시 열기 → 기존 담당자 선택 → 그로브 목록 확인([화면](chrome-retry.jpg)). 내장 브라우저는 이미 인증 상태였고 reload 후 동일 목록 조회 성공([화면](iab-session.jpg)). 이전 빈 `/gsi/transform`의 원인은 확정하지 않았으며 새 OAuth 흐름 전체를 이번에 검증했다고 주장하지 않는다. Safari 신규 창은 Google 로그인 입력 화면에서 인증 대기다. 첫 익명 조회의 인증 안내는 401 응답과 일치한다.
5. **기기 제어 한계와 계정 보존:** Device Hub에서 iPhone17/iOS27.2 신청 내역 및 홈 화면은 관찰됐다. 홈 도구 버튼은 작동하지만 앱 내부 좌표 터치는 창 접근 오류(`noWindowsAvailable`)가 창 Raise 이후에도 재현되어 사용자에게 보조 계정 로그인을 요청했다. ADB/Simulator 초기 샌드박스 연결 실패는 허용된 실행으로 해소됐다. 사용자 계정 매핑을 추정해 연결하지 않았다. 기존13신청/4소속 스냅샷은 개인 ID를 포함하므로 `/tmp/chagok-day06-followup-data-before.json`에만 보존한다. 종료 대조에서 전체 행 동일·신규 신청0·소속 변경0 assertion을 통과했다([보존 결과](data-preservation.json)).
6. **PR 범위/자료 검토:** origin/main 기준 변경과 신규 파일, 기존 구현 리뷰 및24개 소스 해시를 대조했다. 권한/자기 신청 제한·비공개 영수증·화면 복귀 갱신 호출부를 재확인했고 새 코드 수정은 없다. [후보 파일 목록](pr-files.txt)은 게시 대상 확정 전 검토용이며 최초 사용자 next-env/handoff와 학습 경로를 제외한다. 문서 링크/초안 형식, diff 공백, 실제 환경 비밀값 노출, 학습 ignore·추적/staged/전체 branch diff를 검사한다. [문서·보존 검사](checks.json)는 통과했다. 실제 게시 전에는 승인된 전체 범위와 staged diff를 다시 대조해야 한다.

## 다음 실제 화면 테스트

1. iPhone17 차곡 앱에서 보조 Google 계정으로 로그인한다. 담당자 계정과 다른 계정임을 확인한다.
2. 실제 로그인된 사용자 행을 확인한 뒤 로컬 샘플 그로브에 EMPLOYEE로 연결한다. 기존 회사 소속은 임의 이동하지 않는다.
3. 해당 계정에 새 연습용 신청을 준비하고 앱에서 검토 중 상태/잔액을 먼저 확인한다. 기존 신청은 처리하지 않는다.
4. 담당자 브라우저에서 새 신청만 승인/반려하고 직원 앱의 화면 재진입 및 백그라운드 복귀 각각에서 상태·사유·한도를 확인한다. Android에도 동일 계정으로 반복한다.
5. Safari 담당자 로그인 후 목록/상세를 확인하고 결과를 갱신한다. 전체 결과 확인과 PR OK 이후 feat 브랜치에서 게시한다.

내장 브라우저의 기존 세션 조회 성공은 이번에 확인했지만, 직원 앱 F1과 Safari 인증 완료를 대신하지 않는다. 한도/캐시 자동 테스트 통과도 실제 화면 테스트 완료로 바꾸지 않는다.
