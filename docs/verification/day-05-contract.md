# 5일차 Task 1 — 메타데이터 계약 검증

2026-11-20 KST, `/Users/doyeon/Desktop/chagok`, 시작 HEAD `760d43d`. 준비 단계 이후 사용자가 두 번째 범위를 승인했다. 제품 변경은 계약과 export뿐이며 촬영/업로드/DB 스키마/브릿지/화면은 그대로다.

## AC 결과

| AC | 상태 | 방법과 실제 결과 |
| --- | --- | --- |
| C1 공개 계약 | 충족 | `@chagok/contracts/receipts`로 schema/상한/추론 타입을 사용한다. 테스트와4개 workspace 타입 검사가 통과했다. |
| C2 입력 경계 | 충족 | JPEG/PNG, 정수1~10485760바이트 허용, 빈/음수/소수/초과/비유한/문자열/잘못된 MIME/누락/추가 필드26사례 통과. |
| C3 회귀 검사 | 충족 | 스타일106파일 위반0, 타입4개, 실제 로컬 DB 포함 전체26파일258테스트 통과/실패0/skip0. 최초 DB 접근 실패는 아래 보존했다. |
| C4 기록과 보존 | 충족 | 계획/진행/측정 상태/로컬 학습/초안 갱신. 코드와 기존 자료 해시를 승인된 변경 경로 제외하고 대조했다. 학습 tracked0, staged0, 기존 next-env와 handoff 보존. |

## 검증 — 5묶음

1. **RED→GREEN:** `npm test -- packages/contracts/src/receipts.test.ts`. 처음에는 공개 `./receipts` export 부재로 suite load 실패(exit1, 실행한 케이스0). [RED](day-05-contract/red.log). 구현 후26개 통과(exit0) [GREEN](day-05-contract/green.log). 이를26개 assertion 실패로 기록하지 않는다.
2. **정적 검사:** `npm run style:check` 106파일 위반0 [로그](day-05-contract/style.log), `npm run typecheck` 모바일/웹/API/contracts 모두 exit0 [로그](day-05-contract/typecheck.log).
3. **전체 테스트:** 아래 명령. 첫 샌드박스 실행은 `127.0.0.1:55432` connect EPERM으로3파일17실패/241통과 [실패 원본](day-05-contract/tests-sandbox-failed.log). 같은 명령을 허용 환경에서 실행해26파일258통과, skip0, exit0 [최종 로그](day-05-contract/tests.log).
4. **코드 리뷰:** 별도 읽기 전용 리뷰에서 신규 계약/테스트/package export의 요구사항 일치, 실제 파일 검증과의 구분, 범위 준수를 확인했다. 구체적 지적 없음. 리뷰어는 테스트를 재실행하지 않았다.
5. **문서와 보존:** `git diff --check`, Python 상대 링크/질문5개 및 답변 형식/기존 파일 SHA-256 대조, `git ls-files -- docs/learning`, `git check-ignore docs/learning/day-05.md`, staged diff 확인. 최종 검사에서 기존654파일 해시 일치, 로컬 링크33개 유효, 질문5개/각3문장, 공백 오류0을 확인했다. 학습 본문은 추적 문서에 복사하지 않았다.

실행 환경: 기본 Node25 대신 로컬 Node24.22.3/npm11.6.2를 사용했다. 각 명령의 PATH 앞에 `.local-tools/node24/node_modules/.bin`을 두었다. 기존 의존성만 사용했으며 설치/lockfile 변경은 없다.

```sh
PATH="$PWD/.local-tools/node24/node_modules/.bin:$PATH" node --env-file=apps/web/.env.local --input-type=module -e 'import {spawnSync} from "node:child_process"; const r=spawnSync("npm",["test"],{stdio:"inherit",env:{...process.env,CHAGOK_TEST_DATABASE_URL:process.env.DATABASE_URL}}); process.exit(r.status??1);'
```

환경변수 값은 출력하지 않았다. 기존 통합 테스트는 로컬 DB 검증과 fixture 정리를 수행한다. 이번에는 DB 전체 데이터 스냅샷 비교를 수행하지 않았다.

## 영향과 미검증

- 기존 schema/라우터/브릿지 호출부를 바꾸지 않고 독립 export만 추가했다. 이름/책임은 단일 메타데이터 검증에 한정했다.
- 빌드·서버·브라우저·실기기 확인: 해당 없음 — 이 계약은 기존 UI에서 아직 사용하지 않으며 화면 변경이 없다. 실제 업로드와 성능 측정은 미실행, 표본0이다.
- D5-02의 메타데이터 부분만 구현했다. 실제 이미지 본문/소유권/비공개 저장 검증까지 완료한 것이 아니므로 전체 AC는 여전히 미검증이다.
- 시작 시 준비 문서/초안/진행 파일의 변경, next-env 수정, handoff가 있었다. 이번에 지정한 문서와 계약 경로만 수정했다. 기존 준비 검증 기록은 과거 기록으로 보존했다.
- 계획 실행 도구의 자동 worktree/commit 단계 대신 승인된 현재 폴더와 계획 장부를 사용했다. commit/push/PR 없음. 준비 이후 승인된 Task 1이 끝났으며 Task 2는 별도 재개 범위다.
