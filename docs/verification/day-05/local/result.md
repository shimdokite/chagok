# 5일차 — 추가 로컬 검증 결과

2026-11-24 KST. 현재 작업 폴더/HEAD760d43d에서 기존 미커밋 변경을 이어 사용했다. 이번 제품 소스·설정·스키마 변경은 없으며 테스트3개와 검증 자료를 추가했다. 기존 앱/계정/서버/저장 파일은 유지했다.

## AC 결과

| AC | 상태 | 확인 방법과 실제 결과 |
| --- | --- | --- |
| L1 정리 CLI | 충족 | 별도 PostgreSQL18.6/55433에108행 생성. CLI 첫99삭제/1실패, 장애 제거 후6삭제/0실패, 재실행0삭제/0실패. 최신 READY/PENDING 및 실제 Claim이 참조하는 오래된 LINKED3행·파일을 보존했다. 임시 DB·객체는 정리했다. |
| L2 운영 차단 | 충족 | production과 저장 설정 누락 CLI가 DB 접근 전 실패. production에서 실제 POST 라우트를 Node Request/Response로 호출해503/SERVICE_UNAVAILABLE/no-store, 폴더 미생성 확인. 원격 호스팅이나 Next production HTTP 서버 검증과 구분한다. |
| L3 로컬 빌드 | 충족 — 빌드 범위 | iOS Simulator Release xcodebuild exit0 및 앱/JS 번들 산출물 확인. 기존 앱에는 설치하지 않았다. Android production Hermes export exit0. Android 네이티브 빌드·실행과 iOS Release 실행은 미검증. |
| L4 회귀·기록·보존 | 충족 | 새3개 포함34파일310테스트, 스타일128파일 위반0, 타입4 workspace exit0. 문서·원본·환경·로컬 학습·최신 초안 갱신 및 시작 파일 해시/링크/Git 검사. 별도 코드 리뷰 조치 사항 없음. |
| L5 권한 거절 UI | 충족 — 시뮬레이터 | 실제 OS 팝업을 거절한 뒤 설정 안내·기존 JPEG46.7KB 보존. 카메라 재시도에서도 안내, 사진 선택창 열기→취소 후 첨부 보존/오류 해제 확인. 촬영/허용 후 복귀는 미검증. |

## 실행 검증 6묶음

1. **정리 프로세스:** `node docs/verification/day-05/local/verify-cleanup.mjs` exit0. [실행 스크립트](verify-cleanup.mjs), [결과](cleanup-result.json), [로그](cleanup.log). 저장된 migration SQL5개를 새 임시 DB에 적용했다. Prisma migrate deploy를 검증한 것은 아니다.105개 정리 대상 중1개를 파일 대신 비어 있지 않은 디렉터리로 만들어 삭제 실패를 유발했다. 첫 실행의100건 제한과 DELETING 잔존, 방해 요소 제거 뒤 재시도, 객체가 원래 없는 PENDING 처리도 확인했다. 남은3개 파일은 바이트 동일/0600, 디렉터리0700. 이4바이트 fixture는 이미지 업로드용이 아니라 삭제 검증용이다. 각 CLI 시간1140.95/1370.11/1510.60ms는 시작/연결을 포함한 단일 관측이다. 일부 삭제 실패도 CLI exit0이므로 운영 모니터는 JSON failed를 함께 읽어야 한다.
2. **자동 회귀:** `npm test -- scripts/cleanup-receipts.test.ts --maxWorkers=2` [4통과](production-tests.log). 이후 Node24.22.3에서 `.env.local`을 프로세스로 읽어 `CHAGOK_TEST_DATABASE_URL=DATABASE_URL`로 설정한 `npm test -- --maxWorkers=2` [310통과](tests.log), pretest 스타일128파일 위반0, [npm run typecheck](typecheck.log)4 workspace exit0. 로컬 DB 연결은 허용된 실행으로 진행했다. 첫 guard3개 검사도 [통과](cleanup-guard-tests.log). 이번 새 테스트는 기존 동작의 검증 보강이며 제품 결함의 RED→GREEN으로 주장하지 않는다. [독립 리뷰](review.md)는 이번 검증 코드만 확인했다.
3. **빌드/환경:** [iOS Release 로그](ios-release-build.log), [산출물](ios-release-artifact.json). `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild -workspace apps/mobile/ios/app.xcworkspace -scheme app -configuration Release -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath /tmp/chagok-day05-release-build CODE_SIGNING_ALLOWED=NO build` exit0. 인증서/실기기 archive/배포/실행을 검증한 것이 아니다. 컴파일 경고는 로그에 보존했다. [Android export](android-export.log)는 `expo export --platform android --output-dir /tmp/chagok-day05-android-export` exit0, [Hermes 산출물](android-artifact.json)3961275B. [SDK 조사](android-environment.json)에서 PATH/환경변수/기본 설치 경로의 adb·emulator·SDK를 찾지 못했다. 웹 제품 코드가 그대로여서 웹 빌드는 반복하지 않았다.
4. **실제 권한 UI/실측:** CUA로 iPhone17/iOS27.2의 OS 카메라 팝업에서 허용 안 함을 선택했다. “기기 설정에서 카메라 권한을 허용해 주세요.” 표시, 재시도 시 동일 안내, 시스템 사진 선택창 열기/취소와 기존 JPEG46.7KB 보존을 직접 관찰했다. 화면 근거는 대화 CUA 캡처이며 별도 스크린샷 파일은 없다. [원본](../../../metrics/raw/receipt-ui-1795426328923-permission.json)39개 중37~39만 이번 실행이고 이전36개는 동일하다. [환경/재계산](../../../metrics/environments/receipt-ui-1795426328923-permission.json): camera error/acked2, library cancelled/acked1, 대기0/초과0/저장 실패false. picker에는 조작 대기가 포함되고 컴파일과 겹쳤으므로 성능 비교를 하지 않는다. ACK는 paint가 아니라 웹 상태 적용이다. prepare/upload는 실행되지 않았다.
5. **사용자 데이터/서비스:** [읽기 전용 대조](preservation.json)는 이번 시간대 새 첨부0/신청0, 기존 저장 파일30개와 `/apply`3000/Metro8081 HTTP200을 확인했다. 실제 정리는55433의 임시 클러스터에서만 수행했고, 기존55432 DB의 보존 첨부는 정리하지 않았다. 현재 앱은 기존 JPEG46.7KB를 표시한다. 시뮬레이터 카메라 권한은 이번 거절 결과로 꺼져 있으며 최초 미결정 상태로 되돌리지는 않았다. 계정 만료·소속·토큰은 변경하지 않았다.
6. **문서/보존:** [검사](document-check.log)에 시작802파일 해시, 링크, Git diff 공백 및 학습 제외를 기록했다. 허용한 이번 파일 외 이전 자료와 handoff.md/next-env.d.ts를 보존했다. 학습은 로컬 전용이며 tracked/staged/PR diff에 없다. 화면 코드 변경이 없어 추가 브라우저 열기는 해당 없음. 기존 http://127.0.0.1:3000/apply 미리보기와 로그인된 앱에서 확인할 수 있다. commit/push/PR 없음.

## 남은 검증

- 실제 iPhone 촬영, 권한 허용 후 설정 복귀/촬영 결과. 시뮬레이터 거절 검증을 촬영 성공으로 세지 않는다.
- 실제 계정 만료·회사 변경 전체 UI. 앱에 테스트 계정 주입/회사 전환 UI가 없고 로그인 계정에 기존 신청이 있으므로 계정 데이터를 조작하지 않았다. 전용 테스트 계정의 로그인/재로그인이 가능한 흐름이 필요하다. 구독/취소/DB 경계 자동 검사는 이번310개에 포함돼 재실행됐다.
- iOS Release 앱 실행, Android SDK를 통한 네이티브 빌드·설치·실행. production JS export와 Simulator Release 컴파일만 확인했다.
- 원격 비공개 객체 저장소 및 운영 예약 정리/실패 모니터. 현재 production 로컬 저장소 거부는 의도된 제한이다.

사용자 수동 검토는 대기이며 자동 통과로 세지 않는다. 현재 앱에서 사진 선택·취소와 기존 첨부 보존을 확인할 수 있다. 카메라 버튼은 거절한 시뮬레이터 권한에 따라 설정 안내를 표시한다.
