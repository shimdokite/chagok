# 2일차 인증 설정과 재실행

2026-11-16 초기에는 Google OAuth/DB 설정이 없었다. 같은 날 사용자 설정 후 두 .env.local의 필수 ID·앱/서버 일치·역순 scheme을 확인하고 signed iOS 재빌드에 성공했다. 이후 실제 Google 로그인과 DB 세션 생성, 재실행10회 홈 복원, 서버 장애 복구·로그아웃을 확인했다. 동일 사용자 재사용과 만료 안내도 확인했고, 측정 journal17개 export와 정상 복원10회 통계 검증까지 마쳤다. 최종 앱은 만료 검증 후 로그인 화면이며 다음 사용 시 다시 로그인하면 된다. 상세 결과는 [OAuth 후속 검증](oauth/execution-notes.md)을 따른다. client ID는 공개 식별자이고 client secret은 이 네이티브 ID-token 흐름에서 사용하지 않는다.

## Google 계정에서 준비할 것

1. [Google Cloud Console](https://console.cloud.google.com/)에서 차곡 개발용 프로젝트를 선택하거나 생성한다. 결제·유료 서비스 등록은 이 작업의 조건이 아니다.
2. Google Auth Platform의 앱 이름/지원 연락처·Audience를 설정한다. 개발 중 External/Testing을 사용한다면 로그인할 본인 계정을 테스트 사용자로 등록한다. 동의·약관·계정 입력은 사용자가 수행한다.
3. OAuth 클라이언트 **iOS**를 만든다. Bundle ID는 `dev.doyeon.chagok`. 발급된 client ID를 기존 `apps/mobile/.env.local`의 `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`에 추가한다.
4. 같은 프로젝트에 OAuth 클라이언트 **Web application**을 만든다. 이 앱은 웹 OAuth 리다이렉트 로그인 대신 네이티브 SDK의 ID token을 서버에서 확인하므로 이 흐름을 위해 임의 redirect URI를 만들지 않는다. 발급된 Web client ID를 모바일의 `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`와 웹의 `apps/web/.env.local`의 `GOOGLE_WEB_CLIENT_ID`에 동일하게 넣는다.
5. 기존 `EXPO_PUBLIC_WEB_ORIGIN`·측정 환경 설정·`DATABASE_URL`은 보존한다. client secret, 계정 비밀번호, ID token, 세션 토큰을 채팅·Git·측정 파일에 붙여 넣지 않는다. 설정 완료 시 파일 경로와 완료 여부만 알리면 된다.

앱 설정은 iOS client ID를 역순 URL scheme(`com.googleusercontent.apps.…`)으로 변환해 Google plugin에 전달한다. ID가 없으면 Google 버튼은 비활성이며 가짜 인증 성공으로 대체하지 않는다. Android는 package `dev.doyeon.chagok`에 맞는 Android OAuth client와 서명 SHA 설정을 추가해야 하며 현재 실제 Android 검증은 하지 않았다.

공식 근거: [Expo 설정](https://react-native-google-signin.github.io/docs/setting-up/expo), [Google SDK 구성](https://react-native-google-signin.github.io/docs/original), [서버 ID token 검증](https://developers.google.com/identity/sign-in/ios/backend-auth).

## DB와 서버

이 머신의 개발 DB: PostgreSQL18.6, `127.0.0.1:55432`, database `chagok`. 데이터·실행 파일·랜덤 비밀번호는 Git 제외 `.local-tools/postgres/`에 있고 접속 문자열은 웹 `.env.local`에만 있다. 기존 서비스/DB는 수정하지 않았다.

DB가 꺼져 있으면 루트에서 다음을 실행한다. 이 시작 스크립트는 이 머신의 로컬 도구이며 저장소에 배포되는 의존성이 아니다.

```sh
PATH="$PWD/.local-tools/node24/node_modules/.bin:$PATH" node .local-tools/postgres/start.mjs
```

다른 환경에서는 별도 개발 PostgreSQL을 준비하고 `apps/web/.env.example`을 참고해 로컬 환경 파일을 작성한다. 최초 설치 후:

```sh
npm run db:generate -w @chagok/api
node --env-file=apps/web/.env.local node_modules/prisma/build/index.js migrate deploy --config packages/api/prisma.config.ts
npm run dev:web
```

migration은 User·Session만 생성한다. 회원은 Google sub 고유키로 재사용하며 이메일·이름은 DB에 저장하지 않는다. 업무 데이터·회사 소속·권한은 후속 일차 범위다. session은 7일 고정 만료이며 DB에는 SHA-256 해시만 보관한다. 운영 배포 시 HTTPS를 사용하고 DB 접근/정리·트래픽 제한은 별도 운영 구성이 필요하다.

## 네이티브 재빌드

Google client ID를 추가/변경하면 Expo plugin의 URL scheme도 바뀌므로 Metro 재시작만으로 충분하지 않다. [iOS 환경](../ios-setup.md)의 Node24/Ruby/DEVELOPER_DIR 설정 후 앱 디렉터리에서 prebuild·pod install·Development Build 재빌드를 수행한다. 이번 prebuild의 workspace/scheme은 `ios/app.xcworkspace` / `app`이다. `npm run ios -w @chagok/mobile`로도 빌드·설치할 수 있다. SecureStore는 simulator에서도 Keychain entitlement가 필요하다. `CODE_SIGNING_ALLOWED=NO` 빌드는 -34018 오류가 났으므로 기본 simulator ad-hoc 서명(이번 실행은 `CODE_SIGN_IDENTITY=-`)을 사용한다. 실제 기기의 Apple 서명 설정은 별도다.

## 실제 계정 검증·복원 10회 절차

1. 앱에서 Google 로그인 취소 → 로그인 화면 유지. 재시도 성공 → 홈; 잔액/내역은 계속 데모라는 표시 확인.
2. 서버 DB에서 개인정보/토큰을 출력하지 않고 User/Session 개수만 확인. 로그아웃 후 같은 Google 계정 재로그인 시 User 개수 불변.
3. 정상 로그인 후 앱 프로세스를 종료하고 재실행하는 방식으로 10회 반복한다. Fast Refresh나 화면 재진입을 재실행으로 세지 않는다. 네트워크·기기·빌드·서버 모드를 고정한다.
4. 홈의 개발 도구 `세션 복원 원본 공유`로 JSON을 로컬에 보관한다. `trigger=startup`, `status=success`인지 확인하고 실패/취소도 보존한다. 저장 오류 표시는 확인 필요다.
5. 서버 중단 후 재실행 → 로그인 확인 실패·재시도. 서버 복구 후 재시도 성공. 저장 토큰을 지우지 않고 인증 화면 접근은 보류해야 한다.
6. 개발 DB의 해당 테스트 세션만 만료시킨 뒤 재실행 → 재로그인 안내; 다른 사용자/운영 세션을 변경하지 않는다. 로그아웃 뒤 이전 세션을 서버가 거부하고 재실행해도 로그인 화면인지 확인한다.
7. 원본에 소스 manifest·환경 파일을 연결해 요약을 재계산한다. 현재 계정 미설정 상태의 빈 세션 복원이나 단위 테스트 시간을 정상 인증 복원 성능으로 사용하지 않는다.
