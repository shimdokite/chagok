# 3일차 PR 준비 점검 — 2026-11-17 KST

예정 제목: **feat(repo): 회사별 복지 조회와 계정별 캐시 구현**

기준은 원격 `main`과 현재 HEAD가 같은 `4be4ffb0068eb8be03a2527d263ecbcef790b454`이다. 일반 환경의 `git ls-remote`는 DNS 제한으로 실패했고 허용된 읽기 전용 실행에서 같은 원격 커밋을 확인했다. 현재 브랜치는 `main`이며 게시 승인 후 사용할 예정 브랜치는 `feat/day-03-benefits`다. 이번에는 브랜치 생성·staging·commit·push·PR을 수행하지 않았다.

## 누적 범위와 보존

- 회사·소속·월 정책·신청 모델과 두 migration, 서버 세션 기반 회사/본인 조회 권한, 계산·월·커서 페이지, 로컬 샘플 준비·명시 연결.
- 실제 홈·내역·상세·복지안내, 익명 데모 분리, 사용자/회사/월/필터 캐시·취소·오류 복구, 큰 글자 카테고리 여백.
- import 묶음 뒤·함수 앞뒤 간격 컨벤션과 검사기, 기존 코드의 간격 정리, 테스트·계획·검증·측정 문서. 최신 초안 두 개는 누적 범위로 재작성했다.
- `handoff.md`, 환경 파일, 빌드 산출물, 로컬 학습 파일은 게시 후보에서 제외했다. 학습 본문을 초안이나 공개 문서에 복사하지 않았다.

시작 상태는 `/tmp/chagok-day03-pr-baseline.diff`와 파일 SHA-256 기준에 보관했다. 준비 중 소스 추가 변경은 `benefits/api.ts`, `queries.ts`, 신규 `queries.test.ts`이며 아래 리뷰 결함 수정이다. 기존 측정·사용자 확인·과거 실패 로그는 보존했다. [게시 후보 목록](files.json), [최종 소스 해시](source-sha256.json), [문서·보존 검사](checks.json).

## 학습 파일 추적 상태

`git ls-files -- docs/learning`, HEAD 및 origin/main의 해당 경로 트리가 모두 비어 있다. 2일차 커밋 `5d9c3dd`에서 추적 제거했고 PR #4로 병합된 상태다. 따라서 이미 제외된 파일에 `git rm --cached`를 다시 실행하지 않았다. `.gitignore`의 `/docs/learning/` 규칙이 세 파일에 적용되며, 작업 전후 로컬 파일 해시가 같고 staged diff·기준 브랜치 대비 학습 경로 diff도 비어 있다. 오래된 staged 삭제 대기 설명을 현재 상태로 정정했다.

## 독립 리뷰와 수정

기준 커밋 대비 tracked diff와 신규 기능 파일을 포함해 읽기 전용 독립 리뷰를 수행했다. P2 한 건: 없는 상세의 `NOT_FOUND`가 세션 재확인을 유발하고 `busy → authenticated` 전환이 쿼리를 재활성화해 상세/세션 호출이 반복됐다. 리뷰 재현에서는 100ms에 각9회 호출됐으며 기존 `retry:false`로 차단되지 않았다.

실제 조회 Hook의 옵션·queryFn, 실제 QueryObserver·SessionController·tRPC 클라이언트를 연결하고 네이티브 훅 호스트/HTTP/시간만 통제한 회귀 테스트를 추가했다. 최초 [RED](detail-regression-red.log)는 종료 오류 대신 pending을 유지했다. 첫 수정의 공통 재확인 플래그가 이후 `UNAUTHORIZED`까지 막는 것을 재검토에서 발견해 [순서 RED](detail-auth-red.log)로 확인했다.

최종 구현은 연속 `NOT_FOUND`의 세션 확인을 한 번으로 제한하고, `UNAUTHORIZED`는 항상 인증 복구로 보낸다. 회사 검증까지 성공한 조회 또는 인증 범위 재마운트에서 제한이 초기화된다. 오류 상태에서 수동 재시도는 조회 한 번을 수행하며 세션 재확인 루프를 만들지 않는다. [GREEN](detail-regression-green.log): 캐시/조회2파일12개 통과. 이후 전체156개 통과 및 독립 재검토 추가 지적 없음. 테스트는 네이티브 이벤트·React 동시성 전체를 모델링하지 않는다.

리뷰 제외 항목은 기존 승인 범위를 따른다: 신청 생성/첨부/승인, 운영용 소속 이동·삭제 이력 보존, Android 실제 실행, 성능 벤치마크 확대. 현재 읽기 전용 API에 없는 달력 날짜 입력 경로는 향후 쓰기 API에서 다룬다. 이 항목을 구현하거나 검증했다고 표시하지 않았다.

## 최종 검증 — 8그룹

환경: macOS arm64, 프로젝트 Node24, 로컬 PostgreSQL 127.0.0.1:55432/chagok, Next16.4.6, Expo58, Device Hub iOS27.2. 아래 명령은 저장소 루트에서 프로젝트 Node24 PATH를 사용했다. 비밀 환경값은 출력하지 않았다.

1. **전체 테스트·스타일:** 환경 파일을 Node `--env-file`로 읽고 자식 `npm test`에 `CHAGOK_TEST_DATABASE_URL=DATABASE_URL`을 전달했다. 최초 샌드박스 DB 접속 EPERM은 [실패 로그](tests-sandbox-failed.log)로 보존. 허용 환경의 리뷰 전153개, 수정 후 **18파일156개·skip0·exit0**, pretest **88파일 간격 위반0**. [최종 로그](tests.log). 임시 DB 데이터는 기존 테스트 정리 로직을 따른다.
2. **타입·DB 상태:** `npm run typecheck` 4개 workspace exit0 ([로그](typecheck.log)). `node --env-file=apps/web/.env.local node_modules/prisma/build/index.js migrate status --config packages/api/prisma.config.ts` exit0, schema up to date ([로그](migrations.log)). 최초 `--schema`만 준 명령은 config 미발견으로 [실패](migrations-config-failed.log)했고 설정 경로를 명시해 바로잡았다. migration 추가 적용·DB 초기화는 하지 않았다.
3. **웹 빌드:** 이번 `npm run build:web`는 Turbopack CSS worker 포트 바인딩 EPERM으로 exit1 ([로그](build.log)). 같은 웹 소스의 사용자 일반 터미널 기본 빌드 성공은 [기존 제공 로그](../followup/user-confirmation.md)로 구분한다. 이번 `npm run build -w @chagok/web -- --webpack`은 exit0 ([로그](build-webpack.log)). webpack 성공을 이번 Turbopack 재실행 성공으로 바꾸지 않는다.
4. **모바일 export:** 수정 후 `npm exec -w @chagok/mobile -- expo export --platform ios --platform android --output-dir /tmp/chagok-day03-pr-export` exit0 ([로그](export.log)). 양 플랫폼 JS bundle 생성이며 Android 기기 실행을 의미하지 않는다.
5. **화면:** 기존 Next3000·Metro8081·웹8082 실행 확인. 브라우저 로그인→데모 홈65000원→상세15000원·사용일·상태 확인. iOS 실제 계정 홈→정상 상세→새로고침 후 내용 유지→홈65000원 복귀 확인 ([화면](ios-detail.png)). 현재 표시 설정은 Light/Text Size2로 관찰됐으며 바꾸지 않았다. 이전 사용자 확인의 Light/3·Dark/11 결과와 분리한다. 없는 상세의 네이티브 조작 재현은 이번에 수행하지 않았고 통합 회귀 테스트로 확인했다. 데모 상세 `http://localhost:8082/requests/demo-3` 탭을 열어 두었다.
6. **AC·사용자 확인·측정:** 승인된 D3-01~08 충족 근거를 대조했다. 계정 전환·큰 글자·기본 설정 복원은 [사용자 확인](../followup/user-confirmation.md)을 보존. 홈 요청1→0→1/1002바이트의 [원본과 한계](../../../metrics/daily/day-03.md)를 확인했으며 이번에 측정을 재실행하거나 개선율을 만들지 않았다.
7. **공개 범위·보존:** tracked diff와 untracked 후보를 함께 검사. 환경 비밀값의 문자열/키 패턴 검사 및 로컬 Markdown 링크 검사, 학습3개·handoff 해시 보존, 학습 tracked0·Git 제외·staged diff 비어 있음 확인. 이미지에는 샘플 화면만 포함되며 사용자 계정 ID·토큰은 넣지 않았다. 후보 파일 목록은 실제 staging 대상 확정 전에 다시 확인한다.
8. **문서·초안·diff:** 최신 상태와 계획의 AC 일치, PR 필수5절·커밋 필수4필드, `git diff --check` 및 신규 파일의 줄 끝 공백 검사. 로컬 학습 내용을 공개 초안에 복사하지 않음. 신규 파일은 `git diff --no-index --check /dev/null <파일>`로도 검사했다. 이 명령의 exit1은 파일 차이를 뜻하므로 검사 스크립트의 최초 실패 판정을 바로잡았다. 원본 실행 로그의 줄 끝 공백8줄과 파일 끝 빈 줄은 보존했으며 코드·문서 검사와 구분한다. 최종 점검 수치는 [checks.json](checks.json)에 남긴다.

## 준비 AC

| AC | 상태 | 근거 |
| --- | --- | --- |
| P1 누적 범위·리뷰 | 충족 | tracked·신규 파일 포함 독립 리뷰, P2 반복 조회 수정 후 재검토 지적 없음. |
| P2 최종 실행·제품 AC | 충족 | 전체156개/타입/webpack/양 플랫폼 export와 D3-01~08 근거 대조. 이번 기본 Turbopack EPERM과 기존 사용자 성공 근거를 구분. |
| P3 학습 보존·게시 제외 | 충족 | 로컬3개 해시 동일, tracked0, Git 제외 적용, 학습 경로 diff 없음. 추가 추적 제거 불필요. |
| P4 전체 초안·증거 | 충족 | 누적 범위 제목·PR/커밋 초안과 최종 검증 기록 작성, 링크·형식 검사. |
| P5 게시 전 사용자 검토 | 충족 | 최종 초안을 제시하고 commit·push·PR은 실행하지 않음. 실제 게시 승인은 별도 대기. |

## 사이드이펙트와 남은 경계

배포 시 Prisma generate·두 migration·서버 재시작이 필요하며 서버 세션/회사별 캐시를 함께 배포해야 한다. Claim의 소속 갱신 제한은 과거 신청 재귀속을 막지만 직접 DB 사용자·소속 삭제의 cascade와 운영 이력 보존은 별도 설계다. 30초 캐시는 DB 변경을 실시간 전달하지 않는다. 오류 반복 수정은 세션 확인 횟수를 제한하며 인증 거부 복구와 수동 조회는 유지한다.

Android 실제 실행, 물리 iPhone, 스크린리더, Release 성능은 별도 미검증이다. 사용자가 이미 수행한 화면 검증을 반복 요청하지 않는다. 이번 수정의 실제 기기에서 없는 상세 링크를 여는 검증은 자동 회귀와 별개이며, 추후 확인한다면 오류 안내가 유지되고 화면 차단이 반복되지 않는지 확인한다. merge는 이번 준비·게시 승인 범위에 포함하지 않는다.
