# PR·커밋 필수 컨벤션

## 공통 규칙

- 제목은 `<type>(<scope>): <설명>` 형식으로 작성한다. scope가 명확하지 않으면 생략한다. 설명은 한국어로 구체적인 변경 결과를 적고 마침표를 붙이지 않는다. 제목은 72자 이내로 작성한다.
- type은 `feat`(기능), `fix`(결함), `refactor`(동작 유지 구조 변경), `perf`(성능), `docs`(문서), `test`(검증), `build`(빌드·의존성), `ci`(CI), `chore`(기타 유지보수), `revert`(되돌리기) 중 하나를 선택한다.
- scope는 가능한 경우 `mobile`, `web`, `api`, `contracts`, `repo`를 사용한다. 여러 영역에 걸친 저장소 공통 변경은 `repo`로 표시한다.
- 커밋은 하나의 논리적 변경을 담고, PR은 하나의 검토 가능한 목적을 담는다. 변경과 무관한 파일·비밀값·개인정보를 포함하지 않는다.
- 호환성을 깨는 변경은 제목의 scope 뒤 또는 type 뒤에 `!`를 붙이고, 커밋 마지막에 `BREAKING CHANGE: <영향과 전환 방법>` footer를 추가한다. PR의 사이드이펙트 검토에도 명시한다.
- 관련 이슈가 있으면 실제 번호를 적는다. PR에서 이슈를 종료할 때는 `Closes #번호`, 참고만 할 때는 `Refs #번호`를 사용한다. 없는 번호를 만들지 않는다.
- 빈 필드·자리표시자·근거 없는 '완료'는 허용하지 않는다. 해당 없는 항목은 `해당 없음 — 근거`, 수행하지 않은 검증은 `미실행 — 사유`로 남긴다.

## PR 필수 항목

원본은 [PR 템플릿](../.github/pull_request_template.md)이다. 다음 다섯 섹션을 모두 유지한다.

1. **요약**: 문제와 변경 후 동작을 1~3문장으로 설명한다.
2. **내용**: 배경, 구현 방식과 선택 이유, 작업 범위·제외 사항, 관련 이슈를 적는다.
3. **변경**: 파일 또는 기능별 변경 전후와 영향을 적는다. 단순 파일 목록으로 끝내지 않는다.
4. **검증**: 실제 명령·시나리오, 결과, 환경·근거, 남은 확인을 적는다. 기존 로그 검토와 이번 재실행을 구분한다.
5. **사이드이펙트 검토**: 기존 기능·호환성, API·데이터, 보안·권한, 성능·설정·배포, UI·접근성·플랫폼을 검토한다. Breaking change와 롤백 방법을 적는다. 미검토를 '영향 없음'으로 바꾸지 않는다.

## 커밋 필수 항목

원본은 [커밋 템플릿](../.gitmessage)이다. 제목 다음에 빈 줄을 두고 `배경:`, `변경:`, `검증:`, `영향:`을 모두 채운다. 여러 변경을 설명할 때는 해당 항목 아래에 목록을 추가할 수 있다. 관련 이슈와 breaking change footer는 해당할 때만 마지막에 붙인다.

## 작업 종료 시 자동 작성

루트 [AGENTS.md](../AGENTS.md)를 읽는 AI 작업자는 변경 작업마다 다음 두 파일을 실제 작업 내용으로 갱신한다.

- [최근 PR 초안](changes/latest-pr.md): 제목과 필수 다섯 섹션
- [최근 커밋 초안](changes/latest-commit.txt): 바로 커밋 본문으로 사용할 수 있는 텍스트

이는 AI의 작업 종료 규칙이다. Git이나 GitHub의 빈 템플릿만으로 변경 이유·검증 결과가 자동 추론되지는 않는다. 에이전트 없이 직접 작업하거나 이 지침을 읽지 않는 도구에서는 직접 작성해야 한다. CI나 Git hook으로 형식을 강제하는 설정은 현재 포함하지 않는다.

`docs/pr-draft.md`는 기존 1일차 PR의 누적 기록으로 유지한다. 최근 작업 초안은 매번 교체되며, 커밋 전에는 staged 변경 범위, PR 전에는 대상 브랜치 대비 전체 변경 범위에 맞춰 다시 검토한다. 자동 작성은 자동 커밋이나 원격 게시를 수행하지 않는다.

## Git·GitHub 적용

2026-11-13 사용자 PR 승인에 따라 로컬 Git 저장소를 초기화하고 아래 로컬 설정을 적용했다. 새 clone에서는 프로젝트 루트에서 한 번 실행한다.

```sh
git config --local commit.template .gitmessage
git config --local --get commit.template
```

새 clone에서도 위 로컬 설정은 한 번 필요하다. 일반 `git commit` 편집기에 기본 커밋 템플릿이 열린다. AI가 채운 초안을 사용하려면 staged 변경과 일치하는지 확인한 후 다음을 사용한다.

```sh
git commit --edit --file=docs/changes/latest-commit.txt
```

`git commit -m`은 템플릿을 사용하지 않으므로 제목만 적고 필수 본문을 생략하지 않는다. GitHub에서는 `.github/pull_request_template.md`가 기본 브랜치에 반영된 뒤 새 PR 작성 화면에 기본 본문이 제공된다. 실제 PR 본문은 검토한 `docs/changes/latest-pr.md`로 채운다. 기존 PR의 본문은 자동으로 바뀌지 않는다.

동작 기준: [GitHub PR 템플릿 공식 문서](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/creating-a-pull-request-template-for-your-repository), [Git commit 공식 문서](https://git-scm.com/docs/git-commit).
