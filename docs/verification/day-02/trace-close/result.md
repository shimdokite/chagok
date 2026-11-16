# 웹뷰 종료 기록 수정 결과

2026-11-16 KST. 사용자 피드백: “보류한 웹 닫기 종료 기록 누락과 unmount 세대가 0으로 남는 문제도 이번에 수정하자.” [시작 상태](initial-state.json)를 기준으로 기존 변경을 보존했다. Node24.22.3, Vitest5.1.0, 로컬 PostgreSQL 환경.

## 변경 및 원인

웹 CLOSE_WEBVIEW는 useWebViewBridge의 출처·schema 검사 → reset("close") → back 경로를 지나 이전 native 버튼의 record를 통과하지 않았다. mount effect의 cleanup은 unmount 세대0을 고정 기록했다.

[이번 소스 diff](source.diff): ApplyContainer.tsx의 closeAndGoBack에서 close를 이동 전에 기록하고 웹 callback과 native 닫기가 이 경로를 공유한다. native 전용 record를 제거해 중복을 피했다. revision은 useLayoutEffect에서 committedRevision ref에 반영하고 unmount는 그 값을 읽는다. revision을 mount effect 의존성에 넣지 않아 reload마다 가짜 unmount를 만들지 않는다.

15초 제한·retry·브리지 reset/출처/schema 검증·화면 구성·인증/API/DB·의존성은 변경하지 않았다. Release는 기존 trace 비활성 정책을 유지한다. 한 번의 유효한 닫기 호출당1회 기록이며 반복되는 별개 닫기 요청 자체를 dedupe하는 기능을 추가한 것은 아니다. 기록은 기존 인스턴스의 메모리에만 있으므로 화면 종료 후 조회/영속 보관 기능까지 추가한 것은 아니다.

## 필수 검증 5묶음

1. **결함 재현 및 대상 회귀:** [RED](red.log)7개 중3실패/4통과. 웹 close 배열이 비어 있었고 reload3회 후 unmount0, native close후 unmount0으로 실패했다. 최소 수정 후 [GREEN](green.log)7개 통과. 실제 컴포넌트·useWebViewBridge·WebViewTrace를 실행하되 React hook은 동기 host, RN 시각 요소/라우터는 경계 대역으로 치환했다. 검증 대상은 기록 내용/시점/브리지 거부 경로이며 실제 React scheduler·concurrent render·네이티브 OS는 검증하지 않는다.
2. **전체 회귀·타입·형식:** Node24에서 env-file DB URL을 CHAGOK_TEST_DATABASE_URL로 주입해 `vitest run` [12파일71개 통과, skip0](tests.log), `npm run typecheck` 전 workspace exit0 [로그](typecheck.log). 수정한 TSX2개 Prettier 검사 통과. [실행 기록](commands.json). web/native build 설정이나 의존성 변경이 없어 웹 production 빌드·iOS 재빌드는 미실행이며 이전 결과를 재사용하지 않았다.
3. **독립 리뷰:** [리뷰](review.md)에서 조치가 필요한 결함 없음. 기존 두 보류 사항의 코드 수정과 테스트를 확인했다. 전체 2일차 구현 재리뷰·PR 승인은 아니다.
4. **기록·보존:** [최종 검사](document-check.json). 기존 사용자 변경·OAuth/측정 원본·과거 로그/manifest는 보존하고 과거 보류 기록에는 해결 링크만 덧붙였다. staged 비어 있음, 로컬 day02 학습 ignored. 전체 git diff 공백 오류는 이전 day01 학습9줄이며 해당 경로 제외 검사는 통과했다.
5. **화면·수동 구분:** 화면 배치/조작 UI 변경이 없는 내부 진단 수정이므로 새 서버 기동·브라우저 열기는 해당 없음. 이번 시뮬레이터/실기기 종료 재실행은 미검증이며 이전 Option+Tab/Space와 native 장애 실험 결과를 이번 결과로 세지 않는다. 기존 개발 화면 주소는 `http://localhost:3000/apply`이나 브라우저 화면으로 native cleanup 기록을 검증할 수 없다. 개발 trace는 인스턴스 메모리이므로 닫은 뒤 홈에서 종료 trace를 조회할 수 없다는 기존 제한도 유지한다.

## AC

| AC | 상태 | 확인 방법·실제 결과 |
| --- | --- | --- |
| C1 웹 닫기 기록 | 충족 | 실제 bridge가 수락한 CLOSE_WEBVIEW에서 세대2 close1회가 router 이동 전에 존재. 잘못된 출처/JSON/schema는 이동·close0회 |
| C2 마지막 세대 종료 | 충족 | reload3회 후 unmount3, reload 도중 unmount0회. native close/unmount는 세대1로 일치하고 timer가 정리됨 |
| C3 회귀 | 충족 | RED3실패→대상7통과, 전체71통과/타입 통과. Release 비수집 확인. native/concurrent runtime은 미검증 |
| C4 검증 기록 | 충족 | 원인·수정·이번 명령/결과와 독립 리뷰, 이전 증거와 구분한 한계를 저장 |
| C5 학습·보존·초안 | 충족 | 로컬 학습 갱신, 최신 PR/커밋 초안 작성, 기존 원본 보존. 커밋/push/PR/학습 추적 제거 없음 |

과거 타임아웃의 최종 JS 오류 분기는 여전히 미확정이다. 이번 수정은 종료 이벤트 누락과 잘못된 세대 기록을 해결하며 과거 원인을 소급 확정하지 않는다.

후속 native 실측 — 2026-11-16: 위에서 미검증으로 남겼던 준비 완료 후 종료2경로를 [iOS Simulator 실제 실행](../native-close/result.md)에서 확인했다. 웹2회/native3회 재로드 후 마지막 세대의 close→unmount 각1회와 홈 복귀를 확보했다. 위 자동 테스트 당시의 한계와 원본은 그대로 보존한다.
