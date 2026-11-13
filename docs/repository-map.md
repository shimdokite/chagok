# 실제 저장소 지도

확인일: 2026-11-13 KST. 실제 루트: `/Users/doyeon/Desktop/chagok`.

## 시작 전 조사

- `pwd`: 위 경로. `ls -la`: `.`/`..`만 존재. `rg --files`: 앱 소스·package.json·lockfile 없음.
- `git status --short`: `fatal: not a git repository`.
- `/AGENTS.md`, `/Users/AGENTS.md`, `/Users/doyeon/AGENTS.md`, `/Users/doyeon/Desktop/AGENTS.md` 및 대상 폴더: 없음.
- 따라서 기존 생성·AI·billing·credit·payment·ledger·worker·webhook·인증·배포·DB 경로가 없음. 복지 한도를 크레딧 시스템으로 간주하지 않음.
- 작업 중 Next.js 16.4.6 dev 서버가 **새로** `apps/web/AGENTS.md`를 생성함. 읽고 번들된 `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`를 확인함. 시작 전에 있었던 파일로 기록하지 않음.
- 신규 npm workspaces를 선택. Git 초기화·브랜치·PR은 사용자 OK 이후 단계로 남김.

## 제안 → 실제 → 책임

모든 경로는 루트 상대 경로입니다. 아래 항목은 오늘 신규 생성했습니다.

| 제안 경로 | 실제 경로 | 책임 |
| --- | --- | --- |
| package.json, lockfile | package.json, package-lock.json, .nvmrc, tsconfig.base.json | npm·Node24·TS |
| mobile/app.config.ts | apps/mobile/app.config.ts | 식별자·scheme·라우터 |
| mobile/app/_layout,index,home,apply | apps/mobile/app/*.tsx | 네이티브 이동·화면 |
| mobile/theme,components,fixtures | apps/mobile/src/{theme,components,fixtures}/ | 시안 토큰·RN UI |
| fixture 원본 | packages/contracts/src/demo.ts | 웹과 앱이 동일 가상 한도 사용 |
| mobile/lib/trpc.ts | apps/mobile/src/lib/trpc.ts | AppRouter 타입 및 실제 HTTP |
| mobile/useWebViewBridge.ts | apps/mobile/src/bridge/useWebViewBridge.ts | 검증·ready·close·cleanup |
| mobile/metrics | apps/mobile/src/metrics/ | 순차 계측·요약·탐색 간 원본 보관 |
| mobile/dev | apps/mobile/src/dev/ | 개발용 연결 확인·공유 |
| 웹 미리보기 전용 | apps/mobile/src/components/ApplyContainer.web.tsx | WebView 미지원 브라우저에서 iframe 안내 |
| web/app | apps/web/src/app/ | layout, 비활성 /apply, tRPC fetch adapter |
| web/BridgeReceiver | apps/web/src/components/bridge/BridgeReceiver.tsx | 수신 등록·PONG·WEB_READY·삭제 |
| packages/api | packages/api/src/{router,index,http.test}.ts | public health 라우터·HTTP/CORS 검증 |
| packages/contracts | packages/contracts/src/{bridge,demo}.ts 및 테스트 | 외부 입력 계약·한도 산식 |
| docs/* | docs/ 아래 계획·시안·검증·학습·측정 | 연속 작업 기록 |

전체 확정 파일 목록은 `verification/changed-files.txt`. `.next`, `.expo`, `dist`, `node_modules`, 생성된 `ios`, tsbuildinfo는 설치/빌드 산출물이고 소스 목록에서 제외합니다.

## 원본 보존

`/Users/doyeon/Documents/Codex/2026-11-13/new-chat-5/outputs/chagok-day-01-handoff`의 지시서·PNG 2개·HTML을 복사했습니다. 원본을 수정하지 않았습니다. SHA-256 비교 결과는 `verification/source-preservation.log`에 있습니다. 다른 handoff 디렉터리·zip·원본 MVP/preview HTML 역시 변경하지 않았습니다.


## M08·M09 추가 파일

- `apps/mobile/src/dev/useBoundaryProbe.ts`: 실제 WebView 경계 입력 및 콜백 기록.
- `apps/mobile/src/dev/VisualCheckControls.tsx`, `useVisualCheckScroll.ts`: 로컬 opt-in 화면 영역 이동 도구.
- `scripts/verify-m08.mjs`: 저장된 실제 콜백 JSON 검증.
- `docs/verification/m08-m09/`: 실제 원본, 수정 전후 PNG, 타입/테스트/export 로그, 최종 소스 manifest.

홈/잔액/최근 신청의 최대 글자 표시를 수정했습니다. 제품 신청·저장 기능은 추가하지 않았습니다. 원본 보존 절은 최초 복사 시점 기록이며 이후 사용자의 명시적 요청으로 작업 사본 HTML의 allow-forms만 수정했습니다. 이전 원본은 `verification/prototype/chagok-prototype.before.html`에 보존했습니다.
