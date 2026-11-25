# 변경 리뷰 — 2026-11-25

별도 읽기 전용 리뷰는 이번 source validator, ApplyContainer, Expo local network, Next config, 테스트와 네이티브 패치만 확인했다. 이전 Day5 전체 변경·OAuth·실기기·원격은 범위 밖이다. 리뷰어는 파일 수정·테스트·UI를 실행하지 않았다. 실행 증거는 주 작업자의 테스트와 ADB 결과다.

1. 최초 리뷰: CSP만으로 srcdoc/about:blank 직접 메시지를 격리할 수 없다는 P1. 실제 srcdoc CLOSE로 홈 이동을 재현한 뒤 isMainFrame 검사와 구형 fallback 비노출 패치를 추가했다.
2. 패치 재검토: 고정 버전·설치 적용·실패 시 exit1·문서화된 구형 호환성 제한을 확인했다. 직접 프레임 송신 경로의 P1은 코드상 해결. 부모 창 제어/XSS는 별도 신뢰 경계로 남겼다.
3. 수명 보완 리뷰: 실제 onPageStarted는 같은 URL reload도 초기화하고 동일 URL history만 생략한다. 다른 경로/query/hash 이벤트는 호스트 검사를 유지한다. 앱의 WebView 사용처는 ApplyContainer 한 곳이다. 중요 지적 없음. patches/README의 원인·재검증 목록 보완 의견을 반영했다.

최종 실행 검증은 [결과와 한계](result.md)를 따른다. 리뷰 통과 자체를 에뮬레이터·배포 승인으로 간주하지 않는다.
