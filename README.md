# 차곡 (Chagok)

직원이 복지 한도를 확인하고 복지비를 신청하며, 담당자가 신청을 검토하는 과정을 위한 포트폴리오 프로젝트입니다. React Native 앱과 Next.js 웹을 WebView로 연결하는 구조로 개발하고 있습니다.

## 주요 기능

현재 구현된 기능:

- 데모 로그인과 고정 데이터 기반 복지 한도·최근 신청 내역 표시
- 앱에서 신청 웹 화면 열기·닫기
- 서버 연결 상태 확인 및 오류 재시도
- 앱과 웹 사이 메시지 검증·왕복 시간 측정

실제 로그인·영수증 업로드·신청 저장·승인 및 반려는 개발 예정입니다. 현재 앱의 신청 폼은 비활성 상태이며, 별도의 HTML 시안에서 가상 신청 흐름을 확인할 수 있습니다.

## 데모

채울 예정

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| 모바일 | React Native, Expo, Expo Router |
| 웹 | Next.js, React |
| API·계약 | tRPC, Zod |
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

처음 설치할 때 모바일 환경 파일을 준비합니다.

```sh
cp apps/mobile/.env.example apps/mobile/.env.local
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

## 프로젝트 구조

```text
apps/
  mobile/       React Native 앱
  web/          Next.js 웹 화면 및 API 진입점
packages/
  api/          tRPC 라우터
  contracts/    공유 메시지 계약 및 데모 데이터
scripts/        검증 스크립트
docs/           기획·개발·검증·학습 문서
```

## 프로젝트 문서

- [제품 범위와 개발 계획](docs/product.md)
- [코드 구조](docs/repository-map.md)
- [진행 기록](docs/progress.md)
- [검증 결과](docs/verification/day-01.md) · [수동 확인 절차](docs/manual-checks.md)
- [측정 기록](docs/metrics/daily/day-01.md) · [학습 기록](docs/learning/day-01.md)
- [기준 시안](docs/design/)

## 기여 방법

변경 사항은 [PR·커밋 작성 규칙](docs/contributing.md)에 따라 작성합니다. AI 작업자는 [AGENTS.md](AGENTS.md)를 함께 참고하세요.

## 배포

채울 예정

## 라이선스

채울 예정
