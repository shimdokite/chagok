# AC15 원본 시안 제출 결함 검증

2026-11-13 KST. 사용자 보고: 미첨부 영수증 안내 없음, 샘플 첨부 후 신청 무반응.
사용자가 원본 수정과 신청→승인·반려 검증을 명시적으로 요청했습니다.

## 수정 범위

`docs/design/chagok-prototype.html` 13행의 iframe sandbox에 `allow-forms`만 추가했습니다.
기존 submit 핸들러, 산식, 상태 변경, 디자인은 변경하지 않았습니다.
브라우저의 폼 제출 절차를 허용하되 기존 preventDefault와 CSP form-action none을 유지합니다.

원본 지시서의 ‘시안 미수정’ 조건은 후속 사용자 요청으로 예외 처리했습니다.
`chagok-prototype.before.html`에 수정 전 바이트를 보존했습니다.
`source-change.json`과 `source.diff`로 단 한 토큰 변경임을 확인했습니다.
변경 전 SHA256은 최초 제공 원본의 기록과 일치합니다.

## 실행 결과

환경: macOS, Chrome 157.0.8103.78, headless viewport 1280×1000.
대상: `http://127.0.0.1:3015/chagok-prototype.html` — 수정한 파일을 그대로 제공.
각 시나리오는 새 BrowserContext로 시작했습니다. 상태 주입이나 submit 이벤트 강제 발생 없이 입력·클릭했습니다.

| 검사 | 수정 전 | 수정 후 |
| --- | --- | --- |
| 영수증 누락 안내 + 한도 65,000원 유지 | 실패 | 통과 |
| 신청 65,000→45,000원, 승인 후45,000원 및 직원 내역 승인 완료 | 제출 단계 실패 | 통과 |
| 별도 초기 상태 신청→반려, 사유 필수, 한도65,000원 복원, 직원 내역·사유 반영 | 제출 단계 실패 | 통과 |

- RED: `red/results.json`, 실패 화면 3개. 모든 경우 allow-forms 부재로 제출 차단 콘솔 메시지 확인. 종료 코드1.
- GREEN: `green/results.json`, 영수증 누락·접수·승인·반려 캡처. 3/3 통과, consoleErrors/pageErrors 모두 빈 배열. 종료 코드0.
- 기존 전체 단위 테스트: `unit-tests.log`, 5파일/33개 통과, 종료 코드0.
- CUA로 열린 Chrome에서도 영수증 누락 안내 및 접수45,000원 확인. 사용자용 승인/반려 탭은 각각 초기65,000원 확인 후 열어 둠.
- 타입 검사·RN/Next 빌드·성능 측정은 이번 HTML 수정에서 재실행하지 않음. file URL, Safari, 실제 휴대폰은 이번 회귀 범위가 아님.

## 다시 실행

프로젝트 루트에서 서버를 띄우고 다른 터미널에서 검사합니다.

```sh
python3 -m http.server 3015 --bind 127.0.0.1 --directory docs/design
```

```sh
.local-tools/node24/node_modules/.bin/node scripts/verify-prototype.mjs \
  http://127.0.0.1:3015/chagok-prototype.html \
  docs/verification/prototype/rerun
PATH="$PWD/.local-tools/node24/node_modules/.bin:$PATH" npm test
```

스크립트는 현재 lockfile에 설치된 playwright-core 1.65.0과 로컬 Google Chrome을 사용합니다.
새 개발 환경에서는 optional 의존성을 포함한 npm 설치가 필요합니다. 별도 테스트 패키지를 추가하지 않았습니다.
과거 RED/GREEN 증거를 덮어쓰지 않도록 재실행 결과는 rerun 폴더에 저장합니다.

## 사용자 확인

`docs/manual-checks.md`의 승인·반려 링크와 7단계를 따릅니다.
쿼리별로 상태가 분리되며 새로고침은 상태를 초기화하지 않습니다.
실제 브라우저 회귀에 더해 2026-11-13 사용자가 “직접 테스트해봤고 신청·승인·반려 모두 정상 동작해”라고 확인했습니다. AC15/M12 완료입니다. 사용자 확인 범위는 신청·승인·반려이며 나머지 세부 검사는 위 자동 회귀 근거를 유지합니다. 실제 앱 화면의 전체 최종 승인은 별도입니다.
가상 시안의 결과를 RN 실제 신청 기능 완료로 보지 않습니다. PR은 사용자 OK 이후입니다.
