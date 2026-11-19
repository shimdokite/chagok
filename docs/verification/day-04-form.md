# 4일차 후속 — 폼 연결, 검증과 실측

2026-11-19 KST. [상세 계획](../plans/day-04.md)의 후속 범위다. 앞선 [서버 단계](day-04.md)와 기존 미커밋 변경 위에서 이어 작업했다. 현재 main에서 commit/push/PR은 수행하지 않았다.

## AC 결과

| ID | 상태 | 확인 방법과 실제 결과 |
| --- | --- | --- |
| D4-F1 폼 | 충족 | 정책/사용월/카테고리/잔액 기반 입력, 검증/상태 안내. Chrome 실제 DOM에서 정책 없음/초과/빈 내용 차단, 320px 가로 넘침 없음. iOS 실제 폼 표시 |
| D4-F2 제출 | 충족 | native 인증 API 경로와 실DB 저장, 중복 클릭/불명확 재시도. 브라우저에서 저장 응답 전달을 버린 뒤 동일 UUID 재전송에도12행 유지. 앱과 웹에 토큰을 공유하지 않음 |
| D4-F3 갱신 | 충족 | 실제 QueryClient의 홈/내역 무효화 후 HTTP 재조회 결과 대조. iOS11건 저장 후 홈89,000원/검토중11,000원 표시. 조회 실패/불명확 저장은 생성 재실행과 구분 |
| D4-F4 경계 | 충족 | origin/schema/연결세대/close/reload/late reply/foreground busy/초기 timeout/진단 보호 회귀. 소속 변경은 잠금 안에서 거부. iOS10회 재진입. BFCache는 상태 복원 회귀이며 실제 OS BFCache 왕복 검증은 별도 미실행 |
| D4-F5 실측 | 충족 | Chrome/iOS 각각 준비1+본10 실제 저장 성공, 원본과 환경/소스 해시 보존. 경계와 시계/한계를 구분하고 가상 데이터 정리/로그인 저장값 복구 확인 |
| D4-F6 기록 | 충족 | 실제 DB 포함228테스트, style/type/build 통과, 독립 리뷰 중요 사항 수정, 로컬 학습과 최신 초안, 기존 변경 보존 검사 |

사용자의 화면 확인은 아직 대기다. 자동 UI 검증을 사용자 승인으로 기록하지 않는다. Android/물리 기기/Release/새 Google 로그인, 영수증 첨부는 미검증 또는 다음 범위이며 위 완료 선언에 포함하지 않는다.

## 이번 실행 검증 (9개 묶음)

1. **TDD/경계:** [계약 RED](day-04-form/red-contract.log) 2fail/5pass 후 구현. 호스트/폼의 새 모듈 미구현 import 실패는 [host](day-04-form/red-host.log)/[client](day-04-form/red-client.log)에 남겼고 구현 후 동작 검증했다. [리뷰 RED](day-04-form/review-red.log) 6fail/12pass + 미구현 helper suite 실패, [DB RED](day-04-form/review-db-red.log)1fail/14선택제외, [진단 RED](day-04-form/review-probe-red.log)1fail 후 수정. [집중 GREEN](day-04-form/review-focused.log)27pass.
2. **실제 DB 전체:** Node24에서 아래 명령 실행 → **24파일228테스트 pass, 실패0/skip0**, [로그](day-04-form/tests.log). 서버단계200개에 후속28개. 테스트 fixture는 격리 생성 후 삭제했다.
3. **스타일:** `npm run style:check` → 직접 작성한102파일, 위반0. [로그](day-04-form/style.log). 중간 신규 함수 간격 위반은 수정했고 의미/책임은 독립 코드 리뷰로 확인했다.
4. **타입:** `npm run typecheck` → mobile/web/api/contracts4개 exit0, [로그](day-04-form/typecheck.log). 빌드가 바꾼 next-env를 시작 바이트로 돌려놓은 뒤 다시 통과했다.
5. **빌드:** `npm run build -w @chagok/web -- --webpack` → production 빌드 exit0, `/apply`는 요청 시 KST 날짜를 계산하는 동적 페이지, [로그](day-04-form/build.log). 개발 서버는 Turbopack으로 동작했으나 기본 production Turbopack 성공을 주장하지 않는다.
6. **UI:** Chrome320px preview/실제 제출/거부/불명확 상태와 iOS27.2 실제 WebView 저장 및 홈 갱신 확인. [브라우저](day-04-form/browser-measure.log), [iOS](day-04-form/native.log), [미리보기](day-04-form/preview-320.png), [성공](day-04-form/success-390.png), [불명확](day-04-form/uncertain-390.png), [iOS 준비](day-04-form/ios-ready.png), [iOS 성공](day-04-form/ios-success.png), [iOS 홈](day-04-form/ios-home.png).
7. **실측:** [원본/환경과 통계](../metrics/daily/day-04.md). Chrome 준비 중앙141.0ms/제출23.1ms, iOS 준비2584.3ms/제출35.0ms. 각10개이며 시작점이 달라 준비 시간끼리 직접 비교하지 않는다.
8. **독립 리뷰:** [발견과 조치](day-04-form/review.md). 중요6개와 추가 연결복구2개를 수정하고 회귀/실측으로 확인. 두 번째 리뷰는 수행하지 않았다. 미해결 사소한 권고 없음.
9. **문서/보존:** [최종 검사](day-04-form/checks.log), [소스 해시](day-04-form/source.sha256), [DB 확인](day-04-form/db-cleanup.log): 측정 fixture0, 앞서 보존한 서버 단계6개 테이블 스냅샷과 기존 행 동일. 초기557파일 스냅샷에서 의도한17개 변경과 나머지540개 바이트 동일을 확인했다. 기존 서버 로그/실측/인계 자료는 유지하며 로컬 학습 경로 tracked/staged/PR diff는 비어 있다. 최신 초안만 규칙에 맞춰 교체했다.

```sh
PATH=/Users/doyeon/.nvm/versions/node/v24.18.0/bin:$PATH node --env-file=apps/web/.env.local --input-type=module -e 'import {spawnSync} from "node:child_process"; const r=spawnSync("npm",["test"],{stdio:"inherit",env:{...process.env,CHAGOK_TEST_DATABASE_URL:process.env.DATABASE_URL}}); process.exit(r.status??1);'
```

## 실패, 복구와 환경 차이

- xcrun의 기본 developer dir에서는 simctl을 찾지 못했고, Xcode developer dir을 지정했다. 샌드박스의 CoreSimulator 접근 제한은 허용된 로컬 실행에서 해결했다.
- 처음 루트 npm 스크립트로 전달한 `--webpack`/`--localhost` 인자가 전달되지 않아 경고가 났다. 실제 Next 개발 모드는 Turbopack이고 Expo는 기존 설정으로 실행됐다. 버전 업데이트 안내는 적용하지 않았다.
- Playwright가 요구한 번들 Chromium이 없어 [시작 실패](day-04-form/browser-launch-failed.log), 설치된 Chrome으로 실행. Next route announcer와 폼 alert 선택자 충돌 [실패](day-04-form/browser-selector-failed.log)/[표본0](day-04-form/browser-selector-failed.json) 후 폼 경고로 좁혔다.
- Native 디버거는 Origin 누락 시401, 연결 직후 명령은 세션 연결 전 종료를 보여 허용된 localhost Origin과 attach 대기를 적용했다. 이는 앱 인증 우회가 아니며 실제 DB 세션/회사 검증은 그대로 수행했다.
- Hermes의 async evaluate 결과 객체를 복구 완료로 오인할 위험을 발견했다. [당시 원본](day-04-form/native-async-observation.json)의 restored 객체는 완료 증거로 쓰지 않는다. 최종 실행은 준비/복구 완료 flag를 기다리고 SecureStore 재조회값을 이전 값과 비교한 뒤 `restored: true`를 기록했다.
- 임시 문서 검사 도구의 첫 실행은 아직 생성 전인 source.sha256 링크 때문에, 다음 실행은 제목 분리식이 5번 질문까지 잘라 실패했다. 생성 순서와 행 시작 정규식을 수정했으며 문서 내용을 줄여 통과시키지 않았다. 최종 링크/대표 질문5개 검사는 통과했다.
- Node의 transform-types experimental/typeless module 경고는 측정 도구 실행에서 남는다. 경고를 없애려고 앱 모듈 형식이나 의존성을 변경하지 않았다.
- UI 수동 타이핑/키보드 전 과정, OS 실제 BFCache, Android/실기기 네트워크 전환은 별도 확인이 필요하다. DOM 이벤트 자동화 성공을 이 항목들의 성공으로 확장하지 않는다.

## 사용자 직접 확인

개발 서버 `http://127.0.0.1:3000/apply`를 실행하고 Codex 브라우저에 열어 두었다. 단독 브라우저는 **입력 미리보기**, 제출 버튼 비활성이다. 항목/날짜/금액/내용, 좁은 화면 줄바꿈을 확인할 수 있다.

iOS 개발 앱에서 로그인과 회사 연결 후 홈의 **복지비 신청하기**를 열어 입력/제출, 성공 안내, 홈 잔액과 신청 내역 반영을 확인한다. 검증용 가상 계정은 삭제했고 기존 로그인 저장값으로 복구했으므로 사용자 계정을 자동 연결하거나 남겨 두지 않았다. 화면을 닫기/재로드한 시점에 결과가 불명확했다면 신청 내역부터 확인한다. 영수증 버튼은 아직 준비 중이다.

## 사이드이펙트와 남은 작업

- 기존 v1 PING/PONG/WEB_READY 유지, FORM_*와 CLAIM_*만 추가했다. 이전 앱은 새 폼 초기화가 없으면 업데이트/재진입 안내를 보게 된다. 앱/웹을 함께 배포해야 한다.
- `expectedCompanyId`는 선택적 **비교 조건**이며 저장 회사 결정값이 아니다. 웹 브릿지에서 이 값은 거부하고 앱이 세션 소속을 넣는다. 실제 회사/user/status는 서버가 결정한다. 추가 DB migration은 없다.
- 같은 사용자의 생성 중복/한도 잠금은 유지한다. 승인/반려/정책 변경의 미래 쓰기 경로는 잠금 규칙을 재검토해야 한다.
- 저장 후 조회를 즉시 무효화하므로 추가 조회가 생긴다. 응답 유실도 무효화하며 조회 오류 때문에 새 신청 키를 생성하지 않는다.
- 닫기/완전 재로드 뒤 초안 영구 복구는 범위 밖이다. 로컬 HTTP 개발 origin 대응 UUID를 추가했지만 운영 HTTPS 요구를 대체하지 않는다.
- 다음 기능은5일차 영수증 첨부다. 실제 commit/push/PR은 사용자 화면 확인과 승인 후 별도 준비한다.
