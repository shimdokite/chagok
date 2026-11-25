# Android WebView 발신 프레임 검사

`react-native-webview`는14.0.1로 고정한다. 이 버전의 Android `WebMessageListener`는 메시지 URL에 `sourceOrigin`을 전달하지만 `isMainFrame`을 사용하지 않는다. 패치는 하위 프레임의 직접 송신을 거부한다. 발신 프레임을 식별할 수 없는 `addJavascriptInterface` fallback은 노출하지 않는다.

같은 버전은 `doUpdateVisitedHistory`마다 `load-start`를 발생시킨다. 실제 Android에서 Next의 동일 URL `history.replaceState`가 WEB_READY 직후 브릿지를 다시 초기화해15초 timeout을 일으켰다. 패치는 실제 `onPageStarted`에서 load-start를 보내며, 같은 URL의 history 갱신은 생략한다. 경로·query·hash가 달라진 history 이벤트는 계속 보내므로 호스트의 exact `/apply` 검사가 유지된다. 실제 같은 URL 새로고침도 `onPageStarted`를 거쳐 초기화된다.

- `npm install`/`npm ci`의 `postinstall`에서 `patch-package --error-on-fail`을 실행한다. 로컬 Android prebuild 명령도 패치를 먼저 적용한다. `--ignore-scripts`로 설치했다면 네이티브 빌드 전에 `npm run postinstall`을 실행해야 한다.
- `WEB_MESSAGE_LISTENER`를 지원하지 않는 구형 Android System WebView에서는 신청 브릿지가 연결되지 않는다. 현재 UI는15초 뒤 연결 실패/재시도를 표시한다. System WebView 업데이트가 필요하며 해당 구형 환경의 호환성은 지원하지 않는다.
- 버전 업그레이드 시 upstream의 origin·frame·load/history 전달 방식과 패치 적용을 다시 검토한다. 최상위 WEB_READY, 같은 URL history 이후 안정성, hard reload, 다른 경로 차단 및 srcdoc/about:blank 직접 송신 거부를 에뮬레이터에서 재검증한다.
- CSP는 추가 방어다. `frame-src 'none'`만으로 srcdoc/about:blank 메시지가 차단된다고 간주하지 않는다. 같은 origin에서 임의 스크립트가 부모 창을 제어하는 상황은 별도 신뢰 경계이며 이 패치가 XSS를 방지한다고 주장하지 않는다.

공식 적용 방법: [patch-package](https://github.com/ds300/patch-package). 검증 결과: [Android 브릿지 후속](../docs/verification/day-05/android-fix/result.md).
