# 폼 연결 독립 리뷰와 조치

2026-11-19, 읽기 전용 독립 리뷰 1회. 수정 뒤 재리뷰를 했다고 주장하지 않으며 회귀 테스트와 실제 실행으로 확인한다.

| 발견 | 조치와 근거 |
| --- | --- |
| 폼 A사 표시 후 소속 B사 변경 시 B사 저장 | 앱이 expectedCompanyId 비교값을 추가하고 소속 잠금 안에서 불일치 FORBIDDEN. 웹 payload에는 이 필드를 허용하지 않는다. 실제 DB RED→GREEN |
| foreground busy 중 초기 연결/응답이 사용 불가 | 기존 blocking overlay 아래 유효한 같은 세션 scope를 유지. claimAccess 회귀와 iOS foreground/실제 제출 |
| 일반 HTTP 개발 origin의 randomUUID 미지원 | getRandomValues UUID v4, randomUUID 없는 테스트 RED→GREEN |
| 확정 거부 뒤 과거 한도로 재활성화 | BAD_REQUEST/정책 거부는 같은 월 재조회 뒤 활성화, 인증 거부는 error로 제출 차단, 앱 세션 재검증 |
| 응답 유실/abort 뒤 성공 여부가 불명확할 때 캐시 유지 | 생성 시도 finally에서 무효화, 종료된 연결에는 응답 전달 안 함. 실패 캐시 회귀 RED→GREEN |
| 개발 진단 JSON에 신청 본문 유출 | probe의 raw data 기록 제거, origin/decision만 보존. 실제 컴포넌트 회귀 RED→GREEN |
| 예전 앱이 FORM_INIT를 보내지 않으면 무한 대기 | 12초 초기 연결 timeout과 업데이트/재진입 안내, 가짜 시계 회귀 |
| pagehide 후 복원된 문서가 수신기/타이머를 잃음 | persisted pageshow 재연결, 불명확한 기존 제출은 새 제출 대신 내역 확인 안내로 잠금, 상태 회귀 |

판단: busy는 새 로그인 상태가 아니라 기존 세션의 재검증이며 새 signIn/signOut에는 같은 범위를 적용하지 않는다. 서버는 매 요청 인증을 확인하고 소속 비교는 저장 잠금 안에서 수행한다.

평가 제외: 영수증 첨부와 완전 재로드 이후 초안 영구 복구는 기존 범위 밖이다. 사용자는 진행 중 닫기/재로드 후 내역부터 확인해야 하며 기록되지 않은 요청을 자동 재생성하지 않는다. 실측/시뮬레이터와 작성 중 문서는 별도 실행 근거로 확인했다. 이 제외 항목을 완료로 바꾸지 않는다.

별도로 남긴 사소한 수정 권고 없음. 새 의존성/버전 업그레이드 없음.
