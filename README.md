# 차곡 (Chagok)

직원이 복지 한도를 확인하고 복지비를 신청하며, 담당자가 신청을 검토하는 과정을 위한 포트폴리오 프로젝트입니다. React Native 앱과 Next.js 웹을 WebView로 연결하는 구조로 개발하고 있습니다.

## 주요 기능

현재 구현된 기능:

- iOS Google 로그인, 서버 사용자 등록·조회, 안전한 세션 저장·복원·만료·로그아웃
- 회사별 월 정책·실제 DB 복지 한도·최근 신청, 월/상태별 내역·상세·반려 사유
- 30초 메모리 조회 캐시와 로그아웃/소속 변경 시 캐시 삭제
- 로그인 없이 별도로 이용하는 고정 데이터 데모
- 앱에서 신청 웹 화면 열기·닫기
- 서버 연결 상태 확인 및 오류 재시도
- 앱과 웹 사이 메시지 검증·왕복 시간 측정

영수증 업로드·신청 저장·승인 및 반려는 개발 예정입니다. 현재 앱의 신청 폼은 비활성 상태이며, 별도의 HTML 시안에서 가상 신청 흐름을 확인할 수 있습니다.

## 데모

웹 미리보기에서 “데모로 둘러보기”로 홈·내역·복지 안내를 확인합니다. 실제 Google 로그인은 iOS Development Build에서 지원합니다. [3일차 계획](docs/plans/day-03.md), [검증 결과·남은 확인](docs/verification/day-03.md), [샘플 DB 준비](docs/manual-checks.md#3일차-직접-확인--2026-11-17)를 참고하세요.

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| 모바일 | React Native, Expo, Expo Router |
| 웹 | Next.js, React, Tailwind CSS, shadcn/ui |
| API·계약·캐시 | tRPC, Zod, TanStack Query |
| 인증·저장소 | Google Sign-In, Expo SecureStore, Prisma, PostgreSQL |
| 언어·구성 | TypeScript, npm workspaces |
| 테스트 | Vitest |

정확한 의존성 버전은 각 패키지의 `package.json`과 `package-lock.json`에서 관리합니다.

## 시작하기

### 요구 사항

- Node.js 24 (`>=24.3.0 <25`) 및 npm
- iOS 앱 실행 시 macOS, Xcode, iOS 시뮬레이터, CocoaPods

### 설치

```sh
git clone https://github.com/shimdokite/chagok.git
cd chagok
nvm use # nvm 사용 시. 그 외에는 Node.js 24를 준비합니다.
npm ci
```

처음 설치할 때 앱과 서버 환경 파일을 준비합니다.

```sh
cp apps/mobile/.env.example apps/mobile/.env.local
cp apps/web/.env.example apps/web/.env.local
```

`EXPO_PUBLIC_WEB_ORIGIN`은 앱이 접근할 Next.js 서버 주소입니다. 기본값은 iOS 시뮬레이터용 `http://127.0.0.1:3000`입니다. 환경변수를 변경하면 Metro를 재시작해야 하며, `EXPO_PUBLIC_*`에는 비밀값을 넣지 않습니다. 나머지 설정은 [.env.example](apps/mobile/.env.example)을 참고하세요.

### 웹 미리보기

두 터미널에서 각각 실행합니다.

```sh
# 터미널 1: 웹 및 API 서버
npm run dev:web

# 터미널 2: 앱의 웹 미리보기
npm run dev:preview
```

- 앱 미리보기: [localhost:8081](http://localhost:8081) — 데모 로그인 → 홈 → 신청 화면
- 신청 웹 화면: [localhost:3000/apply](http://localhost:3000/apply)

웹 미리보기는 화면 확인용입니다. 네이티브 WebView와 브릿지 측정은 iOS 앱에서 확인합니다.

### iOS 앱

웹·API 서버를 실행한 상태에서 Development Build를 빌드·설치합니다.

```sh
npm run ios -w @chagok/mobile
```

이미 앱이 설치되어 있다면 다음 명령으로 Metro에 연결합니다.

```sh
npm run dev:mobile
```

웹 미리보기와 네이티브 Metro는 기본 포트가 같으므로 하나를 종료한 뒤 다른 모드를 실행하세요. 자세한 환경 준비와 문제 해결은 [iOS 환경 설정 기록](docs/verification/ios-setup.md)을 참고하세요. Android 실행 가이드는 채울 예정입니다.

## 테스트 및 빌드

프로젝트 루트에서 실행합니다.

```sh
npm run typecheck
npm test
npm run build:web
```

기본 웹 빌드는 Turbopack을 사용합니다. Codex의 macOS 실행 환경에서 CSS 처리 중 `creating new process → binding to a port → Operation not permitted`가 발생하면, Node.js 24를 사용하는 일반 macOS 터미널에서 같은 `npm run build:web`를 실행해 비교하세요. 권한 확장 실행에서도 이 제한이 남을 수 있습니다. 2026-11-28에는 코드·설정 변경 없이 일반 터미널 빌드가 성공했습니다. 일반 터미널에서도 실패하면 환경 제한으로 단정하지 말고 해당 로그를 다시 확인합니다. [재현 및 검증 기록](docs/verification/day-06/turbopack.md).

## 프로젝트 구조

```text
apps/
  mobile/       React Native 앱
  web/          Next.js 웹 화면 및 API 진입점
packages/
  api/          tRPC 라우터
  contracts/    공유 메시지 계약 및 데모 데이터
scripts/        검증 스크립트
docs/           공개 기획·개발·검증 문서
```

## 프로젝트 문서

- [제품 범위와 개발 계획](docs/product.md)
- [코드 구조](docs/repository-map.md)
- [진행 기록](docs/progress.md)
- [검증 결과](docs/verification/day-01.md) · [수동 확인 절차](docs/manual-checks.md)
- [1일차 측정 기록](docs/metrics/daily/day-01.md) · [2일차 측정 기록](docs/metrics/daily/day-02.md)
- [기준 시안](docs/design/)

학습 파일은 로컬 전용으로 보존하고 Git·PR에 포함하지 않습니다.

## 기여 방법

변경 사항은 [PR·커밋 작성 규칙](docs/contributing.md)에 따라 작성합니다. AI 작업자는 [AGENTS.md](AGENTS.md)를 함께 참고하세요.

## 배포

채울 예정

## 라이선스

채울 예정

## 2일차 개발 상태

iOS 시뮬레이터의 실제 Google 로그인·세션 복원·만료·로그아웃과 WKWebView 재로드·닫기를 검증했습니다. 신청 화면은 Tailwind/shadcn으로 구성하며 홈의 금액·내역은 계속 데모, 입력·첨부·제출은 비활성입니다. 물리 iPhone·Android·Release 검증과 사용자 전체 UI 인수는 남아 있습니다. 누적 AC와 최신 자동 검사 결과는 [PR 준비 점검](docs/verification/day-02/pr-ready/result.md)을 따릅니다.

- [2일차 인증 설정·DB·재빌드 절차](docs/verification/day-02/auth-setup.md)
- [2일차 검증과 사용자 확인](docs/verification/day-02.md)
- [2일차 측정 상태](docs/metrics/daily/day-02.md)

`npm ci` 후 API workspace의 postinstall이 Prisma Client를 생성합니다. 별도 생성은 `npm run db:generate -w @chagok/api`입니다. 서버 전용 `DATABASE_URL`·`GOOGLE_WEB_CLIENT_ID`는 `apps/web/.env.local`에, 공개 OAuth client ID는 기존 모바일 `.env.local`에 설정합니다. 비밀값을 공개 앱 환경변수에 넣지 않습니다.

## 6일차 담당자 웹

`http://localhost:3000/admin`에서 기존 Google 웹 client ID로 로그인하고 같은 회사의 신청과 비공개 영수증을 검토합니다. Google Cloud의 해당 웹 OAuth client에 개발 Origin `http://localhost:3000`을 등록해야 합니다. 배포 시 실제 HTTPS Origin을 등록하고 프록시 Host가 다르면 서버 `ADMIN_ORIGIN=https://실제호스트`를 설정합니다(끝 슬래시 제외). 세션은 HttpOnly, SameSite=Strict 쿠키이며 production에서는 Secure를 적용합니다.

먼저 기존 `db:generate`, `db:migrate` 절차를 실행하고 웹 서버를 재시작합니다. 새 Membership은 `EMPLOYEE`이며 담당자 권한을 자동 부여하지 않습니다. 운영자가 사용자와 소속을 확인한 뒤 **명시적으로 지정한 Membership 한 행에만** `role = REVIEWER`를 설정합니다. `userId`와 `companyId` 두 조건으로 대상을 제한하고 변경 행 수가 1인지 확인합니다. 브라우저나 API 입력으로 역할을 승격하는 기능은 없습니다. 권한을 회수하려면 같은 행을 `EMPLOYEE`로 변경합니다. 다음 검토 요청부터 서버가 다시 권한을 확인합니다.

승인은 접수 때 예약한 한도를 유지하고, 반려는 입력한 사유를 직원 상세에 표시하며 한도를 복원합니다. 본인 신청은 다른 담당자가 처리합니다. 같은 결정 재시도는 기존 결과를 돌려주며 반대 결정으로 다시 바꿀 수 없습니다. 직원 화면 재진입이나 앱 활성화 시 새로 조회하며 실시간 푸시는 없습니다.

로컬 및 Supabase의 기존 저장 위치를 각각 읽습니다. 원본은 서버가 인증 후 전달하며 공개 URL은 발급하지 않습니다. production에서 로컬 파일 읽기는 지원하지 않습니다. 구버전으로 롤백할 때 역할/감사 열을 즉시 삭제하지 말고 읽기 호환성을 유지합니다.

[6일차 계획](docs/plans/day-06.md), [검증과 사용자 확인](docs/verification/day-06.md), [동시 요청 측정](docs/metrics/daily/day-06.md)을 참고하세요. [Chrome 후속 검증](docs/verification/day-06/google-review.md), [iOS와 Safari 검증](docs/verification/day-06/employee-live.md), [Android 에뮬레이터 검증](docs/verification/day-06/android-live.md)에서 실제 로그인과 승인·반려, 화면/앱 복귀 자동 갱신을 확인했습니다. 물리 Android 기기는 미검증이며, 이전 앱 내 브라우저의 빈 OAuth 반환 화면 원인은 확정하지 않았습니다.
