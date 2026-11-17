# 3일차 검증 결과 — 2026-11-17 KST

최신 PR 준비: [누적 diff·최종 검사·독립 리뷰](day-03/pr-ready/result.md). 없는 상세의 세션 재확인 반복을 수정하고 전체156개·타입·webpack·양 플랫폼 export를 확인했다. 이번 기본 Turbopack 재실행의 포트 EPERM은 사용자 터미널의 기존 성공 근거와 구분한다. 승인된 AC 8개 충족, Android 별도 미검증. commit·push·PR은 대기다.

최신 후속: [사용자 확인 및 빌드 결과](day-03/followup/user-confirmation.md). 계정 전환 정보 격리, 최대 글자 홈·반려 상세·복지안내의 읽기/스크롤, [카테고리 여백 수정](day-03/followup/category-spacing.md) 재확인, Light/Text Size3 복원 후 홈 배치를 사용자가 확인했다. 일반 macOS 터미널의 기본 Turbopack 빌드 성공은 사용자 제공 로그로 확인했다. Android는 휴대폰·에뮬레이터 부재로 미검증 유지한다. 이번 문서 정리에서 앱 테스트·빌드를 재실행하지 않았다.

[계획](../plans/day-03.md). 회사별 정책·실제 조회 API·홈/내역/상세/안내 및 인증 범위 캐시를 구현했다. 자동 검증과 데모 화면 확인은 완료했으며, **사용자 Google 계정의 그로브 연결 후 실제 UI와 시간 초과 복구는 확인했으며, Android 실행 검증은 남아 있다.** commit·push·PR·staging은 하지 않았다.

## 작업 시작 상태

현재 main/HEAD 4be4ffb에서 앞선 코드 컨벤션 변경 39개 tracked 파일과 code-style/검사기 untracked 파일, 기존 handoff.md가 있었다. git status/diff/cached diff를 확인하고 별도 실행 기록에 baseline을 보관했다. 기존 변경을 되돌리지 않고 겹치는 파일은 함수 간격을 보존했다. 별도 worktree 없음은 기존 progress 결정에 따른다. docs/learning 및 docs/pr-draft.md는 수정하지 않았다.

## AC별 판정

| AC | 상태 | 확인 방법·실제 결과 |
| --- | --- | --- |
| D3-01 회사·정책·seed | 충족 | 로컬 migration 2개 추가 적용. 그로브 100000/식비·도서비·운동비, 웨이브 150000/도서비·교육비. seed/link 재실행 중복 없음·기존 수정 보존·다른 회사 재지정 거부를 DB 테스트 |
| D3-02 권한 | 충족 | 실제 AuthService/DB 세션의 무세션·위조·만료·폐기 거부, 동료/다른 회사 상세 NOT_FOUND, strict 입력에서 companyId 주입 거부. 실제 HTTP 무세션4개 endpoint 401/no-store |
| D3-03 계산·월 | 충족 | 100000−15000−20000=65000, 반려 제외, KST 월 경계/연말/0한도/초과 사용, 사용일에 의한 다른 달 분리·정책 없음 테스트 |
| D3-04 실제 홈·데모 | 충족 | 기존 익명 데모/HTTP 검증에 더해 후속에서 본인 Google 계정→명시적 그로브 연결→새로고침 후 실제 DB 홈65000원·최근2건·샘플 표시 확인. [후속 근거](day-03/followup/grove-result.md) |
| D3-05 내역·상세·안내 | 충족 | DB 월/상태/동일 시각 커서 페이지3건 무중복·상세 반려 사유 검증. 브라우저와 iOS 데모 필터→반려 상세→정책 이동, 브라우저 정책 없는 달 안내 확인. 후속에서 실제 계정 내역3건/반려 상세/정책도 확인 |
| D3-06 캐시·복구 | 충족 | 30초 재조회·invalidate·사용자/회사/월/필터 키·로그아웃/만료/오류/계정 전환 취소·늦은 응답·소속 해제/변경 시 초기화 테스트. 실제 HTTP 요청 수1→0→1. 후속에서 기기 요청 시간 초과→오류 안내→서버 재개→재시도 복구 확인. 다른 계정 전환 홈/내역/정책은 사용자 확인 완료. PR 준비에서 NOT_FOUND 세션 재확인 반복과 이후 UNAUTHORIZED 복구를 통합 회귀로 보강 |
| D3-07 회귀·빌드·화면 | 충족 | 기존 자동 검사·webpack·양 플랫폼 JS export와 브라우저/iOS 회귀 근거 보존. 후속 사용자 확인으로 최대 글자 상세/복지안내·카테고리 여백·Light/3 홈 확인 완료. 일반 macOS 터미널의 기본 Turbopack 빌드 성공 로그 확인. **Android 실제 실행은 휴대폰·에뮬레이터 부재로 미검증**. [후속 근거](day-03/followup/user-confirmation.md) |
| D3-08 측정 | 충족 | 실제 localhost HTTP+앱 캐시, 첫1회1002B/짧은 재조회0회/갱신1회1002B. 원본·명령·환경·측정 한계 기록 |

승인된 AC 8개 충족. D3-07은 계획의 회귀·타입·스타일·빌드·브라우저/iOS 화면 확인 기준으로 판정한다. Android 실제 실행은 필수 AC에 포함되지 않은 별도 플랫폼 미검증 항목이며, 모든 환경의 검증 완료를 뜻하지 않는다.

## 최초 구현 시 실행한 검증 — 8그룹

환경: macOS arm64, Node v24.22.3(프로젝트 .local-tools), npm workspaces, PostgreSQL 127.0.0.1:55432/chagok, Next16.4.6 개발 서버, Expo58/RN0.88.1. 비밀 환경값은 출력·기록하지 않았다.

1. **스타일·타입:** `npm run style:check` 87개 파일 위반0. `npm run typecheck` mobile/web/api/contracts exit0. [타입 로그](day-03/typecheck.log). 초기 간격3건은 원인 위치 확인 후 수정했다.
2. **전체 테스트:** Node의 `--env-file=apps/web/.env.local`로 환경을 로드하고 `CHAGOK_TEST_DATABASE_URL=DATABASE_URL`을 전달해 `npm test`. 최종17파일130개 통과/skip0. [로그](day-03/tests.log). DB 없이 실행한 중간123통과/2skip과 구분한다. 초기 신규 모듈 누락 RED, 리뷰 회귀2개 RED 후 수정했다.
3. **DB·seed:** `npm run db:generate -w @chagok/api`, `db:migrate`, `db:seed -- 2026-11` 실행. 기존 User/Session 보존, 로그인 사용자 자동 연결 없음. 통합 테스트의 임시 계정은 finally로 삭제. 최초 샌드박스 DB 접근 실패 후 허용된 실행에서 migration/test 통과. FK 변경 전 과거 신청 재귀속을 재현하고 ON UPDATE RESTRICT로 차단.
4. **빌드·의존성:** `npm run build -w @chagok/web -- --webpack` exit0 ([로그](day-03/build-webpack.log)); `npm exec -w @chagok/mobile -- expo export --platform ios --platform android --output-dir /tmp/chagok-day03/native-export-final` exit0 ([로그](day-03/export.log)). `npm run build:web`는 일반·허용 실행 모두 Turbopack CSS worker의 port bind EPERM ([실패 로그](day-03/build-turbopack-failed.log)). native 폴더에서 잘못된 PATH로 npx 실행한 시도도 실패했고 루트 npm exec로 바로잡았다. 온라인 npm audit는 기존 Expo→fingerprint→minimatch의 moderate3건; 새 TanStack 취약점 없음, 범위 밖 자동 업그레이드 안 함. offline lock 동기화의 '0'을 보안 판정으로 쓰지 않는다.
5. **브라우저:** Chrome `localhost:8082` 로그인→데모 홈(65000/15000/20000)→내역 전체/반려→demo-1 상세 사유→정책100000→10월 정책 없음→11월 복귀. 신청 iframe 열기/닫기, 별도 `localhost:3000/apply` disabled 필드·중립 샘플 문구 확인. 홈 탭을 열어 두었다.
6. **iOS:** Device Hub Chagok M09 Mini/iOS27.2/기본 글자·Light에서 데모 홈→내역 반려 필터→상세→안내→홈, 신청 WebView 실제 표시→native 닫기→65000원 복귀를 확인했다. CLI simctl은 환경·sandbox 접근 실패라 UI로 확인. Google 로그인은 OS 확인창까지 도달 후 취소했으며 로그인 성공으로 세지 않았다. 사용자 계정을 임의 연결하지 않았다. 다크·큰 글자·실기기·Android 실제 실행은 미검증.
7. **측정:** [홈 측정 원본](day-03/home-metrics.json), [해석·재현](../metrics/daily/day-03.md). 첫 HTTP500은 기존 서버가 새 Prisma 모델을 반영하지 못해 발생했고 확인된 개발 서버 재시작 후200. Node 스크립트의 MODULE_TYPELESS_PACKAGE_JSON 경고는 남아 있으며 실행 성공과 구분한다.
8. **리뷰·문서·diff:** [독립 리뷰·수정 결과](day-03/review.md). P2 두 건 재현/수정. 소스·호출부를 검토해 단순 Hook/책임 분리를 적용했다. git diff --check, 문서 링크/초안 필수 섹션, staged 비어 있음/학습 경로 미변경 확인. 배포/커밋/PR 없음.

## 사용자 확인 결과와 남은 항목

- 사용자 확인 완료: 로그아웃·다른 계정의 홈/내역/복지안내 정보 격리, 최대 글자 홈·반려 상세·복지안내의 읽기/스크롤과 카테고리 여백, Light/Text Size3 복원 후 홈. [항목별 근거](day-03/followup/user-confirmation.md).
- 사용자 실행 로그 확인 완료: 일반 macOS 터미널의 `npm run build:web` 기본 Turbopack 컴파일·TypeScript·정적 페이지4/4 생성 및 라우트 요약. 과거 에이전트 EPERM 실패 기록은 위 최초 검증 이력으로 보존하며 환경 제한 해소를 주장하지 않는다.
- Android 실제 실행은 미검증 유지: 사용자가 휴대폰·에뮬레이터가 없다고 확인했다. 환경 준비 후 로그인·홈·내역·반려 상세·복지안내·계정 전환·뒤로 가기·큰 글자 스크롤을 별도 확인한다. 현재 추가 조작 대기는 없다.
- 사용자 확인은 Device Hub iOS 시뮬레이터 범위이며 물리 iPhone·스크린리더·Release 성능 검증을 뜻하지 않는다.

## 사이드이펙트·운영 경계

- 회사/소속/정책/신청 스키마가 추가돼 배포 전 generate→migrate→서버 재시작 필요. 조회 전용이며 신청/업로드/승인 mutation은 없다.
- 회사 ID는 서버 세션에서 읽고 매 요청 소속도 다시 확인한다. 메모리 캐시만 사용하며 회사가 바뀐 응답은 병합하지 않는다. 정상 캐시는 최대30초 재방문에 재사용하므로 DB 변경의 실시간 push는 아니다.
- Claim FK는 소속 변경을 거부한다. 제품 내 소속 삭제/이동 API는 없으며 직접 DB User/Membership 삭제는 cascade로 신청도 삭제하므로 운영용 이력 보존·탈퇴 모델은 이후 설계가 필요하다.
- 사용자 계정은 자동 연결하지 않았다. local seed는 sample-grove/sample-wave와 고정 가상 사용자를 유지하고 재실행해도 기존 수정은 덮어쓰지 않는다. 다른 회사로 강제 연결하지 않는다.
- npm lock에는 TanStack Query5.107.1/query-core와 npm이 보완한 기존 optional wasm 의존 항목이 추가됐다. 기존 버전 업그레이드는 없다.
- 롤백은 앱/API 코드를 함께 되돌리고 추가 테이블은 우선 보존한다. 새 데이터를 잃는 DROP/강제 reset은 수행하지 않았다.
