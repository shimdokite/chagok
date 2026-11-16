# 2일차 누적 PR 준비 — 2026-11-16 KST

현재 브랜치 `feat/day-02-auth-session-ui`, 대상 `origin/main`. `git fetch origin main` 후 기준은 `86a95a2574bc08517c145389cb88b41e81deffd9`이며 HEAD와 같다. 아직 새 커밋·push·PR 생성은 하지 않았다. 따라서 게시 예정 전체 범위는 `git diff --cached origin/main`으로 검사한다. 커밋 후 실제 PR 직전에는 `origin/main...HEAD`와 전체 커밋 목록을 다시 확인해야 한다.

시작 시 tracked 수정30개·untracked214개·staged0개를 [초기 상태](initial-state.json)에 기록했다. 이전 변경을 되돌리지 않고 누적 소스/테스트/의존성/문서/검증 자료를 검토했다. 기존 `handoff.md`는 구현 전 로컬 인계용으로 보존하고 게시 대상에서 제외했다. `.env.local`, 생성된 iOS·빌드 산출물, `.local-tools`와 Codex 사용자 설정도 제외했다. `docs/pr-draft.md`는 1일차 이력으로 보존했다.

## 누적 AC 최종 점검

아래 충족은 명시된 환경·검증 범위의 판정이다. 사용자 전체 UI 인수나 게시 승인을 의미하지 않는다.

| AC | 상태 | 확인 방법·실제 결과 | 남은 경계 |
| --- | --- | --- | --- |
| D2-01 인증·사용자·세션 | 충족 | [실제 OAuth 후속](../oauth/result.md): 동일 sub 사용자 재사용, SecureStore 복원10/10, 장애 복구·만료·로그아웃. 이번 전체72테스트와 [로그아웃 실패 회귀](review.md) 통과 | 이번 foreground 실패 수정은 자동 검사이며 iOS 실패 시나리오 재실행은 미검증. 종료 후 재시작까지 로그아웃 의도를 영속화하지 않음 |
| D2-02 Tailwind/shadcn 실제 사용 | 충족 | Button/Input/Label import·DOM 기존 확인, 이번 웹 production build 성공 | RN 컴포넌트 교체는 범위 밖 |
| D2-03 문구·테마·작은 화면 | 충족 | 기존320/360px 및 mini light/dark 캡처·overflow 검사; 이번 로그인 미리보기 열림 | 최종 사용자 전체 시각 인수·물리 iPhone·최대 글자 재검사는 미검증 |
| D2-04 비활성 폼·업무 저장 없음 | 충족 | 기존 disabled6개·label5개·실제 조작, 누적 API/호출부 검토: User/Session만 추가 | 실제 신청·첨부·승인 기능은 이후 일차 |
| D2-05 WKWebView 표시·접근성 | 충족 | 기존 날짜·스크롤·웹 닫기 확인, 사용자가 Option+Tab 포커스 후 Space로 홈 복귀 확인 | Enter·스크린리더·실기기는 미검증 |
| D2-06 bridge·재로드·닫기·복구 | 충족 | [WK 검증](../wkwebview/result.md), [오류 재현](../timeout-investigation/result.md), [실제 종료](../native-close/result.md): 웹2회 재로드 rev2, 네이티브3회 rev3에서 close/unmount 각각1개·동일 세대·순서 정상, 오류0 | 과거 자발적 timeout의 최종 JS 오류 분기는 미확정. 모든 콜백 경합을 보증하지 않음 |
| D2-07 자동 검사 | 충족 | 이번 Node24.22.3 타입 exit0, 실제 PG 포함12파일72테스트 skip0, 웹 build exit0 | native signed Debug 빌드는 기존 결과. 이번 수정은 JS/버튼 disabled만으로 native 의존성 재빌드는 해당 없음 |
| D2-08 측정·기록·한계 구분 | 충족 | 원본17개 보존, 정상 startup10개 중앙값225.9769585ms 재계산 일치, 이전/이번 실행 및 수동 확인 분리 | 성능 새 실측이 아닌 원본 재계산. UI paint·전체 cold start 제외, 비교 개선 주장 없음 |
| D2-09 학습 보존·추적 제거 | 충족 | 두 로컬 파일 SHA-256 전후 동일, tracked0, staged와 기준 대비 예정 diff에 `D docs/learning/day-01.md`만 존재, 현재 README 링크 제거 | 원격 폴더는 아직 남아 있으며 병합 후 제거. 과거 Git 이력은 유지 |

## 이번 PR 준비 AC

| AC | 상태 | 확인 결과 |
| --- | --- | --- |
| P1 누적 diff·기준·리뷰 | 충족 | fetch 후 동일 기준, 독립 누적 리뷰에서 Important1건 재현→수정→재검토 추가 발견 없음 |
| P2 학습 원본 보존 | 충족 | ignored 로컬 백업과 SHA-256 일치, 강제 삭제 없이 `git rm -r --cached -- docs/learning` 성공 |
| P3 공개 안내 정리 | 충족 | README/AGENTS/contributing/제품/계획/검증 현재 상태 갱신, 과거 실행 이력 보존 |
| P4 AC·테스트·측정 | 충족 | 위 D2별 근거 및 아래 실제 명령/결과로 대조 |
| P5 게시 범위·비밀값·문서 | 충족 | 명시적 파일 목록으로 stage, 로컬 환경값·비밀키/토큰/DB URL·개인 이메일 패턴 검사 발견0. 신규 문서 링크 오류0; 원본 Day01 계획의 기존 이미지 링크2개와 원본 로그/적용된 migration의 공백 경고는 보존·명시 |
| P6 최종 초안·승인 경계 | 충족 | [PR 본문](../../../changes/latest-pr.md)·[커밋 본문](../../../changes/latest-commit.txt)을 전체 범위로 작성. 게시 전 사용자에게 제시하며 승인 대기 |

## 필수 검사 7묶음

환경은 macOS arm64 / Node24.22.3 / 로컬 PostgreSQL18.6. 실제 명령의 Node PATH는 `.local-tools/node24/node_modules/.bin`을 우선했다.

1. **전체 테스트:** 로컬 env를 출력하지 않고 `node --env-file=apps/web/.env.local --input-type=module`에서 `spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs','run'], {stdio:'inherit', env:{...process.env, CHAGOK_TEST_DATABASE_URL:process.env.DATABASE_URL}})` 실행. 수정 전 [71통과](tests.log), 수정 후 [72통과·skip0](tests-after-review.log), 모두 exit0. 로그아웃 회귀의 의도된 [RED exit1](logout-red.log)도 보존했다.
2. **타입:** `npm run typecheck` 수정 전 [통과](typecheck.log), 수정 후 [통과](typecheck-after-review.log), exit0.
3. **빌드:** `npm run build:web` [exit0](build-web.log), `/apply` 정적 출력 및 tRPC route 생성. 이후 변경은 모바일 JS와 문서뿐이므로 웹 빌드를 반복하지 않았다. native dependency/config는 이전 실제 OAuth signed build 이후 이번 준비에서 변경 없음.
4. **코드 리뷰·회귀:** [리뷰 기록](review.md). foreground 자동 복원이 실패한 로그아웃 의도를 덮는 문제를 수정. 대상11테스트 통과·독립 재검토 확인. 컨트롤러 상태와 로그인 데모 버튼의 disabled 조건을 일치시켰다.
5. **화면/수동 확인:** 3000/8081/8082 기존 서버 listen 확인. IAB에서 `http://localhost:8082/`를 열어 로그인 문구·비활성 Google 버튼·활성 데모 버튼 확인 후 사용자 확인용으로 유지. 실제 Google 미지원 웹 미리보기이므로 신규 로그아웃 오류 화면의 iOS 확인으로 간주하지 않는다. `http://localhost:3000/apply` 및 Device Hub mini에서 기존 신청 화면 확인 가능.
6. **원본/학습/측정:** [audit](audit.json), [현재 소스 해시](source-sha256.json). 복원 원본 SHA-256 `80e26d7da01f284f3497ea81aa0802d063c0c4796369393d456802f30e3146f0` 유지, 정상10개 모두 원본에 존재, min140.14224999/max858.868125ms. 이전 native-close 소스와 달라진 것은 이번 로그인 화면·session·그 테스트3개뿐이며 WebView 코드는 동일.
7. **Git/문서/공개 경계:** [staged 검사](staged-check.json). `git diff --cached --check`는 **exit2**: 원본 실행 로그의 후행 공백/빈 줄과 이미 적용한 Prisma migration의 마지막 빈 줄을 보고했다. 원본·migration checksum을 유지하기 위해 수정하지 않았다. 해당 `.log`와 migration만 제외한 동일 검사는 **exit0**이다. 명시적 staged 목록, `git ls-files -- docs/learning`, 로컬 해시·비밀값 패턴·Markdown 대상을 검사했다. 전체 예정 diff는 앱/API/UI·의존성·계획/검증·정책 정리 및 기존 학습 삭제로 한정. 신규 링크 오류는 없고 원본 `docs/plans/day-01.md`의 상대 이미지 링크2개는 이미 기준 브랜치에 있던 것으로 원본 보존 정책에 따라 수정하지 않았다. 문서 수정 스크립트1회는 stdin 인코딩 오류로 실행 전 실패했고 파일 변경 없이 apply_patch로 처리했다. 초안 교체 patch1회도 중복 파일 작업 오류로 적용 전 거절돼 단일 update로 처리했다.

## 사용자 확인과 남은 한계

- **직접 확인됨(이전):** Google 로그인·동일 계정 재로그인, 측정 Copy, Option+Tab/Space 닫기, 재로드 후 웹 닫기. OS 동작 관찰은 각 후속 문서에 연결했다.
- **미검증/대기:** 이번 로그아웃 실패 후 foreground의 실제 iOS 재실행, 전체 UI 최종 인수, 물리 iPhone·Android·Release·스크린리더, push·PR 승인. 후속 수동 확인은 iOS에서 서버 폐기 실패→앱 재활성화 시 재시도 안내와 데모 비활성 유지→서버 복구 후 재시도 성공이다.
- **과거 timeout:** 지연 정황과 별도 ready timeout/process termination 통제 재현은 확인했지만 과거의 최종 JS 분기는 당시 계측 부재로 확정하지 못했다. 이 사실을 누적 완료 판정에서 숨기지 않았다.
- **도입 영향:** PostgreSQL migration과 두 로컬 env 설정, Google URL scheme을 포함하는 native 재빌드가 최초 도입 시 필요하다. 토큰 원문은 SecureStore만, DB는 해시만 보관한다. 홈 데이터는 데모이고 신청 API를 열지 않는다. 운영 HTTPS/rate limit·만료 행 정리·전체 기기 로그아웃은 이번 로컬 구현 범위 밖이다. 롤백은 앱/API 변경을 함께 되돌리고 필요한 DB 보존 후 별도 판단하며 사용자 데이터 자동 삭제는 하지 않는다.

이 문서는 PR 준비 완료를 기록한다. 커밋·push·PR 생성·병합 완료나 최종 제품 인수 기록이 아니다.
