# 6일차 검증 기록

2026-11-27 최초 검증, 2026-11-28 최신 상태 반영(Asia/Seoul). [계획](../plans/day-06.md)에 따라 담당자 웹, 서버 권한, 검토 상태 전이, 직원 조회 갱신을 구현했다. 실제 담당자 Google 로그인·승인/반려·영수증·본인 신청 제한과 iOS 직원 자동 갱신·Safari 확인을 완료했다([실계정 결과](day-06/employee-live.md)). 기본 Turbopack 빌드는 일반 macOS 터미널에서 성공했고 Codex 실행 환경의 EPERM만 남는다([빌드 진단](day-06/turbopack.md)). 아래 최초 검증표·로그는 당시 기록이며 [후속 결과](day-06/followup/result.md)를 함께 확인한다. Android 에뮬레이터에서도 실제 직원 로그인과 화면/앱 복귀 자동 갱신을 완료했다([Android 결과](day-06/android-live.md)). 물리 Android 기기는 미검증이다. 커밋, push, PR은 수행하지 않았다.

최종 PR 기준의 통합 상태는 [전체 PR 준비 결과](day-06/pr-ready/result.md)를 따른다. 아래 표는 최초 구현 시점 기록이다.

## AC별 결과

| AC | 상태 | 확인 방법과 실제 결과 | 한계 |
| --- | --- | --- | --- |
| D6-01 권한 격리 | 충족 | 실제 PostgreSQL 및 HTTP: 익명 401, 직원 403, 타사 상세/영수증 404, 본인 결정 403, 회사 불일치와 권한 회수 후 결정 차단 | 기존 실제 계정은 승격하지 않음 |
| D6-02 검토 조회 | 충족 | 월/상태/안정 커서 DB 검사, 브라우저 목록/상세/영수증, 로컬 원본 바이트 일치. 실제 Supabase 합성 44,888바이트 업로드→읽기 일치→삭제 | 실제 직원 영수증은 사용하지 않음 |
| D6-03 상태 전이 | 충족 | 승인/반려, 사유 검증, 처리자/시간 보존, 반대 결정 충돌. HTTP 동시 요청 10쌍 모두 200 하나와 409 하나. 반려와 새 신청, 권한 회수와 결정 경합 DB 테스트 통과 | 로컬 DB 단일 서버 기준 |
| D6-04 한도/내역/캐시 | 충족(자동), 미검증(네이티브 화면) | 승인 후 한도 동일, 9,000원 반려 후 정확히 복원. 직원 상세 사유 확인. 실제 QueryClient로 화면 focus와 AppState active 콜백 재조회 및 구독 해제 검사 | iOS/Android 실제 화면 복귀는 이번에 실행하지 않음 |
| D6-05 화면/인증/오류 | 미검증 항목 있음 | 합성 DB 세션으로 Chrome 1280px/390px, 다크, 빈 목록, 영수증 대기 중 승인 차단, 빈 반려 사유 차단, 세션 만료 후 로그인 표시 확인 | 실제 Google 계정 로그인/취소와 Safari, 실제 기기 미검증 |
| D6-06 검사/측정 | 충족(대체 빌드), 기본 빌드 미충족 | 41파일 364테스트, 타입 4개 workspace, 간격 149파일 통과. webpack production 빌드 통과. HTTP 표본 20개 원본/환경/재계산 보존 | 기본 Turbopack build는 포트 생성 EPERM으로 실패. 성능 개선율 주장 없음 |
| D6-07 기록/제외 | 충족 | 계획, 진행, 검증, 측정, 초안 갱신. 학습 경로는 로컬 보존, ignore 적용, 추적/staged/origin/main...HEAD diff 모두 비어 있음 | 실제 PR 직전에 대상 전체 diff 재검사 필요 |

## 핵심 검증 8묶음

1. **환경/마이그레이션:** Node v24.22.3, npm workspace, 로컬 PostgreSQL 127.0.0.1:55432. `npm run db:generate -w @chagok/api`, `npm run db:migrate -w @chagok/api` 성공. [마이그레이션](day-06/migrate-local.log). 기존 Membership은 EMPLOYEE 기본값, 기존 결정의 감사 필드는 null.
2. **스타일/타입:** `npm run style:check`, `npm run typecheck` 성공. [간격](day-06/style-complete.log), [타입](day-06/types-complete.log).
3. **전체 테스트:** 로컬 DB URL만 `CHAGOK_TEST_DATABASE_URL`로 전달하고 테스트 프로세스에서 `SUPABASE_*`, `RECEIPT_*`를 제거한 `npm test`: 41파일 364개 통과. [전체](day-06/tests-complete.log). 마지막 ADMIN_ORIGIN 빈 값 처리 후 HTTP 6개 재검사도 통과([로그](day-06/http-final.log)). 실제 계정/사용자 영수증을 fixture로 쓰지 않았다.
4. **빌드:** `npm run build -w @chagok/web -- --webpack` 성공, `/admin`, `/api/admin` 동적 경로 생성. [최종](day-06/build-complete.log). `npm run build:web`는 기본/권한 확장 실행 모두 Turbopack 포트 생성 `Operation not permitted` 실패([로그](day-06/build-local.log)). 네이티브 의존성 변경은 없으며 네이티브 빌드 미실행.
5. **실제 HTTP/브라우저/측정:** `node --env-file=apps/web/.env.local --experimental-transform-types packages/api/scripts/verify-review.mjs`. Playwright는 기존 Codex 런타임을 `PLAYWRIGHT_MODULE_PATH`로 지정했다. [실행](day-06/browser-measure-origin.log), [원본](../metrics/raw/day-06-1795759536591.json), [환경](../metrics/environments/day-06-1795759536591.json). 실제 Google OAuth 대신 임시 DB 세션을 사용했다. 검증 종료 후 fixture 사용자/회사/신청/세션/로컬 첨부 정리, 남은 fixture 사용자 0.
6. **원격 저장소:** `node --env-file=apps/web/.env.local --experimental-transform-types packages/api/scripts/verify-review-storage.mjs`. [실제 Supabase 읽기](day-06/remote-receipt.json): 합성 PNG 원본 일치, 읽기 513.54ms 단일 표본, 테스트 객체 삭제 성공. 일반 성능 기준선으로 사용하지 않는다.
7. **리뷰:** 독립 정적 리뷰에서 영수증 로딩 중 승인 가능(P2)과 상세 실패 후 로딩 문구 지속(P3)을 발견했다. 이미지 onLoad 전 승인 차단과 상세 로딩 상태를 추가했다. 전자는 브라우저 지연 이미지로 확인했고 후자는 코드/타입 검증이며 별도 실패 UI 재현은 미실행이다. 권한 회수·신규 신청 경합, focus/AppState, 저장소 읽기 테스트를 추가했다.
8. **문서/보존:** [문서 검사](day-06/document-check.json), [초기 상태](day-06/initial-state.json). 초기 next-env와 handoff 내용은 보존한다. 기존 최신 초안은 이번 작업으로 갱신하며 이전 본문은 Git 변경 시작 시 별도 로컬 백업했다. 원본 시안, 과거 학습, 과거 검증 자료는 수정하지 않았다.

## 실패와 수정 기록

- 최초 서비스/HTTP 테스트는 구현 파일 부재, 캐시 테스트는 refresh 부재로 실패했다. 서비스 입력 오류를 동기 throw하던 부분을 async 메서드로 통일했다.
- 샌드박스 DB 연결 EPERM으로 migration 및 통합 검사가 실패했다. 승인된 로컬 실행에서 마이그레이션과 DB 테스트 성공.
- 실제 서버 환경을 그대로 전체 테스트에 전달했을 때 기존 cleanup 테스트 3개 실패. Supabase provider가 테스트의 local/missing 전제를 덮어쓴 것이 원인이며, 테스트 환경에서 원격 저장소 설정을 제외하고 364개 전체 통과. 제품 코드를 실패에 맞춰 바꾸지 않았다.
- 간격 검사에서 신규 콜백 전후 빈 줄 누락을 발견해 수정했다. 최종 위반 0건.
- 첫 측정은 Playwright 모듈 경로 부재로 실행 전 실패. 기존 설치 경로를 지정했다. 다음 실행은 오래된 개발 서버의 Prisma 인스턴스로 직원 접근이 500이었으며 서버 재시작 후 해결했다([0표본 원본](../metrics/raw/day-06-1795759400621.json)).
- 브라우저 승인 POST가 403이었다. Next가 request.url을 `0.0.0.0` 바인딩 주소로 구성한 반면 Origin은 localhost였다. Origin을 브라우저 Host와 비교하고 배포용 canonical ADMIN_ORIGIN을 지원했다. 타 출처 거부는 유지했다. [red](day-06/origin-red.log), [green](day-06/origin-green.log), [실패 원본](../metrics/raw/day-06-1795759443083.json).
- Node transform-types/module-type 실험 경고는 기록에 남겨 두었다. 실행 성공과 구분한다.

## 사용자 확인

개발 서버: [담당자 웹](http://localhost:3000/admin). Codex 브라우저에 로그인 화면을 열어 두었다. 실제 계정은 REVIEWER로 자동 변경하지 않았다. Google 콘솔에 이 웹 Origin이 등록되어 있어야 한다. 지정 담당자 계정과 회사 연결은 [README 운영 절차](../../README.md#6일차-담당자-웹)를 따른다.

| 항목 | 순서 | 상태 |
| --- | --- | --- |
| 실제 Google 웹 로그인 | 지정된 담당자 계정 로그인 → 회사명/목록 확인 → 로그아웃 → 재로그인, 취소도 확인 | 사용자 대기 |
| 승인/반려 | 테스트 신청 검토 → 영수증 확인 → 승인, 다른 신청은 사유 입력 후 반려 | 합성 브라우저 자동 확인, 사용자 대기 |
| 직원 앱 | 같은 직원 계정 홈/내역/상세에서 화면 재진입 또는 백그라운드 복귀 → 상태/한도/사유 확인 | 자동 캐시 검증, 실제 기기 대기 |
| 사용감 | 긴 사유, 작은 화면, 다크, Google 팝업/취소, 오류 후 다시 확인 | 일부 자동, 사용자 대기 |

[데스크톱](day-06/admin-desktop.png), [390px](day-06/admin-mobile.png), [다크](day-06/admin-dark.png), [만료](day-06/admin-expired.png)는 합성 데이터 캡처다.


## 담당자 지정 후속 — 2026-11-27

사용자의 직접 테스트 요청에 따라 이전에 확인한 그로브 Google 계정 한 건을 REVIEWER로 지정했다. 위의 “기존 실제 계정은 승격하지 않음”은 최초 구현 검증 당시 상태다. 현재 설정과 재실행 결과는 [담당자 준비 결과](day-06/reviewer-setup.md), 화면 순서는 [수동 확인](../manual-checks.md#6일차-담당자-직접-확인--2026-11-27)을 따른다. 실제 Google 로그인과 사용자의 승인·반려 확인은 아직 대기다.


## 실제 Google 로그인·처리 후속 — 2026-11-27

[실제 계정 검증](day-06/google-review.md)에서 Chrome Google 로그인·로그아웃·재로그인·새로고침, 연습용 승인1건/반려1건, 본인 신청 제한을 확인했다. D6-05의 Chrome 실제 로그인 대기는 해소됐다. 로그인 취소·Safari·실제 직원 네이티브 화면 확인과 앱 내 브라우저의 빈 OAuth 반환 화면은 남아 있다. 이전 표의 대기 상태는 최초 검증 당시 기록이며 최신 결과는 후속 문서를 따른다.
