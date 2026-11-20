# 보완 검증 도구 독립 리뷰

2026-11-20, 읽기 전용 subagent 리뷰. 기존 제품 코드를 변경하지 않는 검증 도구2개와 계획을 검토했다. Critical0, Important2. 원본에서 실제 BFCache persisted=true 두 번과 저장1건 유지 확인.

1. restore 도구에서 DOM 진단이나 browser.close 실패가 DB 정리를 막음: 진단을 best-effort로 하고 브라우저/사용자/회사/disconnect를 각각 보호했다. closed-page 실제 실패 주입 exit1에서도 completed=false, fixtureCleaned=true, cleanupErrors=[] 확인.
2. native 잠금 트랜잭션 실패가 acquired를 reject하지 않고 unhandled rejection이 됨: 즉시 catch를 연결해 acquisition 대기를 reject하고, 잠금 획득 뒤 오류도 별도 보존했다. 실제 앱에서 lock 실패 주입 후 expected exit1, restored=true, fixtureCleaned=true 확인.

실행 명령 주석, 사용하지 않는 helper, manual gate 이후 홈 캡처 경로의 혼동도 정리했다. 실패 주입은 완료/복구를 검증하기 위한 테스트 도구 옵션이며 제품 기능에 추가하지 않았다.

검토자가 판단을 보류한 native 최종 원본/수동 입력/최신 문서는 이후 실행 근거로 작업자가 확인했다. iOS 수동 입력은 사용자 회신과 홈 화면/DB13건으로 확인했다. 원래 next-env와 handoff는 의도적으로 범위 밖이며 해시 보존했다. 두 번째 독립 리뷰는 수행하지 않았고 보강 결과는 실패 주입과 전체232테스트로 확인했다.
