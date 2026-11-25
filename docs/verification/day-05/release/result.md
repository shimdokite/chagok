# 5일차 — iOS Simulator Release 실행 검증

2026-11-24 KST, iPhone17/iOS27.2. 기존 작업 폴더의 미커밋 Day5 구현을 사용했다. 이번 변경은 검증·측정·학습 문서뿐이며 제품 소스·설정·스키마는 변경하지 않았다. 로컬 Next 개발 서버3000/기존 PostgreSQL55432/비공개 로컬 저장소를 사용한 Release 클라이언트 검증이다. 운영 서버나 배포 검증이 아니다.

## AC 결과

| AC | 상태 | 확인 방법과 실제 결과 |
| --- | --- | --- |
| S1 Release 설치·실행 | 충족 — 서명 보완 후 | 최초 서명 비활성 빌드는 실행되지만 Keychain -34018로 복원 실패. Xcode 시뮬레이터 ad-hoc 서명을 적용한 Release 재빌드 exit0, codesign 검증 exit0, 설치된 바이너리/JS/Info.plist 해시 일치, 앱 실행 확인. |
| S2 로그인·홈·WebView | 충족 | 기존 로그인 자동 복원, 회사·잔액64,000원·검토 중16,000원 표시, 신청 화면과 서버 데이터 로딩. 신청 화면의 개발 도구 버튼이 없고 Release 실행 후 기존 개발 측정 파일은 그대로였다. |
| S3 영수증 흐름 | 충족 — 시뮬레이터 범위 | 시스템 사진 선택창 열기/취소, 합성 PNG 선택 후201 및 첨부 완료43.8KB, 기존 거절 권한의 촬영 버튼 안내와 첨부 보존, 사진 선택 재시도/취소로 오류 해제, 홈 복귀와 신청 재진입 확인. 실제 촬영은 미검증. |
| S4 재실행·보존·기록 | 충족 | Metro 중지/HTTP timeout 동안 프로세스 재실행→로그인 홈→신청 화면 표시. Metro 재개200. 기존 첨부30행/30파일·신청10행·소속3행·세션3행 해시 보존. 새 합성 첨부1건 READY, 신규 신청0. 관련20테스트·스타일·문서/보존 검사와 기록 완료. |

## 검증 5묶음

1. **서명 실패 진단과 빌드:** [최초 실패](initial-failure.txt), [Debug/최초 Release 서명 비교](initial-signatures.json). `CODE_SIGNING_ALLOWED=NO` 산출물의 서명 식별자는 `app`, linker-signed, Info.plist 미결합이었다. 실행 PID9628에서 로그인 복원/재시도 모두 실패했고 securityd에 `SecItemCopyMatching -34018`이 기록됐다. Debug의 정상 번들 서명 식별자는 `dev.doyeon.chagok`이었다. 계정/Keychain 값을 바꾸지 않고 아래 명령으로 재빌드했다. [빌드 요약](build.log), [원본 로그 해시](build-log-info.json), [설치 산출물 대조](artifact.json). 빌드/서명 검증 exit0, 경고91줄/오류0줄. JS 번들 SHA는 최초 산출물과 동일한 `2eb6e226bc531631d22020cfa01bddbb6fed62dc9e20b829b0165525d68d6cf1`이며 Info.plist도 동일하다. 새 네이티브 바이너리 SHA는 `959f551c92f5469b611efa5c87ab99e04afeff398a70050051d3ac2b6f1c560c`. 서명 후 PID14028/16695에 대한 securityd SecError 조회는0건이었다. [Apple의 entitlement 오류 진단 안내](https://developer.apple.com/documentation/security/errsecmissingentitlement)는 서명된 앱의 entitlement를 확인하도록 안내한다. 이번 원인은 실제 장치 로그와 서명 전후 실행 결과로 확인했다.

   ```sh
   PATH="$PWD/.local-tools/node24/node_modules/.bin:$PATH" \
   DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer \
   xcodebuild -workspace apps/mobile/ios/app.xcworkspace -scheme app \
     -configuration Release -sdk iphonesimulator \
     -destination 'generic/platform=iOS Simulator' \
     -derivedDataPath /tmp/chagok-day05-release-build \
     CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=- build
   codesign --verify --deep --strict /tmp/chagok-day05-release-build/Build/Products/Release-iphonesimulator/app.app
   ```

   `xcrun simctl install ECA59080-35A7-42E0-BE0C-7E4C4A4BEFEA <app.app 경로>` 후 `xcrun simctl launch --terminate-running-process ECA59080-35A7-42E0-BE0C-7E4C4A4BEFEA dev.doyeon.chagok`으로 실행했다. DEVELOPER_DIR는 위와 같다. Debug 앱 백업은 `/tmp/chagok-day05-debug-before-release.app`, 최초 산출물 백업은 `/tmp/chagok-day05-release-linker-signed.app`에 보존했다. 현재 설치 앱은 서명된 Release다. App Store 서명/실기기 archive는 수행하지 않았다.

2. **실제 앱 UI:** CUA로 로그인 복원→홈→신청→사진 선택 취소→합성 PNG 업로드→카메라 거절 안내→사진 선택 취소→홈→재실행 후 신청 재진입을 직접 확인했다. 화면 근거는 대화의 CUA 캡처이며 별도 이미지 파일은 없다. 새 신청을 제출하지 않았다. 기존 Debug 폼의 임시 JPEG 첨부와 새 Release 폼의 임시 PNG 선택은 화면/프로세스 종료로 초기화됐지만 저장된 객체는 남았다. 입력 포커스 시 화면 확대/오른쪽 잘림은 이전 Debug에서 알려진 현상과 동일하게 관찰됐고 이번 검증에서 수정하지 않았다. 카메라 권한은 이전 작업의 거절 상태 그대로다. 신규 Google 로그인/로그아웃은 실행하지 않았다.

3. **Metro 독립 실행:** [중지/재개 원본](metro-independent.json), [UI 관찰 시각](metro-ui-observation.json). Metro PID85517을15:24:54.008 KST에 SIGSTOP, `/status`는 curl exit28/HTTP000으로 응답하지 않았다. 앱을 종료 후 실행해 새 PID16695가 됐고,15:25:27.807에 로그인된 홈,15:25:45.231에 신청 화면을 확인할 때 모두 Metro 프로세스 상태는T였다.15:25:45.325에 SIGCONT로 재개하고 HTTP200을 확인했다. watchdog/finally를 둔 약51.32초 중지이며 웹 서버와 DB는 멈추지 않았다. 시뮬레이터 전체 재부팅이나 OS 캐시 초기화 실험은 아니다. 실행 명령 반환943.67ms는 화면 준비 시간이 아니다.

4. **서버·데이터·측정:** [서버 응답 로그](server-flow.log), [보존 대조](preservation.json). PNG44888B/READY/0600/fixture SHA 일치, 기존30파일과30첨부행 보존, 신청·소속·세션 전체 해시 동일. DB는 읽기 전용으로 조회했으며 UI 업로드1건 외 조작하지 않았다. UTC 저장 timestamp는 `AT TIME ZONE 'UTC'`로 출력해 pg의 호스트 시간대 해석을 피했다. 기존 개발 journal1개/39표본의 해시가 그대로이며 새 journal은0개다. Release의 picker/prepare/upload/ACK 구간 실측은 수집하지 않았다. Next 로그의 업로드103ms는 서버 처리 관찰1회이며 클라이언트 end-to-end 지연이나 기존 Debug 성능과 비교할 수 없다. 최종3000/apply와8081/status HTTP200, 앱 PID16695 실행 중 확인.

5. **자동 검사·문서·보존:** Node24.22.3에서 `npm test -- apps/mobile/src/components/ApplyContainer.test.tsx apps/mobile/src/receipts/metrics-native.test.ts apps/mobile/src/auth/session.test.ts --maxWorkers=2` 실행, [3파일20테스트 통과](tests.log), pretest 스타일128파일 위반0. 제품 코드/설정 변경이 없어 전체310테스트·타입·웹 빌드는 반복하지 않았고 이전 통과를 이번 실행으로 재사용하지 않는다. [문서/Git/시작 해시 검사](document-check.log). 개발 서버와 앱 화면은 실제 검증에 사용했으며 화면 구현 변경이 없어 별도 브라우저 확인은 해당 없음. 사용자 수동 검토는 대기다. 커밋·push·PR 없음.

## 남은 범위와 현재 상태

- iOS **Simulator Release 클라이언트 실행**은 확인했다. 실기기 촬영·허용 후 설정 복귀, 배포 서명/TestFlight, 운영 HTTPS 서버와 원격 저장소 연동은 미검증이다.
- 실제 계정 만료/회사 변경 전체 UI, Android native 실행, 운영 예약 정리/실패 모니터는 별도 남은 항목이다.
- 현재 Device Hub iPhone17에는 Release가 설치돼 로그인된 새 신청 화면이 열려 있다. 로컬 웹 주소는 http://127.0.0.1:3000/apply 이며 브라우저는 네이티브 사진 선택 검증을 대신하지 않는다. 사용자는 앱의 사진 선택/취소와 개발 도구 숨김을 확인할 수 있다.
- 새 합성 PNG1건을 포함한 저장 파일31개는 보존했다. 제거/정리하지 않았고 재실행 뒤 신청 폼 첨부 선택은 비어 있다. 카메라는 거절 상태다.
