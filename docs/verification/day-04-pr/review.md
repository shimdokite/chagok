# 4일차 전체 PR 독립 리뷰

전체 미커밋 서버·폼 소스와 신규 파일을 읽기 전용 리뷰했다. Critical0, Important/P2 1건. 서버의 권한·소속·정책·한도 잠금·멱등성·추가형 migration에는 다른 Important 문제를 찾지 못했다.

P2: 화면 reset이 mutation fetch를 abort하면 finally의 캐시 무효화가 DB commit보다 먼저 끝난다. 활성 QueryObserver에서 serverBalance64000/cachedBalance65000/isInvalidated=false를 재현했다. 기존 late-success 테스트는 abort를 따르지 않는 Promise였다.

수정: native benefitsClient의 fetch에서 발송 직전 signal을 검사한다. 발송한 POST는 독립8초 timeout, GET은 기존 화면취소+timeout을 사용한다. useClaimHost의 mutate signal도 제거한다. 닫힌 연결의 응답은 기존 active 검사로 버리되 실제 settlement 뒤 캐시를 무효화한다.

RED2실패/2통과를 확인하고 구현 뒤 실제 client/host/활성 cache observer를 포함한 집중22개, 전체 실제 DB232개를 통과했다. 수정된 api.ts/useClaimHost.ts/api.test.ts 세 파일을 제한적으로 다시 리뷰해 최초 P2 해결과 새 Critical/Important 없음 판정을 받았다. 전체 두 번째 리뷰라고 주장하지 않는다.

한계:8초 timeout은 서버 작업 종료를 증명하지 않는다. 장시간 서버 처리/네트워크 유실 후 확정은 열린 폼 동일 키 재시도와 내역 확인으로 남으며 영구 draft 복원은 이번 범위가 아니다. 배포 시 서버 단계 requestId migration과 Prisma 생성·서버 재시작이 필요하다.
