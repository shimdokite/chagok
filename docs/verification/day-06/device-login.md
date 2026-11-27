# Device Hub 로그인 복구

2026-11-27 23:30~23:33 KST. iPhone 17 / iOS 27.2, 기존 Release 앱, Next 개발 서버 localhost:3000, PostgreSQL 18.6 localhost:55432.

## 원인과 조치

사용자 제보: “Device Hub에서 차곡앱 구글 로그인이 안되는데”. 화면에는 Google 버튼 비활성화와 “로그인을 확인하지 못했어요”가 표시됐다. 이는 Google 인증 시작 실패가 아니라 저장된 세션 복원 실패였다. 서버 로그에서 `GET /api/trpc/auth.session` 500을 확인했고, 로컬 DB 직접 연결은 `ECONNREFUSED`, 포트55432 리스너는 없었다. DB 프로세스가 중지된 이유는 확인하지 못했다.

기존 `.local-tools/postgres/start.mjs`를 프로젝트 Node24로 실행해 기존 데이터 디렉터리의 DB를 재시작했다. 제품 코드·OAuth 설정·앱 저장 토큰은 변경하지 않았다. Device Hub의 **다시 시도**를 눌러 그로브 홈과 사용 가능63,999원, 검토 중16,001원, 승인20,000원을 확인했다. 새 Google 인증이나 보조 계정 전환을 확인한 것은 아니다.

## AC와 검증

1. **DB 연결 복구 — 충족(자동):** `PATH="$PWD/.local-tools/node24/node_modules/.bin:$PATH" node .local-tools/postgres/start.mjs`가 PostgreSQL18.6 ready를 반환했다. DB 조회 성공. 이전 비공개 기준 스냅샷과 기존 신청13건·소속4건의 모든 저장 필드를 대조해 일치했다.
2. **세션500 해소 — 충족(자동/실제 앱):** 동일한 테스트용 가짜 토큰 요청이 복구 전500 → 복구 후 정상적인 인증 거부401. 실제 앱의 세션 조회는200/16ms, 홈 조회는200/76ms였다. 서버 기록의 단일 개발 요청 시간이며 성능 일반화는 하지 않는다. [서버 로그](dev-server.log).
3. **앱 복구 — 충족(직접 화면 확인):** Device Hub의 다시 시도 후 그로브 홈과 잔액63,999원 확인. 사용자의 별도 인수 확인과 보조 계정 신규 로그인은 미검증이다.
4. **관련 회귀 검사 — 충족(자동):** Node24에서 `npm test -- apps/mobile/src/auth/session.test.ts packages/api/src/auth/service.test.ts packages/api/src/http.test.ts --maxWorkers=2` 실행, 3파일27테스트 통과, pretest 스타일149파일0위반, exit0. 코드 변경이 없어 전체 빌드·타입 검사는 재실행하지 않았다.
5. **문서/학습 제외 — 충족(자동):** `git diff --check`, 문서 링크·PR/커밋 필수 구성 검사. 학습 파일은 로컬 보존·ignored이며 tracked/staged/기준 브랜치 diff에서 제외됐다. 커밋·push·PR 생성 없음.

## 재현 시 확인 순서

로컬 API 서버뿐 아니라 PostgreSQL도 실행돼 있어야 한다. 같은 증상이 나면 DB55432 연결을 먼저 확인하고 기존 시작 스크립트를 실행한 뒤 앱에서 **다시 시도**한다. DB를 초기화하거나 Google 클라이언트를 새로 만들 필요는 없다. 이 기록은 현재 중지 상태의 복구이며 자동 시작·상시 운영 보장을 추가한 변경은 아니다.
