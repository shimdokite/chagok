# 2일차 실행 장부

- 초기 HEAD main/86a95a2, 기존 수정 보존. 기존 계획의 현재 폴더 작업 지침 우선; 별도 worktree/커밋 없음.
- Node24.22.3 기준 기존 33테스트 통과.
- 인증 모듈 부재 RED → 서비스 5테스트 및 기존 테스트 통과. 세션 모듈 부재 RED → 8테스트 중 중복 요청 테스트가 공유 Promise 완료 전에 await하여 timeout; 테스트 순서를 수정 후 46/46 통과. timeout 확대 없음.
- 최초 typecheck: Expo typed segments 길이 비교 오류. pathname 비교로 통과. 이후 네비게이터 수명 안정성을 위해 설치된 Stack.Protected API로 단순화 완료.
- 전역 Xcode 선택은 유지. 명령별 DEVELOPER_DIR 지정으로 시뮬레이터 확인. native 소스 추가 전 설치 앱은 ExpoSecureStore 모듈 부재 오류(예상 재빌드 필요) 확인.
- prebuild 첫 시도는 작업 경로 기준 PATH 탓에 npx 미발견(exit127), 절대 경로로 재실행 성공. Pods 설치 진행.
- 사용자는 OAuth/DB 준비 없음이라고 답함. DB를 프로젝트 .local-tools에 PostgreSQL18.6 localhost:55432로 구성, 비밀번호/URL은 ignored 파일에만 저장. Google 설정은 사용자 계정 작업 대기.
- Prisma migrate diff가 exit0이나 빈 파일을 생성함. migrate deploy도 빈 migration을 적용했다고 보고; 실제 DB 통합 테스트로 User 테이블 부재 발견. 이후 아래 명시 config로 수정·재검증. CLI 성공을 DB 검증 성공으로 처리하지 않음.
- DB 수정: `migrate diff`에 `--config packages/api/prisma.config.ts`를 명시하자 실제 CREATE TABLE SQL 출력. 새 전용 DB의 checksum=빈파일 적용 기록 1개만 제거하고 다시 deploy. 실제 동시 로그인5개/사용자1개, 세션 폐기·만료 통합 테스트 포함 53/53 통과.
- 네이티브 빌드 첫 시도: 이전 이름 chagok.xcworkspace가 없어 실패. prebuild 생성 목록의 app.xcworkspace/app으로 다시 실행.
- 검증 중 추가된 Google SDK mock은 overloaded callback 반환형 때문에 타입 실패; mockImplementation으로 수정 후 typecheck 통과.
- 독립 리뷰: Critical0/Important1/Minor1. 정상 foreground에서 busy가 guard를 false로 바꾸어 apply 경로를 제거하는 결함, 실제 tRPC timeout cause 분류 누락 발견. 후자는 측정 정확성 AC에 해당하므로 Important로 올려 함께 수정. 재현 2실패 → 기존 세션을 busy overlay 뒤 유지 + 오류 cause 3단계 판별로 수정.
- 리뷰 판정 보류(동의): 실제 Google, 새 네이티브 빌드·WebView, 실제 복원10회, 디자인 회귀는 별도 실행 결과로 확인하며 자동 테스트로 대체하지 않는다.

- 새 앱 native build: app.xcworkspace/app Debug simulator **BUILD SUCCEEDED**. 기존 바이너리의 ExpoSecureStore/RNGoogleSignin 미탑재 오류는 신규 설치가 필요한 상태였음.
- 웹 미리보기8082에서 health 실패 재현. 개발용8081만 있던 CORS에 로컬8082 추가; RED 2실패/4통과 → GREEN 6통과. production 차단도 확인.

- unsigned 시뮬레이터 앱은 SecureStore 읽기 실패. securityd에서 OSStatus -34018(앱 식별/Keychain entitlement 없음) 확인. CODE_SIGNING_ALLOWED=NO를 제거하고 시뮬레이터 ad-hoc 서명 CODE_SIGN_IDENTITY=-로 재빌드한다. 앱 인증 오류 처리 변경으로 숨기지 않음.
