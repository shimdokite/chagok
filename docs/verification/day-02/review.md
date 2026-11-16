# 독립 코드 리뷰와 조치

2026-11-16, 읽기 전용 별도 리뷰 에이전트. main HEAD86a95a2 대비 이번 소스·신규 인증 파일 검토. 기존 사용자 문서·학습 내용은 수정하지 않음.

- Critical 0.
- Important 1: 정상 foreground 세션 검증 중 Stack.Protected guard가 false가 되어 신청 화면을 잃음. **수정:** busy 중 기존 session을 유지하고 `canAccessApp`이 해당 상태를 허용; overlay로 조작 차단, 검증 실패 시 session 제거. 재현 테스트 RED→GREEN.
- Minor 1: tRPC가 감싼 TimeoutError를 일반 실패로 기록. **측정 AC 영향으로 Important로 재분류·수정:** `cause`를 최대3단계 확인, DOMException 숫자 code보다 TimeoutError 이름 우선. 실제 TRPCClientError로 재현 RED→GREEN.
- 보류한 minor 없음. 수정 후 독립 재리뷰를 주장하지 않음; 구현자의 재현·전체 스위트 재검증.
- 실제 Google 계정 흐름, native build/실제 WebView, 실제 복원10회와 디자인 시각 검증은 리뷰 판정 보류. 이들은 `../day-02.md`의 실행 결과·미검증 상태를 따름.
