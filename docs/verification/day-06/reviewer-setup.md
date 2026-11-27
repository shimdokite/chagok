# 담당자 직접 테스트 준비 — 2026-11-27

요청: “내 구글 계정을 담당자로 설정해서 직접 테스트할 수 있게 해줘.” 이전에 본인 계정으로 확인해 그로브에 연결했던 유일한 Google 계정의 Membership 한 행을 로컬 DB에서 EMPLOYEE → REVIEWER로 변경했다. 이메일은 DB에 저장하지 않으며 Google subject·개인 ID·토큰은 이 기록에 남기지 않는다.

## 범위와 AC

앱 코드·스키마 변경은 없다. 문서는 수동 확인, 6일차 검증 후속, 이 결과와 JSON/테스트 로그, 최신 PR·커밋 초안을 갱신했다. 기존 6일차 구현과 사용자 변경은 보존했다. 시작 상태는 git status/diff/cached diff로 확인했으며 diff를 `/tmp/chagok-reviewer-before.diff`와 `/tmp/chagok-reviewer-before-staged.diff`에 보관했다.

| AC | 상태 | 확인 방법·실제 결과 |
| --- | --- | --- |
| R1 대상 계정만 담당자 지정 | 충족 | 기존 본인 그로브 연결 기록과 현재 유일한 해당 Google 소속을 대조. userId+companyId+기존 EMPLOYEE 조건 updateMany 1행. 다른 기존 Membership 전후 동일, 본인 Claim 전체 전후 동일 assertion 통과. |
| R2 담당자 조회와 연습용 데이터 준비 | 충족 | 실제 기존 서버 GET 목록 200, 연습용 두 건 모두 타인 신청/검토 중/첨부 있음. 영수증 GET 각각 200 및 원본 바이트 일치. 임시 검사 세션은 즉시 삭제. 실제 Google OAuth 성공을 의미하지 않음. |
| R3 화면 순서와 사용자 테스트 제공 | 충족, 실행 결과는 미검증 | 로그인 화면과 Google 버튼을 브라우저에서 확인해 열어 둠. 월·신청명·승인·반려·필터·본인 신청 제한·로그아웃 순서를 수동 확인 문서에 추가. 실제 사용자의 로그인·결정은 대기. |

## 이번 검증 — 4그룹

1. **DB와 HTTP:** Node v24.22.3 `--env-file=apps/web/.env.local --experimental-transform-types --input-type=module` 운영 스크립트 exit0. localhost:55432/chagok을 검사한 뒤 명시적인 1행 변경과 두 연습용 신청을 트랜잭션 생성했다. [결과 JSON](reviewer-setup.json). 변경 전후 기존 소속/본인 신청 동일 및 GET200 확인. 실험적 TypeScript 변환/모듈 형식 경고는 있었고 실패는 없었다.
2. **관련 회귀와 스타일:** `CHAGOK_TEST_DATABASE_URL=DATABASE_URL`을 전달하고 테스트 자식 환경의 SUPABASE_*/RECEIPT_*만 제거한 Node24 환경에서 `npm test -- packages/api/src/review`: 2파일16테스트 통과, pretest 스타일149파일 위반0. [로그](reviewer-setup-tests.log). 소스 변경이 없으므로 전체 테스트·타입·빌드는 재실행하지 않았다.
3. **화면:** 기존 Next 서버 localhost:3000 실행 확인, [담당자 웹](http://localhost:3000/admin) 로그인 화면/Google 버튼 관찰. 실제 Google 로그인은 직접 테스트 대기. 화면 구현 변경은 없으며 안내용 페이지를 유지했다.
4. **문서·Git:** 문서 링크/초안 형식, git diff --check 확인. docs/learning/day-06.md는 로컬 보존·ignore 상태이며 tracked/staged/origin/main 대비 학습 diff는 비어 있다. 앱 소스는 이번에 수정하지 않았다. 커밋·staging·push·PR 없음.

## 직접 확인과 영향

[화면 확인 순서](../../manual-checks.md#6일차-담당자-직접-확인--2026-11-27)를 따른다. 별도 가상 직원의 `[테스트] 승인 연습용 도서비` 1,000원, `[테스트] 반려 연습용 도서비` 2,000원은 영수증을 포함해 로컬에 남겼다. 합성 영수증은 기능 시험용 이미지다. 사용자가 직접 처리할 수 있도록 두 건 모두 SUBMITTED를 유지했다.

권한은 그로브의 다른 직원 신청/영수증 조회와 승인·반려까지 허용한다. 본인 신청 처리 금지는 유지한다. 연습용 신청은 별도 가상 직원의 한도에만 영향을 주며 Google 로그인 가능한 직원 계정은 아니다. 실제 모바일 직원 상태·잔액 갱신 확인에는 별도 실제 직원 계정이 필요하다. 기존 본인 신청·잔액·다른 계정 소속·기존 세션·회사 정책은 변경하지 않았다. Google 콘솔 설정은 변경하지 않았다. 권한 회수는 동일한 소속 한 행을 EMPLOYEE로 되돌리면 다음 요청부터 반영된다. 테스트 데이터 삭제와 결정 취소는 수행하지 않았다.
