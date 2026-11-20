# 4일차 병합 후 보완 검증

2026-11-20 KST. PR #6 병합 커밋 `0a66a38` 기준. 제품 코드를 추가로 변경하지 않고 최종 취소 수명 보정 이후의 iOS 측정, 실제 입력/복원, 상태 문서를 보완한다. [계획](../plans/day-04.md). 과거 문서의 ‘사용자 확인 대기·PR 준비’는 당시 기록이며 PR #6은 2026-11-19 병합 완료됐다.

## AC

| ID | 상태 | 확인 방법과 결과 |
| --- | --- | --- |
| AC1 최종 iOS 재검증 | 충족 | 준비1+본10 성공. 별도 실제 DB 지연 저장·닫기 후12건/88,000원 및 늦은 응답 폐기. 원본 저장, 원래 세션 복구와 fixture 정리true |
| AC2 입력과 실제 복원 | 충족(환경 범위 명시) | 사용자 iPhone17 직접 키보드 입력·제출·홈87,000원 확인, DB13건 및 홈 화면 교차 확인. production Chrome 실제 BFCache 왕복2회 persisted=true, 입력 유지·정책 재연결·미확정 저장1건의 재제출 차단. WKWebView BFCache 자체는 미검증 |
| AC3 최신 상태·보존 | 충족 | main의 PR #6 병합과 진행/측정/초안 갱신. 기존 사용자 변경/학습/이전 측정68개 파일 해시 동일, 학습 Git 제외 유지 |

## 실제 실행과 한계

- iOS 개발 앱은 iPhone 17, iOS 27.2, 기존 Debug 클라이언트+현재 Metro다. 기존 Next 개발 서버3000, Metro8081, PostgreSQL55432를 사용했다. 별도 가상 회사/사용자/세션만 만들며 원래 SecureStore 값은 네이티브 메모리에 보관 후 대조 복구한다.
- 저장 중 종료 검증은 실제 Membership 행을 별도 트랜잭션으로 잠그고 API 트랜잭션이 `pg_blocking_pids`에 잡히는 것을 확인한 뒤 화면을 닫는다. 저장 전11건·89,000원, 잠금 해제 후12건·88,000원을 실제 홈 Query 결과로 확인하고 종료한 폼의 결과 응답은 폐기한다. 일반 timeout 이후 아주 늦은 DB commit까지 보장한다는 뜻은 아니다.
- Device Hub 처음 호출은 도구 응답 만료, 재연결 후 기기 선택·화면 확인은 가능했다. iPhone 폼의 접근성 자식이 노출되지 않고 좌표 탭은 `noWindowsAvailable`로 거부돼 실제 iOS 키보드 입력은 사용자에게 확인 요청했다. 다른 Mini 시뮬레이터의 오래된 모듈 오류는 이번 iPhone 17 실행 결과와 구분하며 그 기기는 수정하지 않았다.
- Chrome 사용자용 `/apply` 미리보기에 실제 키 입력 API로1000/Keyboard check 입력, Tab 이동과 비활성 제출을 확인했다. [화면](day-04-followup/browser-keyboard.png). 이는 iOS 소프트 키보드 검증을 대신하지 않는다.
- `verify-claim-restore.mjs`: 가상 DB 세션과 실제 ClaimHost Node 어댑터를 사용하는 별도 Chrome 테스트. BFCache 사용을 막는 Playwright 기본 실행 인자를 제외하고 실제 `goto`/`goBack`을 수행했다. 합성 pageshow는 쓰지 않았다. production Chrome에서 ready 복원 시 입력과 정책 재연결, 응답을 전달하지 않은 저장 뒤 복원 시 내역 확인 안내와 제출 잠금, DB1건 유지 확인. [원본](day-04-followup/restore.json), [로그](day-04-followup/restore.log), [화면](day-04-followup/bfcache-interrupted.png). iOS WKWebView의 BFCache 입증으로 확대하지 않는다.
- 첫 개발 서버 복원은 no-store/HMR WebSocket 등으로 persisted=false였고 assertion 실패했다. [실패 원본](day-04-followup/restore-dev-failed.json), [로그](day-04-followup/restore-dev-failed.log). 같은 제품 코드의 production webpack 빌드를 새로 생성해3100에서 검증했다. 캐시 헤더를 변경하거나 제품 보안 정책을 완화하지 않았다.
- 첫 production 복원은 persisted=true였지만 어댑터의 `page.url()`이 복원 이벤트보다 늦게 갱신돼 WEB_READY가 허용 URL 검사에서 거부됐다. 메시지 종류 진단으로 확인 후 실제 문서 `location.href`를 전달했다. [첫 실패](day-04-followup/restore-production-failed.log), [진단](day-04-followup/restore-adapter-failed.log). 제품 결함으로 판단하지 않았으며 origin 검사는 유지된다.
- 전체 `npm test`: 실제 로컬 DB, Node24.18.0,25파일232개 pass/skip0, pretest 스타일104파일 위반0. [로그](day-04-followup/tests.log). `npm run build -w @chagok/web -- --webpack` 성공 [로그](day-04-followup/build.log). 빌드가 변경한 next-env는 작업 시작 내용으로 복원했다. 타입/Android/실기기/Release 검증은 이번 변경 범위에 새로 수행하지 않았다.

## 실행 방법

```sh
# Node24, 기존 DB/Next3000/Metro8081/iPhone17 실행 상태
DAY04_FOLLOWUP=1 DAY04_ARTIFACT=day-04-followup node --env-file=apps/web/.env.local --experimental-transform-types packages/api/scripts/verify-claim-native.mjs
# 별도 production Next3100 실행 후
DAY04_WEB_ORIGIN=http://127.0.0.1:3100 node --env-file=apps/web/.env.local --experimental-transform-types packages/api/scripts/verify-claim-restore.mjs
```

재실행 시 원본 경로를 먼저 별도 보존한다. iOS 수동 입력 대기는 `DAY04_MANUAL_GATE`로 지정한 /tmp 파일 생성 신호를 사용하며 기본 실행에는 대기가 없다. 이 파일에 세션/입력 본문을 기록하지 않는다. 검증 중 가상 세션을 사용하는 동안 실제 사용자 신청을 섞지 않는다.

## 최종 iOS 원본과 수동 확인

[측정 원본](../metrics/raw/day-04-followup.json), [환경](../metrics/environments/day-04-followup.json), [로그](day-04-followup/native.log). 본10개 중앙2156.9ms/제출33.0ms. 정상11건(준비 포함)+지연 저장1건+사용자 입력1건을 분리했다. 사용자가 직접 입력·제출·홈87,000원 확인 완료를 회신했고 [홈 화면](day-04-followup/ios-home.png)과 DB13건으로 교차 확인했다. 원래 SecureStore 저장값 재조회 일치, fixtureCleaned=true.

사용자용 Chrome 미리보기는 http://127.0.0.1:3000/apply 에 열었다. 저장은 비활성이다. 새 화면 변경은 없으며 이번은 기존 화면 검증이다. Android/실기기/Release, 새 Google 로그인 및 WKWebView 자체 BFCache 동작을 확인했다고 주장하지 않는다. 4일차 기능 미완료가 아니라 검증 환경의 경계다.

## 독립 검토와 실패 시 정리

검토에서 제품 코드 문제는 없었고 검증 도구의 정리 경로2건을 보강했다. 브라우저 진단/종료 실패와 DB 정리를 분리하고, native 잠금 트랜잭션 실패가 acquired 대기에 즉시 전달되도록 했다. [리뷰 기록](day-04-followup/review.md).

- 브라우저 페이지를 의도적으로 닫음: 예상한 exit1, completed=false, fixtureCleaned=true, cleanupErrors=[] 확인. [원본](day-04-followup-closed-page/restore.json), [로그](day-04-followup-closed-page/run.log).
- 실제 native 준비 후 잠금 획득 실패 주입: 예상한 exit1, completed=false, restored=true, fixtureCleaned=true 확인. [원본](../metrics/raw/day-04-followup-lock-failure.json), [환경](../metrics/environments/day-04-followup-lock-failure.json), [로그](day-04-followup-lock-failure/run.log). 이 실행의 정상 제출 표본은 장애 확인용이며 최종 성능 표본에 합치지 않는다.
- 브라우저 정상 복원 시나리오도 보강 후 재실행해 completed=true와 fixtureCleaned=true 확인. 최종 전체232테스트 및 스타일104파일 위반0 재확인.
- 실측 실행 당시 native 스크립트는 [보존본](day-04-followup/native-executed.mjs)으로 환경 해시와 대조했다. 이후 바뀐 것은 검증 도구의 정리와 홈 증거 캡처뿐이다. 실패 경로 수정은 실제 실패 주입으로 검증했으며 제품 코드의 TDD 수정으로 표기하지 않는다.

이번 보완은 새 commit/push/PR 없이 로컬 변경으로 남긴다. 기존 학습 자료, handoff.md, next-env 내용과 과거 원본은 보존했다. [최종 보존 검사](day-04-followup/checks.log).

종료 후 DB 읽기 검사에서 검증용 회사0/사용자0을 확인했다. [DB 정리 확인](day-04-followup/db-cleanup.log). 이번에 시작한 production3100 서버는 종료했고 기존3000/Metro/DB는 유지했다. 로컬 기록 작성 중 stdin 인코딩 오류와 초안 교체 patch 형식 오류는 파일 변경 전에 실패했으며 UTF-8 파일 쓰기와 링크/구조 검사로 정상 반영을 확인했다.
