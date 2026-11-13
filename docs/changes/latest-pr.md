## 요약

차곡의 1일차 React Native 앱·Next.js 웹·API·WebView 브릿지 기반을 구현했습니다. iOS 시뮬레이터 검증과 사용자 화면·스크롤 확인을 완료했습니다.

## 내용

승인된 시안을 실행 가능한 앱으로 옮기고, 네이티브와 웹의 연결·왕복 측정을 확인할 기반을 마련했습니다. Expo Development Build와 npm workspaces를 사용하고, 공유 계약으로 브릿지 메시지를 검증합니다.

범위는 데모 로그인·홈과 비활성 신청 폼까지입니다. 실제 인증·DB·업로드·신청 저장은 포함하지 않으며 2일차는 시작하지 않았습니다.

## 변경

- 네이티브 로그인·홈·복지 한도와 최근 내역, Next.js 신청 화면 및 health API 추가
- WebView 메시지 검증·요청 대응·취소·측정 결과 공유 구현
- 작은 화면·큰 글자의 표시 문제와 HTML 시안의 신청 버튼 무반응 수정
- 검증·측정·학습 기록 및 간결한 PR·커밋 작성 지침 정리

## 검증

- PR 직전 타입 검사 및 테스트 **33개 통과**. 이후 변경은 문서뿐이며 구조·링크·diff를 검사했습니다.
- iOS 시뮬레이터에서 API 장애 복구·WebView 이동·잘못된 메시지 차단 확인. 기준선 왕복 **20/20 성공**, M08 콜백 **16/16 통과**.
- 작은 화면·최대 글자·다크 모드 검증 후 사용자 화면·스크롤 확인 완료. HTML 시안 신청·승인·반려도 확인 완료.
- **AC 16개 충족·2개 적용 제외·미충족 0개.** [항목별 근거](https://github.com/shimdokite/chagok/blob/feat/day-01-foundation/docs/acceptance-day-01.md) · [검증 기록](https://github.com/shimdokite/chagok/blob/feat/day-01-foundation/docs/verification/pr-final/README.md)

## 사이드이펙트 검토

- 최초 구현으로 기존 배포 기능·DB 마이그레이션 영향은 없습니다. 환경 파일과 빌드 산출물은 Git에서 제외했습니다.
- 실기기·Android·VoiceOver·웹 본문 OS 글자 확대·Release 성능은 미검증입니다. 시뮬레이터 측정값을 출시 성능으로 간주하지 않습니다.
- 롤백은 PR 변경 revert로 가능하며 저장 데이터 복구는 필요하지 않습니다.
