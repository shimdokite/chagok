# iOS 검증 재개 — 2026-11-13

이 디렉터리는 OS 업데이트 뒤 실행한 원본 로그입니다. 최초 작업의 `../native-build-attempt.log`는 Xcode 미설치 상태에서의 실패 기록이며 삭제하지 않습니다.

- `resume-environment.txt`: 재개 시점 환경.
- `ios-runtime-download.log`: Apple iOS 시뮬레이터 런타임 다운로드/설치.
- `cocoapods-install*.log`: Homebrew 설치 실패 기록. Ruby 설치 후처리에서 실패.
- `cocoapods-gem-install.log`: 프로젝트 전용 gem 경로 설치 성공.
- `pod-install.log`: 네이티브 의존성 설치 로그.
- `xcodebuild.log`: Debug / arm64 / iOS Simulator 빌드 로그.
- `typecheck.log`, `tests.log`: 계측 환경값 설정 변경 후 검사, 33테스트 통과.
- `app-source-sha256.txt`: 측정 시 앱·웹·계약·설정 45개 파일의 SHA256 목록. 이 파일 자체의 SHA256을 원본 JSON의 sourceRef로 사용. 문서·생성 산출물·환경별 로컬 파일은 제외.

실행 환경은 macOS 27.2.1, Xcode 27.2, Node 24.22.3, Ruby 4.0.9, CocoaPods 1.17.0입니다. 네이티브 빌드 명령:

```sh
xcodebuild -workspace apps/mobile/ios/app.xcworkspace -scheme app \
  -configuration Debug -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath .local-tools/DerivedData \
  CODE_SIGNING_ALLOWED=NO ARCHS=arm64 ONLY_ACTIVE_ARCH=YES build
```

도구 경로 환경은 `../ios-setup.md`를 참고합니다. `CODE_SIGNING_ALLOWED=NO`는 로컬 시뮬레이터 빌드 조건으로, 실제 iPhone 배포를 확인한 것이 아닙니다. 산출물은 `.local-tools/DerivedData/Build/Products/Debug-iphonesimulator/app.app`입니다.

## 실행 중 발견한 수정

Next 16.4.6 개발 리소스는 기본적으로 localhost 이외 origin을 차단합니다. iOS WebView의 127.0.0.1에서 HMR 요청이 403이었고 웹 수신기가 준비되지 않았습니다. `next.config.ts`에 `allowedDevOrigins: ['127.0.0.1']`만 추가했습니다. HTTP 진단 요청은 변경 전 403, 변경 후 일반 GET 404(WebSocket handshake가 아닌 진단 요청), 미허용 `untrusted.example`은 계속 403입니다. 실제 WebView에서는 변경 후 WEB_READY 수신을 관찰했습니다. `dev-origin-*.headers`와 앱/웹 로그 참조.

iOS 날짜 입력의 기본 최소 너비로 오른쪽이 넘치는 것을 관찰하여 폼 label과 입력 컨트롤에 `min-width: 0`을 지정했고, 이것만으로 해결되지 않아 date 입력의 `appearance: none`까지 적용한 뒤 정상 너비를 확인했습니다. 이 변경은 비활성 폼의 화면 폭 처리만 조정합니다.
