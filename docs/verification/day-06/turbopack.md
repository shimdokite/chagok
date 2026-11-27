# 기본 Turbopack 빌드 진단

2026-11-28 Asia/Seoul. 사용자 피드백: “기본 Turbopack 빌드 오류 해결하자.”

## 결론

동일 코드·설정·Node에서 일반 macOS 터미널의 `npm run build:web`는 성공했다. Codex 실행 도구에서는 기본/권한 확장 모두 PostCSS 처리용 프로세스 통신 포트 생성 단계에서 `EPERM`이 재현됐다. 이 프로젝트의 이번 실패는 실행 환경에 따른 제한으로 판단한다. Codex 내부 제한 자체를 수정한 것은 아니며, 일반 터미널을 기본 빌드의 검증 경로로 안내한다. Webpack 전환이나 실험 설정 추가는 하지 않았다.

## 재현과 확인

환경: macOS arm64, Node v24.22.3, Next.js 16.4.6, 기존 `.env.local`. 세 실행 모두 프로젝트 루트에서 다음 명령을 사용했다. `.local-tools`는 이 작업 환경에 설치된 Node 24이며 다른 환경에서는 Node 24를 준비하고 `npm run build:web`만 실행한다.

```sh
PATH="$PWD/.local-tools/node24/node_modules/.bin:$PATH" npm run build:web
```

| 실행 | 실제 결과 | 증거 |
| --- | --- | --- |
| Codex 기본 실행 | exit 1, globals.css → PostCSS → process → port bind EPERM | [로그](turbopack/codex-default.log) |
| Codex require_escalated 실행 | exit 1, 동일한 포트 생성 오류 | [로그](turbopack/codex-escalated.log) |
| 일반 macOS 터미널, 사용자 실행 | 사용자 보고 exit 0; 로그 직접 확인: Turbopack 컴파일·타입 검사·페이지 생성 완료 | [로그](turbopack/terminal-success.log) |

별도 Node `net.createServer().listen(0, host)`는 권한 확장 실행에서 `127.0.0.1`, `0.0.0.0`, `::1`, `::` 모두 성공했다. 따라서 일반 Node의 바인딩 성공만으로 Turbopack 평가 프로세스 경로의 실행 권한을 보장할 수 없다. 같은 증상의 [Codex 공개 보고](https://github.com/openai/codex/issues/50945)도 참고했으며, 판단 근거는 이번 동일 프로젝트 비교 결과다. OS 내부에서 권한이 달라지는 정확한 지점까지 추적한 것은 아니다.

설치된 Next.js 문서 `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/turbopackPluginRuntimeStrategy.md`와 `dist/server/config.js`를 확인했다. 기본 childProcesses는 소켓으로 통신한다. workerThreads는 현재 Node 버전에서 종료 시 충돌 방지 때문에 childProcesses로 되돌아간다. 강제 설정이나 Node 하향 조정은 적용하지 않았다.

## AC 및 핵심 검증

| AC | 상태 | 확인 방법과 결과 |
| --- | --- | --- |
| T1 오류 발생 조건 확인 | 충족 | 같은 Node·코드·설정에서 Codex 기본/확장 실패, 일반 터미널 성공 비교. Codex 내부 제한은 남음 |
| T2 기본 Turbopack 빌드 성공 | 충족 | 사용자 실행 exit 0 + 로그 직접 확인. `/admin`, `/apply`, `/api/admin`, `/api/receipts`, `/api/trpc/[trpc]` 생성. CSS 산출물 16,767바이트 및 app-paths manifest 직접 검사 |
| T3 기존 코드·설정 보존 및 기록 | 충족 | 소스·설정·handoff 127파일 SHA-256 전후 일치. 빌드가 바꾼 next-env.d.ts는 작업 시작 내용으로 복원. 스타일 149파일 위반 0, 문서 링크·형식·diff·학습 제외 검사 |

컴파일 1,276ms, TypeScript 1,043ms는 이번 로그의 단일 실행 값이다. 캐시 상태를 통제하지 않았으며 전체 빌드 시간이나 성능 개선율로 사용하지 않는다. 전체 앱 테스트는 재실행하지 않았다. 제품 코드 변경 없이 실제 기본 production 빌드와 스타일·문서 검사를 수행한 작업이다. 화면 변경이 없어 브라우저 수동 확인은 해당 없음이다. Android 화면 테스트는 별도 미검증 항목이다.

README에 실행 환경 비교 방법을 추가하고 진행/검증 문서 및 최근 PR·커밋 초안을 갱신했다. 로컬 학습은 보존하고 Git에서 제외한다. 커밋·push·PR 생성은 하지 않았다. 이번 초안은 빌드 진단 문서 변경 범위이며 실제 6일차 PR 준비 때 전체 diff로 다시 작성해야 한다.
