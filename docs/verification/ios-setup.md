# iOS 개발 환경 준비 — 2026-11-13 KST

상태: **설치·부팅·차곡 Development Build 실행과 시뮬레이터 검증 완료.** 아래 최초 조사와 재개 기록을 구분합니다.

## 중단 전 조사 (macOS 업데이트 이전)

- macOS 15.6.1 (24G90), Apple Silicon arm64.
- Data volume 여유 공간 약 265GiB.
- Xcode.app 없음. `xcode-select -p`: `/Library/Developer/CommandLineTools`.
- App Store Xcode 상세 화면: **macOS 26.6 이상 필요**. 현재 OS와 호환되지 않음.
- Apple 시스템 요구 표에서 **Xcode 26.3은 macOS 15.6 이상 지원** 확인.
- 설치된 RN의 `scripts/cocoapods/helpers.rb`: min_xcode_version_supported = 16.1.
- 시스템 Ruby 2.6.10; `pod` 명령은 초기 조사에서 없음.

## 중단 전 계획

OS 업그레이드 없이 공식 Apple Developer에서 Xcode 26.3을 다운로드하고 설치한다. Apple 로그인 페이지를 Chrome에 열고 사용자 로그인을 요청했다. 로그인·추가 약관·관리자 인증이 필요한 경우 사용자의 직접 입력/동의 후 이어간다.

설치 뒤 Xcode 최초 실행, iOS runtime 다운로드, simctl runtime/device 목록 및 시뮬레이터 부팅을 검증한다. 필요하면 차곡 네이티브 빌드를 위한 CocoaPods도 준비한다. 아직 어느 항목도 설치 완료로 판정하지 않는다.

공식 근거: https://developer.apple.com/xcode/system-requirements
다운로드: https://developer.apple.com/download/all/?q=Xcode%2026.3

## OS 업데이트 후 재개

사용자가 macOS와 Xcode를 직접 설치한 뒤 재개를 요청했습니다. Xcode 약관 화면은 사용자가 직접 동의했고 ‘동의 완료’ 응답 후 `xcodebuild -checkFirstLaunchStatus`가 성공했습니다.

- macOS 27.2.1 (26B131), arm64 / Xcode 27.2 (27B52).
- 전역 `xcode-select`는 CommandLineTools를 가리키므로 명령별 `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer` 지정.
- iOS 27.2 Simulator (24B8117) arm64, 8.32GB 공식 런타임 다운로드.
- Node 24.22.3을 `.local-tools/node24`에 복구.
- Homebrew CocoaPods 설치: ca-certificates 링크 충돌, 재시도에서 Ruby 후처리 `unknown install step: remove`로 실패. 로그 보존. 설치된 Ruby 4.0.9의 직접 실행은 성공.
- 공식 RubyGems의 CocoaPods 1.17.0을 `.local-tools/gems`에 설치 성공(42 gems). 시스템 Ruby 2.6은 유지.
- 설치 중 Homebrew가 openssl@4를 추가하고 openssl@3 링크를 해제했음. 이는 의존성 설치 결과이며 앱 소스 변경이 아님. 관련 없는 tap 신뢰 설정은 변경하지 않음.

### 재사용할 셸 환경

```sh
export PATH="$PWD/.local-tools/node24/node_modules/.bin:$PWD/.local-tools/gems/bin:/opt/homebrew/opt/ruby/bin:$PATH"
export GEM_HOME="$PWD/.local-tools/gems"
export GEM_PATH="$GEM_HOME"
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
```

프로젝트 루트에서 설정합니다. `pod install`은 `apps/mobile/ios`에서 실행합니다. SDK는 컴파일 도구, Simulator Runtime은 실행할 iOS 이미지이므로 Xcode 앱 설치만으로 둘 다 준비되는 것은 아닙니다. 원본 로그는 `native/`에 보관합니다.

### 빌드·런타임 준비 결과

- CocoaPods 설치와 `pod install` exit 0. Xcode Debug arm64 Simulator 빌드 exit 0 (`BUILD SUCCEEDED`). 앱 0.1.0 (1), bundle ID `dev.doyeon.chagok`.
- iOS 27.2 (24B8117) 런타임 등록 `isAvailable=true`, 디스크 이미지 `Ready` 확인. `xcodebuild -downloadPlatform iOS`가 뒤이어 24B91016s 추가 다운로드를 시작하여 해당 다운로드는 중단(exit 70). 필요한 24B8117 설치 성공 여부는 exit code 대신 simctl 상태로 별도 확인.
- Xcode 27의 실행 앱은 기존 Simulator.app 대신 `/Applications/Xcode.app/Contents/Applications/DeviceHub.app`. [Apple Device Hub 문서](https://developer.apple.com/documentation/xcode/managing-your-simulated-and-physical-devices-in-device-hub) 참고.
- 최초 Device Hub 열기가 장시간 지연되고 기기가 Shutting Down 상태가 됨. 로그에서 런타임 마운트 경로가 바뀐 직후 이전 경로에 malformed bundle 경고 관찰. 새 경로는 available/Ready. 종료 완료 뒤 Device Hub의 Start로 재부팅.
- 시뮬레이터: iPhone 17, UDID `ECA59080-35A7-42E0-BE0C-7E4C4A4BEFEA`.


### 최종 실행 확인

iPhone17/iOS27.2가 Booted 상태이며 차곡 홈을 Device Hub에 열어 두었습니다. 로그인/홈, 실제 API 성공·중단·복구, WebView 준비·닫기·재로드, 실측20회 및 취소/재진입 원본4건을 확인했습니다. 최신 AC는 `../acceptance-day-01.md`, 실측은 `../metrics/daily/day-01.md`를 참고합니다.

기존 전역 xcode-select 경로는 변경하지 않았습니다. 새 터미널에서는 위 DEVELOPER_DIR/Node/Ruby/GEM_HOME 설정을 적용해야 합니다. 실제 iPhone과 Android 준비는 이번 범위에 포함하지 않았습니다.
