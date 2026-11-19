# 4일차 서버 단계 검증 — 2026-11-19 KST

후속 폼 연결과 실측은 [별도 실행 기록](day-04-form.md)에 있다. 아래는 서버 단계 당시 결과이며 현재 전체 상태와 구분한다.

**서버 단계 완료, 4일차 전체는 미완료.** 사용자 선택에 따라 폼 연결, 화면 확인과 준비 시간 실측은 다음 작업으로 남겼다. [상세 계획과 재개 순서](../plans/day-04.md), [측정 미실행 기록](../metrics/daily/day-04.md).

## AC 결과

| ID | 상태 | 확인 방법과 실제 결과 |
| --- | --- | --- |
| D4-S1 | 충족 | 계획에 입력, 반환, 오류, 잠금, 중복의 정의, 이번/후속 범위 명시. 구현 대조 완료 |
| D4-S2 | 충족 | 계약 29개 테스트와 DB 통합, 실제 HTTP 무인증 POST 확인. 위조·만료·로그아웃·소속 없음·타사 정책·잘못된 날짜/금액·저장 불가능 문자 거부 |
| D4-S3 | 충족 | 실제 DB: 65,001원 초과 실패 후 같은 키 65,000원 성공, 잔액 0. 상태/월/연말/0원 한도 확인. 30,000원 동시 8개 중 3개 저장·5개 거부·합계 90,000원 |
| D4-S4 | 충족 | 순차/동시 8개 재전송 저장 1건·같은 id, 변경 내용 CONFLICT, 사용자별 키·한도 분리, DB unique 제약 확인. 정책 변경/잔액 소진 뒤 재전송도 기존 결과 |
| D4-S5 | 충족 | 최종 실제 DB 포함20파일200테스트 skip0, 스타일91파일 위반0, 4개 workspace 타입, webpack production 빌드 exit0 |
| D4-S6 | 충족 | 로컬 학습 기록과 후속 계획, 미실측, 초안 두 파일 작성. 기존 DB6개 테이블 행 해시 일치. 기존 학습·handoff·next-env 보존과 Git 제외 확인 |

## 환경과 시작 상태

- macOS arm64, Node24.18.0, Prisma Client7.10.1, PostgreSQL18.6, Next16.4.6. 로컬 DB `127.0.0.1:55432/chagok`.
- 시작 HEAD `5a7725a992a7eb25a235a76170ad073ff64fec9c`, 브랜치 main. 기존 변경은 `apps/web/next-env.d.ts`, `docs/changes/latest-pr.md`, `docs/changes/latest-commit.txt`; 미추적 `handoff.md`. staged diff 없음.
- 시작 때 추적 파일과 로컬 학습/인계 파일 531개 해시를 `/tmp/chagok-day04-before.json`에 기록했다. 초안 두 파일만 작업 종료 규칙에 따라 교체했다. 빌드가 자동 변경한 next-env는 작업 시작 파일의 바이트로 복원했다.
- DB 통합 테스트는 매 사례의 고유 접두사 사용자/회사만 생성·정리한다. 인증 저장소는 실제 DB, Google token 검증 함수는 테스트 대역이다. 실제 Google 로그인·브라우저 네트워크 왕복의 신규 검증은 아니다. 최종 변경 소스9개의 [SHA-256](day-04/source.sha256)을 보존했다.
- 기존 DB6개 테이블(User/Session/Company/Membership/BenefitPolicy/Claim)의 행을 요청 키 추가 전후 동일한 열로 직렬화해 SHA-256을 비교했다. 행 내용은 로그에 출력하지 않았다. [보존 결과](day-04/db-preservation.log).

## 실행 검증 8개

모든 명령은 프로젝트 루트에서 `PATH=/Users/doyeon/.nvm/versions/node/v24.18.0/bin:$PATH`를 사용했다. env 파일의 값은 출력하지 않았다.

1. **RED→GREEN:** 계약/HTTP 미구현26실패·기존10통과 [최초 RED](day-04/red.log). DB 기동 후 생성 API 미구현13실패 [DB RED](day-04/red-db-ready.log). 이후 구현으로 통과. 전체 테스트 중 반려 fixture에 rejectionReason이 없어 기존 CHECK 제약으로1실패·194통과 [초기 실패](day-04/tests-initial-failed.log); 기존 제약을 유지하고 fixture를 수정했다.
2. **전체 테스트:** 아래 명령의 최종 실행 **20파일200개 통과, skip0, exit0**. [로그](day-04/tests.log). 신규 계약29개·DB14개·HTTP1개와 기존156개를 포함한다.
3. **스타일:** `npm run style:check` **91파일 위반0, exit0**. `npm test` pretest에서도 실행했다. [로그](day-04/style.log). 이름/책임/흐름은 별도 리뷰했다.
4. **타입:** `npm run typecheck` **mobile/web/api/contracts 모두 exit0**. 빌드 후 기존 next-env 복원 상태에서 최종 재실행했다. [로그](day-04/typecheck.log).
5. **DB 준비:** `npm run db:generate -w @chagok/api` exit0 [로그](day-04/generate.log). env 전달 후 `npm run db:migrate -w @chagok/api`로 nullable requestId+unique index만 적용, exit0 [로그](day-04/migrate.log). `npm exec -w @chagok/api -- prisma migrate status` **4개 migration 최신, exit0** [로그](day-04/migration-status.log). CLI의 새 버전 안내는 설치/업그레이드하지 않았다.
6. **웹 빌드:** `npm run build -w @chagok/web -- --webpack` **production 빌드 exit0**, `/api/trpc/[trpc]` 포함. [로그](day-04/build.log). 이번에는 기본 Turbopack 빌드를 실행하지 않았으므로 그 모드의 성공을 주장하지 않는다.
7. **코드 리뷰:** 별도 읽기 전용 리뷰1회. NUL/단독 surrogate 입력 허용 문제를 지적받고 계약3실패 [RED](day-04/review-red.log), 실제 DB INTERNAL_SERVER_ERROR [DB RED](day-04/review-db-red.log)를 재현했다. 입력 경계 거부 및 정상 이모지 보존을 추가하고 최종 전체200개 통과. [판정](day-04/review.md).
8. **기록·보존:** `git diff --check`, 변경 Markdown 상대 링크, 계획/AC/초안 구조, 면접 질문5개·답변3문장, 기존 파일 해시, 학습 tracked/staged/origin-main diff 제외 검사. [결과](day-04/checks.log). 기존 DB 행도 동일하며 비밀값을 산출물에 넣지 않았다.

전체 실제 DB 테스트 재실행:

```sh
PATH=/Users/doyeon/.nvm/versions/node/v24.18.0/bin:$PATH node --env-file=apps/web/.env.local --input-type=module -e 'import {spawnSync} from "node:child_process"; const r=spawnSync("npm",["test"],{stdio:"inherit",env:{...process.env,CHAGOK_TEST_DATABASE_URL:process.env.DATABASE_URL}}); process.exit(r.status??1);'
```

## 환경 실패와 복구

- 최초 DB 실행은 샌드박스 `connect EPERM`으로13개 실패 [로그](day-04/red-db.log). 접속이 허용된 환경에서는 DB가 꺼져 있어13개 실패 [로그](day-04/red-db-allowed.log). 이 둘을 API 미구현 RED나 동작 검증으로 계산하지 않았다.
- `pg_ctl -D .local-tools/postgres/data status`가 no server running을 반환했다. 기존 `.local-tools/postgres/start.mjs`를 Node24로 실행해 기존 데이터를 유지한 PostgreSQL18.6을 시작했다. DB는 후속 작업을 위해 실행 중이다.
- 환경 복구 후 API 미구현13실패를 확인한 다음 구현했다. 실패 로그는 숨기거나 성공 로그로 덮어쓰지 않았다.
- 문서 검사 도구 초회는 아직 생성 전인 자체 결과 파일 링크와 `##`/`###` 제목을 구분하지 못한 검사식 때문에 실패했다. 출력 파일 생성 순서와 제목 경계를 고친 뒤 링크6문서·대표 질문5개 검사와 보존 검사를 통과했다. 문서 내용을 검사 통과에 맞춰 줄이지 않았다.

## 수동 확인 및 남은 범위

| 항목 | 상태 | 이유/다음 동작 |
| --- | --- | --- |
| 서버 실행·브라우저 화면 확인 | 해당 없음 | 이번 작업은 서버 전용이며 화면 파일 변경 없음. 비활성 폼을 유지 |
| 브라우저/iOS 실제 신청, 인증 전달, Query 갱신 | 미검증·다음 단계 | 폼/브릿지 연결 후 개발 서버를 열고 실제 사용자 흐름 확인 |
| FORM_READY 준비 시간 | 미측정 | 표본0, 실행 경계 정의와 조건/횟수 확정 후 원본 수집 |
| 운영 부하, Android/실기기, 정책 변경과 신청의 동시 경합 | 미검증·별도 범위 | 로컬8개 동시 요청을 운영 부하/모든 쓰기 경로 보장으로 확대하지 않음 |
| 학습 내용의 사용자 복습 | 확인 대기 | 학습 문서는 작성·구조 검사 완료, 숙련 체크는 사용자 몫 |
| commit/push/PR | 미실행 | 초안만 작성. 사용자 결과 확인과 별도 PR 승인 후 진행 |

## 사이드이펙트와 재개 주의

새 API는 기존 Bearer 인증과 no-store, 내부 오류 은닉을 사용한다. 기존 조회 응답은 바뀌지 않으며 새 신청의 잔액은 기존 합계 조회로 계산된다. 화면의 자동 Query 갱신은 아직 없다.

다른 환경에서는 Prisma Client 생성과 migration 적용 후 서버를 재시작해야 한다. 같은 사용자의 여러 월 신청도 잠금을 기다린다. 직접 DB 쓰기나 미래 정책/승인 변경이 잠금 경계를 우회하지 않도록 이후 설계에서 확인한다. 현재 폼은 비활성이며 사진, 승인/반려, 신청 수정/삭제를 추가하지 않았다. 롤백은 라우터의 생성 진입점을 먼저 비활성화하고 데이터와 키 컬럼은 보존하는 방식이 안전하다.
