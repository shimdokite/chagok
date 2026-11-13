# 차곡 — 1일차

직원이 복지 한도를 확인하고 복지비를 신청하는 포트폴리오 프로젝트입니다. **현재는 데모 로그인·홈, 실제 연결 확인 API, 비활성 신청 웹뷰, 브릿지 계측까지만 구현**했습니다. 실제 Google 인증·DB·사진·신청 저장·승인·반려는 없습니다.

## 시작하기

Node **24 LTS**와 npm을 사용합니다. 시스템 Node 25는 설치된 Expo 58의 지원 범위 밖입니다.

```sh
nvm use       # nvm을 사용하는 경우. 없다면 Node 24 LTS 준비
npm ci
npm run dev:web       # 터미널 1: http://localhost:3000/apply
npm run dev:preview   # 터미널 2: http://localhost:8081 (RN Web 미리보기)
```

이번 작업에서는 시스템 Node 25를 유지하고 `.local-tools/node24/node_modules/.bin/node` v24.22.3을 사용합니다. OS 재부팅으로 이전 `/private/tmp` 도구가 사라져 프로젝트 내부에 복구했습니다. `.local-tools/`는 Git에서 제외됩니다.

```sh
PATH=/Users/doyeon/Desktop/chagok/.local-tools/node24/node_modules/.bin:$PATH npm run dev:web
PATH=/Users/doyeon/Desktop/chagok/.local-tools/node24/node_modules/.bin:$PATH npm run dev:preview
```

- 브라우저: `/` 로그인 → 데모로 둘러보기 → `/home` → `/apply`.
- RN Web 신청 화면의 iframe은 화면 검토용입니다. 네이티브 WebView·브릿지 RTT를 검증하지 않습니다.
- 홈 하단 개발 도구: 실제 서버 확인, 재시도, 닫힌 측정 세션 공유.
- 기기 신청 화면 개발 도구: WEB_READY 확인, 준비 3회 + 본 측정 20회, 재로드, 원본 공유.

## 네이티브 Development Build

**iPhone 17 / iOS 27.2 시뮬레이터에서 Development Build 0.1.0 (1) 설치·실행을 확인했습니다.** 실제 API 성공/중단/복구, WebView 열기/닫기, 준비 3회+20회 실측과 취소·재진입 원본까지 확보했습니다. 실제 iPhone·Android는 아직 미검증입니다.

현재 Device Hub에 차곡 홈이 열려 있고 Metro(8081), Next(3000)가 실행 중입니다. 브라우저 검토 경로는 `http://localhost:3000/apply`입니다. 현재 8081은 네이티브 앱용 Metro이며 RN Web 미리보기는 별도 모드입니다.

프로젝트 루트에서 새 터미널을 열 때:

```sh
export PATH="$PWD/.local-tools/node24/node_modules/.bin:$PWD/.local-tools/gems/bin:/opt/homebrew/opt/ruby/bin:$PATH"
export GEM_HOME="$PWD/.local-tools/gems"
export GEM_PATH="$GEM_HOME"
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
npm run dev:web      # 터미널 1
npm run dev:mobile   # 터미널 2 (위 환경 설정 후)
```

최초 재빌드는 같은 환경에서 `npm run ios -w @chagok/mobile`을 사용합니다. Xcode 27의 시뮬레이터 UI는 **Device Hub**이며 앱 경로는 `/Applications/Xcode.app/Contents/Applications/DeviceHub.app`입니다. 설치·실행 명령과 오류 해결 기록은 [iOS 환경 준비](docs/verification/ios-setup.md)에 있습니다.

`apps/mobile/.env.local`에 웹 origin과 실측 기기·빌드·웹 모드·sourceRef를 설정했습니다. 다른 기기나 코드로 다시 측정할 때 `.env.example` 설명에 따라 갱신하고 Metro를 재시작합니다. 공개 값만 사용하며 Git 제외 대상입니다.

| 실행 환경 | `EXPO_PUBLIC_WEB_ORIGIN` |
| --- | --- |
| iOS 시뮬레이터 | `http://127.0.0.1:3000` |
| Android 에뮬레이터 | `http://10.0.2.2:3000` |
| 실제 기기 | `http://<같은 Wi-Fi의 Mac LAN IP>:3000` |

기기의 localhost는 Mac이 아닙니다. 환경변수 변경 후 Metro를 다시 시작하세요. 네이티브 origin과 `/apply` 경로가 정확히 일치해야 합니다. Android 실제 실행과 개발 HTTP 접근은 미검증입니다. HTTPS/인증서 검증을 전체 해제하지 않았습니다.

앱 식별자는 신규 기본값 `dev.doyeon.chagok`, scheme은 `chagok`입니다. 이 폴더 내 중복은 없지만 Apple/Google 계정의 전역 등록 여부는 미확인입니다. 원격 EAS 프로젝트·계정·유료 빌드는 만들지 않았습니다. `ios/`는 Expo가 생성한 로컬 산출물이며 Git 제외 대상입니다. 네이티브 설정의 원본은 `app.config.ts`입니다.

## 검증 명령

```sh
npm run typecheck
npm test
npm run build:web
cd apps/mobile
npx expo-doctor
npx expo export --platform ios --platform android --output-dir dist
```

전체 결과: [검증 기록](docs/verification/day-01.md), [AC 18개](docs/acceptance-day-01.md).

## 코드 지도와 이어가기

- [PR·커밋 필수 컨벤션과 자동 작성](docs/contributing.md): AI 작업 종료 시 [PR 초안](docs/changes/latest-pr.md)과 [커밋 초안](docs/changes/latest-commit.txt)을 갱신합니다. Git 초기화 후 커밋 템플릿 연결 절차도 포함합니다.

- `apps/mobile`: RN 화면·라우팅·WebView·개발 도구
- `apps/web`: Next.js `/apply`와 `/api/trpc`
- `packages/api`: public `health.check`; 앱에서는 `AppRouter`를 **type-only import**
- `packages/contracts`: Zod 메시지 계약과 불변 데모 fixture
- [진행 상태](docs/progress.md), [작업별 학습](docs/learning/day-01.md), [측정 상태](docs/metrics/daily/day-01.md)
- [직접 확인 순서](docs/manual-checks.md), [승인 명세](docs/plans/day-01.md), [기준 시안](docs/design/)

2026-11-13 사용자가 Device Hub 화면·스크롤을 최종 확인하여 1일차 인수와 PR 생성을 승인했습니다. 공개 저장소 [shimdokite/chagok](https://github.com/shimdokite/chagok)에 [1일차 PR #1](https://github.com/shimdokite/chagok/pull/1)을 열었습니다. 브랜치는 `feat/day-01-foundation`, 대상은 `main`입니다. [PR 설명 초안](docs/pr-draft.md)에 실제 요청 인용과 AC 결과를 기록했습니다. **2일차 구현은 시작하지 않았습니다.**
