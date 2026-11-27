## 요약

같은 회사 담당자가 `/admin`에서 신청과 비공개 영수증을 조회하고 승인·반려할 수 있다. 결정 감사 기록과 중복·동시 요청 일관성을 보장하고, 직원 앱은 화면 재진입과 앱 복귀 때 상태·잔액·반려 사유를 갱신한다.

## 내용

6일차의 담당자 검토 흐름을 기존 Google 인증·Next.js·Prisma 위에 구현했다. 사용자 피드백 “본인 신청은 따로 내역이 없는 것 같은데”를 기준으로 목록 조회와 자기 신청 처리 제한을 구분해 확인했다. “안드로이드는 기기가 없어.”라는 환경 제약에 따라 Android 에뮬레이터로 검증하고 사용자 직접 확인까지 완료했다.

## 변경

- Membership 역할, 처리자·처리 시각, 회사별 조회 인덱스와 마이그레이션을 추가했다. 매 요청 현재 권한을 확인하고 타사 접근·자기 신청 결정을 차단한다.
- 승인/반려에 정렬된 행 잠금과 조건부 상태 전이를 적용한다. 동일 결정 재시도는 감사 기록을 유지하고 반대 결정은 충돌 처리한다. 승인은 예약 한도를 유지하고 반려는 복원한다.
- HttpOnly 쿠키·Origin 검사, 월/상태/페이지 조회, 인증된 영수증 프록시, 영수증 로딩 중 승인 차단과 오류 처리를 구현했다.
- 직원 focus/AppState 캐시 갱신과 회귀 테스트를 추가했다. 운영 안내, 측정 원본, 실제 계정·플랫폼 검증 및 빌드 진단을 기록했다. Android 증거 폴더만 Git 제외 예외로 추가했다.

## 검증

- **D6-01~03 충족:** 이번 전체 DB/HTTP 포함41파일364테스트 통과. 현재 권한, 자기 신청 차단, 상태 전이·감사·경합과 비공개 영수증을 검사했다. `npm test -- --maxWorkers=2`의 pretest 스타일149파일 위반0, `npm run typecheck` 4workspace 통과.
- **D6-04~05 충족(시험 범위):** 이전 실제 Google 로그인·Chrome 취소/재시도·Safari 검토와 iOS/Android 화면·앱 복귀 자동 갱신, 승인/반려/영수증/본인 신청 제한의 사용자 확인 완료. 물리 Android 기기는 미검증이다.
- **D6-06 충족(환경 범위):** 이전 동일 소스의 기본 Turbopack 빌드는 일반 macOS 터미널에서 성공, Codex 내부 실행은 EPERM 제한이 남는다. 이번127파일 해시 일치를 확인해 빌드는 반복하지 않았다. HTTP 동시10쌍은 모두200+409,20표본 중앙값12.60ms/p95 26.13ms이며 로컬 개발 요청 측정으로 한정한다.
- **D6-07 충족:** 독립 리뷰 신규 지적 없음. 전체 변경·증거 링크·초안과 코드/문서 공백을 검사했다(원본 `.log`의 공백 경고는 보존). 학습 경로를 staged/전체 PR diff에서 제외한다. 기존 사용자 next-env/handoff와 로컬 학습37파일을 보존한다.
- [전체 AC와 이번 실행 증거](https://github.com/shimdokite/chagok/blob/feat/day-06-review/docs/verification/day-06/pr-ready/result.md), [실제 Android 결과](https://github.com/shimdokite/chagok/blob/feat/day-06-review/docs/verification/day-06/android-live.md), [측정 범위](https://github.com/shimdokite/chagok/blob/feat/day-06-review/docs/metrics/daily/day-06.md). 앱 렌더 지연은 미측정이며 이전 내장 브라우저 빈 OAuth 반환 화면 원인은 미확정이다.

## 사이드이펙트 검토

마이그레이션·Prisma Client 생성·서버 재시작이 필요하며 기존 직원은 EMPLOYEE 기본값을 유지한다. 담당자 지정과 Google 웹 Origin/프록시 `ADMIN_ORIGIN` 설정은 운영 절차를 따른다. production 로컬 영수증 읽기는 금지하고 기존 Supabase 비공개 저장소를 사용한다. 롤백 시 추가 역할·감사 열을 즉시 삭제하지 않는다. 실시간 푸시·실제 송금·새 의존성은 없으며 로컬 테스트용 계정 지정과 합성 신청은 DB에만 남는다. 학습 자료·개인 환경 파일은 포함하지 않는다.
