# 3일차 홈 조회 측정

2026-11-17 KST. [원본](../../verification/day-03/home-metrics.json). Node24.22.3, host-local Next 개발 서버/PostgreSQL, 가상 사용자에게 발급한 실제 DB 세션과 앱의 BenefitsCache를 사용했다.

| 시나리오 | 홈 HTTP 요청 | 비압축 JSON 바이트 | 실행 시간 |
| --- | --- | --- | --- |
| 빈 클라이언트 캐시 | 1 | 1,002 | 121.25ms |
| 30초 이내 재조회 | 0 | 0 | 0.059ms |
| invalidate 후 수동 갱신 | 1 | 1,002 | 24.79ms |

HTTP 두 응답 모두 200, available=65000을 검사했다. 토큰·사용자/회사 식별자·응답 본문은 원본에 저장하지 않았다. 테스트 계정과 세션은 finally에서 제거한다. 기본 가상 회사/정책/fixture는 개발용으로 남는다.

재현: 루트에서 Node24로 `node --env-file=apps/web/.env.local --experimental-strip-types packages/api/scripts/measure-benefits.ts`를 실행한다. localhost:3000 개발 서버와 로컬 chagok DB가 필요하다. 원본 파일은 최근 실행으로 교체된다.

측정 범위는 **로그인 후 홈 요약 쿼리만**이다. auth.session, Google 로그인, health 개발 도구 호출, 브라우저/RN 렌더 시간, 압축·헤더·TLS 바이트는 제외한다. 각 시나리오 1회이며 성능 개선율·백분위·실기기 성능 근거가 아니다. `cold`는 클라이언트 캐시만 비었음을 뜻하고 서버 콜드 스타트가 아니다. 초기 서버 재시작 직후 별도 탐색은 952.95ms였으며 최종 원본과 섞어 평균내지 않는다.

최초 측정은 새 Prisma 모델을 반영하지 못한 기존 서버에서 HTTP500으로 실패했다. 서버를 재시작한 뒤 성공했으며, 실패를 정상 표본에서 숨기지 않고 여기에 기록한다. 1·2일차 브리지/세션 원본은 변경하지 않았다.
