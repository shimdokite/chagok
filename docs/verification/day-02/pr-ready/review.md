# 누적 코드 검토와 수정

2026-11-16 KST. 독립 리뷰어가 `origin/main` 대비 앱·API·lockfile 변경, 신규 인증/세션/UI/진단 코드·테스트·Prisma migration을 읽기 전용으로 검토했다. 로컬 학습 내용은 읽거나 인용하지 않았다.

- Critical 없음. Important 1건: 서버 로그아웃 실패 뒤 AppState active가 `restore("foreground")`를 실행해 유효 토큰으로 다시 인증되고 로그아웃 재시도 안내가 사라졌다. 실제 SessionController를 실행해 재현했다.
- 수정: `restore`와 `enterDemo`가 `retry === "signOut"` 상태를 유지하고, 로그인 화면의 데모 버튼도 비활성화한다. 서버 폐기·저장소 삭제에 성공해야 로그아웃이 완료된다.
- 회귀: [RED](logout-red.log)는 예상한 `error` 대신 `authenticated`를 받아 실패했다. [GREEN](logout-green.log)은 11개 통과. 실패→foreground→데모 시도→재시도 성공→데모 재진입을 확인했다. [전체 재검사](tests-after-review.log)는 12파일72개 통과·skip0이다.
- 재검토: 독립 실행에서도 상태 유지·재시도 성공·저장소 삭제 확인. 추가 Critical/Important/Minor 발견 없음. 프로세스 재시작까지 로그아웃 의도를 영속화하는 기능은 이번 수정 범위가 아니다.
- 확인한 영향: Google sub 기반 upsert/트랜잭션, 난수 세션 토큰·DB 해시·고정 만료, foreground 화면 보존, 늦은 응답 차단, 비활성 폼·bridge 계약 유지, 개발 진단 허용 필드·release 차단. 기존 lockfile 패키지 버전의 변경은 없었다.

실제 OAuth·native 종료는 이번 리뷰에서 재실행하지 않았으며 기존 증거와 구분했다. Android·물리 iPhone·Release·보조기술·모든 native callback/React 동시성 순서는 보증하지 않는다.
