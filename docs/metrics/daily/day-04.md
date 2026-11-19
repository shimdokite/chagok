# 4일차 폼 실측

2026-11-19 KST. 서버 단계의 표본0/미측정은 당시 기록이며, 이번 후속 작업에서 아래 실제 표본을 수집했다.

| 환경과 경계 | 본 표본 | 성공 | 중앙값 | 최소~최대 |
| --- | ---: | ---: | ---: | ---: |
| Chrome: navigationStart → 입력 준비 Effect | 10 | 10 | 141.0ms | 111.0~243.3ms |
| Chrome: submit 핸들러 → 성공 Effect | 10 | 10 | 23.1ms | 18.2~48.9ms |
| iOS: RN load reset → FORM_READY 수신 | 10 | 10 | 2584.3ms | 1910.5~4455.8ms |
| iOS: 웹 submit 핸들러 → 성공 Effect | 10 | 10 | 35.0ms | 20.0~190.0ms |

- 각 환경은 준비1회 + 본10회다. 준비 표본은 별도 표시하고 통계에서 제외했다. 본 측정의 실패/timeout/취소는 각각0이다. 별도 브라우저 장애 실험에는 결과 전달을 버린 timeout1회와 동일 키 재시도 성공1회가 있으며 정상 시계열과 섞지 않았다.
- [브라우저 원본](../raw/day-04-form.json), [브라우저 환경/소스 해시](../environments/day-04-form.json), [iOS 원본](../raw/day-04-native.json), [iOS 환경/소스 해시](../environments/day-04-native.json).
- Node24.18.0, 설치된 Chrome headless, Next16.4.6 개발 Turbopack, 로컬 PostgreSQL18.6. iOS27.2 iPhone17 시뮬레이터의 기존 Debug 개발 클라이언트와 현재 Metro 번들을 사용했다. 서버와 DB가 실행 중인 warm 조건이며 서버 cold start 표본은 없다.
- 브라우저는 실제 ClaimHost를 Node 어댑터로 연결했고 iOS는 실제 RN WebView/브릿지/보안 저장소/API 경로를 통과했다. 두 환경 모두 격리된 가상 사용자에게 발급한 실제 DB 세션으로 저장했다. 이번에 Google OAuth 로그인 자체를 재검증한 것은 아니다.
- iOS 입력/이동은 개발 디버거와 DOM 이벤트로 자동화했다. 직접 손으로 탭한 사용성 측정이 아니다. 준비 시간은 RN의 동일 단조 시계, 제출은 웹의 동일 단조 시계에서 계산했다. RN 시각과 웹 시각을 서로 빼지 않았다.
- 브라우저와 iOS의 준비 시작점이 달라 값으로 플랫폼 성능 우열/개선율을 계산하지 않는다. 개발 도구와 로컬 프로세스, 시뮬레이터 영향을 포함하며 실기기/Release/운영 성능으로 일반화하지 않는다. 표본10으로 p95를 주장하지 않는다.
- 새로 준비한 측정 계정/회사/정책/신청은 finally에서 삭제했다. iOS 원래 SecureStore 값은 네이티브 메모리에서만 보존했고 완료 신호 및 저장값 재조회로 복구를 확인했다. 원본에 세션 토큰, 이메일, 신청 본문은 없다.

## 재현과 탐색 기록

```sh
# 프로젝트 루트, Node24, 로컬 DB/Next 서버 실행 상태
node --env-file=apps/web/.env.local --experimental-transform-types packages/api/scripts/measure-claim-form.mjs
# Metro8081와 설치된 iPhone17 시뮬레이터 앱도 필요
node --env-file=apps/web/.env.local --experimental-transform-types packages/api/scripts/verify-claim-native.mjs
```

브라우저 첫 실행은 설치된 Playwright의 번들 Chromium이 없어 실행 실패했고 설치된 Chrome으로 전환했다. 다음 실행은 Next route announcer와 폼 alert가 함께 선택돼 검증 스크립트가 실패했으며 폼 문구로 좁혀 수정했다. 두 실패는 정상 표본에 포함하지 않았고 [실행 로그](../../verification/day-04-form.md)에 남겼다.

첫 브라우저 탐색은 외부 클릭 대기까지 포함한 시작점이었다. [탐색 원본](../../verification/day-04-form/browser-exploratory.json)을 보존하고 실제 submit 핸들러 mark로 최종10회를 다시 측정했다. iOS 탐색 [첫 원본](../../verification/day-04-form/native-exploratory.json)과 [비동기 관찰 원본](../../verification/day-04-form/native-async-observation.json)도 최종 통계에 합치지 않았다. 후자는 Hermes 디버거가 async 결과를 Promise 객체로 돌려줘 복구 완료 확인에 충분하지 않았고, 최종 실행은 명시적 완료 신호와 값 대조로 `restored: true`를 확인했다.

과거 서버 동시성 테스트의 실행 시간이나 이전 날짜 표본을 이번 실측으로 재사용하지 않았다. [검증과 수동 확인](../../verification/day-04-form.md).


## PR 준비 시 적용 범위

이 수치는 폼 연결 완료 당시 원본이다. 이후 [PR 리뷰](../../verification/day-04-pr.md)에서 native HTTP의 화면 종료 취소 수명을 보정했다. 보정 후 실측은 재실행하지 않았고 기존 raw/environment/source hash를 수정하지 않았다. 정상 제출 수치를 보정 후 성능 증거로 확대하지 않는다.
