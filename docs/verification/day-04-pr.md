# 4일차 전체 변경 PR 준비 검증

2026-11-19 KST. 사용자가 4일차 결과를 확인하고 서버 API와 폼 연결 전체의 commit·push·PR을 승인했다. 기준은 fetch 후에도 같은 `origin/main`/HEAD `5a7725a992a7eb25a235a76170ad073ff64fec9c`다. [서버 단계](day-04.md)와 [폼 단계](day-04-form.md)는 당시 기록으로 보존한다.

## 범위와 AC

| ID | 상태 | 확인 방법·결과 |
| --- | --- | --- |
| PR1 전체 검토 | 충족 | 신규/미추적 파일까지 서버·계약·migration·앱·폼·테스트·측정 도구 검토. 전체 독립 리뷰 P2 1건 수정 후 세 파일 제한적 재리뷰, 새 Critical/Important 없음 |
| PR2 검증 | 충족 | 최종 실제 DB232테스트 skip0, 스타일103파일 위반0, 타입4개 통과. 이번 웹 webpack production 빌드 통과, migration4개 최신 |
| PR3 로컬 자료 제외 | 충족 | 학습/인계/next-env 시작 바이트 해시 보존. 학습 미추적·ignore 유지, 명시적 staging 후 staged 및 main 대비 전체 diff 별도 검사. [검사 결과](day-04-pr/checks.log) |
| PR4 범위에 맞는 초안 | 충족 | 서버 migration부터 폼/계측까지 포함한 PR·커밋 초안. 신규 배포와 rollback 조건·미검증 범위 명시 |
| PR5 게시 | 커밋 직전 확인 | `feat/day-04-claim-flow`에서 검증된 범위만 커밋하고 origin push, main 대상 PR 생성. 실제 커밋·원격/PR 결과는 게시 완료 응답으로 확인하며 이 파일에 미리 성공을 기록하지 않음 |

## 이번 실행 (6개 검증 묶음)

1. **전체 테스트**: Node24.18.0, 실제 로컬 PostgreSQL18.6. 최종 `npm test` 25파일232개 통과/실패0/skip0 [로그](day-04-pr/tests.log). 기존 서버/폼228개+신규 취소 경계4개. 첫 샌드박스 실행은 DB connect EPERM으로17실패/211통과 [실패 원본](day-04-pr/tests-sandbox-failed.log); 허용 환경에서 보정 전228개 [로그](day-04-pr/tests-before-review.log), 보정 후232개를 재실행했다.
2. **스타일·타입**: `npm run style:check` 103파일 위반0 [로그](day-04-pr/style.log), `npm run typecheck` mobile/web/api/contracts 통과 [로그](day-04-pr/typecheck.log). 신규 테스트의 초기 간격 위반6건은 정정했다. 빌드가 바꾼 next-env는 시작 바이트로 복원했다.
3. **빌드·DB 배포 상태**: `npm run build -w @chagok/web -- --webpack` exit0 [로그](day-04-pr/build.log), Prisma migrate status 4개 migration 최신 [로그](day-04-pr/migration-status.log). 최초 sandbox 상태 검사 실패도 [보존](day-04-pr/migration-sandbox-failed.log). 빌드는 리뷰 전 실행했으며 이후 수정은 mobile 두 파일과 테스트/문서뿐으로 웹 빌드 입력은 동일하다. 기본 production Turbopack은 미실행이다.
4. **리뷰 회귀**: 발송된 생성 요청을 화면 close/reset이 abort하면서 캐시가 commit보다 먼저 옛 값을 조회하는 경합. 실제 benefitsClient·ClaimHost·활성 QueryObserver와 abort-aware fetch 대역으로 RED2실패/2통과 [로그](day-04-pr/review-red.log) 후 수정, 호스트/컨테이너 포함 집중22통과 [로그](day-04-pr/review-green.log). 발송 전 취소와 조회 취소,8초 제한 유지. [리뷰 판정](day-04-pr/review.md).
5. **기존 실측 대조**: 이전 Chrome/iOS 각10개 실제 결과와 원본/환경/소스 해시를 대조. [측정 문서](../metrics/daily/day-04.md). 이번 수정은 native HTTP 취소 수명이며 이전 수치를 새 코드의 측정이라고 재사용하지 않는다. 웹 UI는 변경하지 않았고 사용자가 앞선 결과 확인을 알려왔으므로 이번 별도 서버 실행/화면 열기는 해당 없음이다. 개별 수동 체크를 통과했다고 추정하지 않는다.
6. **Git·문서·민감정보**: 시작 status/unstaged/staged diff와 보존 파일30개 해시를 /tmp에 저장. 명시적 파일 목록, whitespace/문서 링크/초안 구조/소스 해시/민감값 검사 및 staged/PR 전체 범위 점검. 학습 경로는 다시 삭제하거나 강제 추가하지 않음. 전체 staged `git diff --check`는 원본 실행 로그의 trailing whitespace/blank-at-EOF 때문에 exit2였다. 경고가 모두 `docs/verification/**/*.log` 안임을 확인하고 원본을 보존했다. 로그만 명시적으로 제외한 코드·문서 검사는 exit0이다. [현재 소스](day-04-pr/source.sha256), [검사](day-04-pr/checks.log).

전체 테스트는 프로젝트 루트에서 다음과 같이 실행했다. 값은 로그에 출력하지 않았다.

```sh
PATH=/Users/doyeon/.nvm/versions/node/v24.18.0/bin:$PATH node --env-file=apps/web/.env.local --input-type=module -e 'import {spawnSync} from "node:child_process"; const r=spawnSync("npm",["test"],{stdio:"inherit",env:{...process.env,CHAGOK_TEST_DATABASE_URL:process.env.DATABASE_URL}}); process.exit(r.status??1);'
```

마이그레이션은 같은 env를 읽는 Node24에서 `node node_modules/prisma/build/index.js migrate status --config=packages/api/prisma.config.ts`로 조회했다. 기존 로컬 DB migration은 이미 적용됐으며 이번 검사는 읽기 전용이다.

## 사이드이펙트와 남은 범위

- 전체 PR에는 nullable requestId/사용자별 unique index migration이 **포함**된다. 앞선 폼 문서의 “추가 migration 없음”은 서버 단계 위에 더 추가하지 않았다는 뜻이다. 다른 환경은 Prisma 생성·migration 적용 후 새 서버 시작이 필요하다.
- 저장 중 닫기/reload는 연결 응답만 폐기하고 이미 발송한 POST는8초 내 settlement 후 무효화한다. 발송 전 소속·세션 비교와 취소 검사, GET 취소는 유지된다. timeout 자체가 서버 commit 완료를 보장하지 않으며 불명확 결과는 같은 UUID 재시도/내역 확인 경계로 남는다.
- 새 화면/입력 동작은 추가하지 않았다. 수정 후 별도 iOS 기동·실측은 미실행이며 기존 플랫폼/키보드/BFCache 한계는 그대로다. 영수증 첨부는5일차다.
- 사용자 승인 범위는 commit·push·PR이며 병합은 포함하지 않는다. 기존 로컬 학습/인계/생성 파일은 남기고 커밋 대상만 분리한다.
