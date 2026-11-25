# 5일차 — 영수증 업로드 측정

2026-11-20 KST. 로컬 비공개 저장소 기준이다. **데스크톱 HTTP와 iOS 시뮬레이터의 실제 파일/전송 계층을 측정했으며 사진 선택창과 촬영은 측정하지 않았다.** 원격 저장소나 실기기 네트워크 성능으로 해석하지 않는다.

## 최종 결과

각 MIME에 준비1회+본10회를 실행했다. 아래 통계는 본10회 성공 표본만 계산한다. 준비 표본을 포함한 실행 성공률은 각 환경22/22다. 압축과 형식 변환 없이 원본을 전송하고 서버 저장 바이트를 대조했다.

| 환경 | 파일 | 원본/전송 바이트 | 본 표본 | 최소/중앙/최대 ms |
| --- | --- | ---: | ---: | --- |
| Node24 → 로컬 Next 개발 서버 | JPEG | 47,843 / 47,843 | 10 | 18.82 / 23.77 / 49.49 |
| Node24 → 로컬 Next 개발 서버 | PNG | 44,888 / 44,888 | 10 | 18.76 / 25.66 / 47.62 |
| iPhone17 iOS27.2 Simulator Debug, File + expo/fetch | JPEG | 47,843 / 47,843 | 10 | 16.88 / 21.56 / 121.35 |
| iPhone17 iOS27.2 Simulator Debug, File + expo/fetch | PNG | 44,888 / 44,888 | 10 | 15.99 / 21.76 / 26.65 |

- HTTP: [최종 원본](../raw/day-05-1795160193571.json), [환경/소스 해시/fixture 해시](../environments/day-05-1795160193571.json), [실행 로그](../../verification/day-05/measurement-final.log).
- iOS: [원본](../raw/day05-native-1795160418309.json), [환경과 소스 해시](../environments/day05-native-1795160418309.json), [실행 로그](../../verification/day-05/native.log).
- 합성 개인정보 없는1200×1600 fixture: [JPEG](../fixtures/day-05/synthetic-jpeg.jpeg), [PNG](../fixtures/day-05/synthetic-png.png). 읽기 쉬운 실제 영수증을 압축한 결과가 아니다.
- iOS 검사에는 실제 File 객체와 앱의 uploadReceipt, expo/fetch, 인증된 서버 경로를 사용했다. 테스트용 파일을 앱 임시 디렉터리에 넣어 호출했으므로 시스템 사진 선택 성공을 의미하지 않는다. 기존 사용자 세션은 변경하지 않았다.

## 경계와 한계

- HTTP는 같은 Node `performance.now()`로 fetch 직전→저장 완료 응답 JSON 파싱까지 측정했다. iOS는 같은 Hermes 시계로 uploadReceipt 진입→응답 스키마/메타데이터 확인까지 측정했다. 서로 다른 시계를 빼지 않았다.
- 서버의 수신/디코딩/DB/파일 쓰기는 포함한다. 측정 뒤 수행한 독립적인 저장 바이트 비교는 제외한다. iOS 호출 안의 테스트 token 함수는 즉시 반환하므로 실제 SecureStore 접근 비용은 대표하지 않는다.
- HTTP 측정 시 iOS 컴파일과 웹 빌드가 동시에 진행됐다. 작은 합성 fixture, loopback, 개발 모드, 표본10개 조건이다. 두 환경의 숫자를 직접 성능 우열이나 개선율로 비교하지 않는다.
- pickerMs, prepareMs, bridgeAckMs, 실제 촬영 표본은 각각0이다. 새 첨부가 연결된 신청의 화면 반영 시간도 이번에 새로 측정하지 않았다. 이전 일차 수치를 재사용하지 않는다.
- 원본과 전송 바이트 비율1.0, 파일 바이트 일치. 압축으로 작아지거나 빨라졌다는 주장은 없다.

## 실패와 재실행

| 실행 | 결과 | 증거 |
| --- | --- | --- |
| HTTP 첫 실행 | 22/22 실패, 모두500; 객체0 | [원본](../raw/day-05-1795159594831.json), [환경](../environments/day-05-1795159594831.json), [로그](../../verification/day-05/measurement-first-failed.log) |
| 개발 서버 재시작 후 | 22/22 성공, 객체22 정리 | [원본](../raw/day-05-1795159674349.json), [환경](../environments/day-05-1795159674349.json) |
| APNG 보완 후 최종 HTTP | 22/22 성공, 객체22 정리 | 위 최종 원본 |
| iOS 첫 모듈 탐색 | build/src 경로 불일치, 전송 표본0 | [원본](../raw/day05-native-1795160375284.json), [로그](../../verification/day-05/native-module-failed.log) |
| iOS 경로 수정 후 | 22/22 성공, 객체22 정리 | 위 iOS 원본 |

첫 실패를 성공으로 교체하거나 지우지 않았다. 재시작 후 해결은 확인했지만 첫500의 내부 원인을 확정하지 않는다. 실패 주입에 해당하는 권한 거절/취소/세션 변경/정리 경합은 자동 테스트로 확인했으며 실제 기기 실패 측정 표본으로 세지 않는다.

## 정리와 재실행

각 실행은 가상 사용자/회사와 임시 세션을 만들고 생성한 첨부 ID만 정리했다. iOS 앱 안의 임시 fixture2개와 가상 DB 데이터도 제거했다. 결과에 토큰, 로컬 URI, 실제 영수증이나 개인 파일명은 없다. source/environment 파일의 버전은 실행 시점이며 이후 코드와 같다고 가정하지 않는다.

```sh
PATH="$PWD/.local-tools/node24/node_modules/.bin:$PATH" node --env-file=apps/web/.env.local --experimental-transform-types packages/api/scripts/measure-receipts.mjs
PATH="$PWD/.local-tools/node24/node_modules/.bin:$PATH" node --env-file=apps/web/.env.local --experimental-transform-types packages/api/scripts/verify-receipt-native.mjs
```

두 명령 모두 전용 로컬 chagok DB와 개발 서버3000이 필요하다. 네이티브 명령은 iPhone17의 실행 중인 Debug 앱, Metro8081과 해당 시뮬레이터 데이터 디렉터리 접근이 필요하다. 원격 환경에서는 실행하지 않는다.

## 준비 단계와 남은 측정

처음 준비 및 Task1 시점에는 구현/표본이 없었다. [준비 검증](../../verification/day-05-preparation.md), [계약 검증](../../verification/day-05-contract.md)은 당시 결과로 보존했다. 최신 AC는 [전체 구현 검증](../../verification/day-05.md)을 따른다.

남은 측정은 실제 사진 선택/촬영과 권한 거절, picker 반환→전송 준비 시간, 동일 앱 시계의 완료 송신→웹 ACK 수신, 실제 네트워크·원격 저장소, Android/Release다. 실행 전 기기/빌드/fixture/네트워크를 고정하고 실패와 취소를 별도 표본으로 기록한다.


## 2026-11-23 재개 후 HTTP 재측정

서버/DB를 재시작하고 현재 미커밋 코드로 로컬 HTTP를 다시 측정했다. Node24.22.3, Next 개발 Turbopack, loopback과 기존 합성1200×1600 fixture 조건이다. 준비1회+본10회씩 JPEG/PNG 총22/22성공, 저장 바이트 일치, 생성 첨부22건 정리/실패0을 확인했다.

| 파일 | 본 표본 | 최소/중앙/최대 ms |
| --- | ---: | --- |
| JPEG | 10 | 13.73 / 16.40 / 18.33 |
| PNG | 10 | 12.33 / 13.60 / 32.28 |

[원본](../raw/day-05-1795418954266.json), [환경](../environments/day-05-1795418954266.json), [독립 재계산과 현재 소스 해시](../../verification/day-05/followup/measurement-summary.json), [실행 로그](../../verification/day-05/followup/http-measurement.log). 과거 수치를 대체하지 않으며 실행 조건이 달라 성능 개선율을 주장하지 않는다. iOS 전송 측정은 이번에 재실행하지 않았다.

사진 선택/촬영, prepare, 웹 ACK, 첨부 신청 화면 반영 표본은 여전히0이다. 코드 재확인 결과 pickerMs/prepareMs와 RECEIPT_ACK 계측 자체도 아직 없어 후속 구현이 필요하다. [이번 검증과 사용자 조작 대기](../../verification/day-05/followup/result.md).


## 2026-11-23 실제 picker와 구간 계측

기존 표본0 기록 이후 계측 코드를 구현했다. iPhone17/iOS27.2 Simulator의 로그인 앱에서 합성 사진을 직접 선택해 업로드22회(각 MIME 준비1+본10), 취소1회를 수집했다. 전부 ACK 수신, 대기/초과/저장실패0이다. 앱 performance.now 하나로 구간을 측정하며 ACK는 웹 상태 처리 확인이고 paint 완료가 아니다.

| 파일/본 표본 | picker 중앙 ms | prepare 중앙 ms | upload 중앙 ms | ACK 중앙 ms |
| --- | ---: | ---: | ---: | ---: |
| PNG/10 | 5338.71 | 6.45 | 100.40 | 2.24 |
| JPEG/10 | 5652.59 | 6.95 | 67.88 | 2.55 |

[원본](../raw/receipt-ui-1795426328923.json), [환경](../environments/receipt-ui-1795426328923.json), [최소/중앙/최대와 취소 원본](../../verification/day-05/timing/measurement-summary.json), [독립 재계산](../../verification/day-05/timing/recalculation.log), [저장 대조](../../verification/day-05/timing/storage-check.json), [검증과 한계](../../verification/day-05/timing/result.md).

picker에는 에이전트/도구 조작 대기가 포함된다. 일부 표본은 빌드/테스트와 겹쳤고 PNG upload 최대1159.30ms도 제외하지 않았다. 개발/loopback 관찰값이며 과거 전송 실험과 경계가 달라 개선율을 주장하지 않는다. PNG44888B/JPEG47843B, 저장22/22원본 일치·0600·READY, 신규 신청0이다. 이번 생성 첨부22건은 삭제하지 않았으며24시간 지난 미연결 정리 대상이다. 실기기 촬영·실패 복구 UI·원격·Android/Release 표본은 여전히 없다.


## 2026-11-23 실패·중단 복구 표본

같은 앱 journal의24~30번 표본을 추가 수집했다. [30표본 전체 snapshot](../raw/receipt-ui-1795426328923-recovery.json), [환경](../environments/receipt-ui-1795426328923-recovery.json), [이번7표본 분리](../../verification/day-05/recovery/measurement-summary.json), [검증](../../verification/day-05/recovery/result.md). 기존1~23번 원본과 동일한 prefix를 확인했고 이전 파일은 보존했다.

서버 응답 지연으로 upload35319.87ms 후 error/ACK를 기록했다. 닫기/reload 각1회는 interrupted/aborted이며 미완료 uploadMs/ACK를0으로 채우지 않았다. 기준 JPEG·timeout 재시도 PNG·닫기 뒤 JPEG·reload 뒤 PNG는 모두 uploaded/acked, upload71.91/93.28/34.29/67.76ms다. 성능 비교용 반복 실험이 아니라 장애 복구 기능 검증이며 각 시나리오1회다. pending/dropped/saveFailed0, 저장4/4바이트 일치·READY·0600·신규 신청0. 첨부4건 로컬 보존, 삭제 없음.


## 2026-11-24 오류 응답과 복구 실측

[이번 결과](../../verification/day-05/errors/result.md)·[원본](../raw/receipt-ui-1795426328923-errors.json)·[환경](../environments/receipt-ui-1795426328923-errors.json). 기존 실행의31~36번6건만 새 표본이며 이전30건은 동일하다. 합성 JPEG47843B로401/403/413/500/503 오류5건, 복구201 성공1건 모두ACK. 대기/초과/저장 실패0. 오류 상태는 임시 로컬 경로로 주입했으며 실제 DB 만료/소속 변경 검증과 구분한다.

| 표본/시나리오 | upload ms | ACK ms | 결과 |
| --- | ---: | ---: | --- |
| 31 HTTP 401 | 536.54 | 64.06 | error/acked |
| 32 HTTP 403 | 132.55 | 13.02 | error/acked |
| 33 HTTP 413 | 16.19 | 2.10 | error/acked |
| 34 HTTP 500 | 76.18 | 2.11 | error/acked |
| 35 HTTP 503 | 60.09 | 2.59 | error/acked |
| 36 restored HTTP 201 | 115.39 | 10.02 | uploaded/acked |

각1회 관찰이며 성능 비교/평균은 산출하지 않는다. 저장 대조는 성공1건만 READY·0600·fixture바이트 일치, 신청0. 현재 사용자의 로그인 정보는 보존했다. 실기기/Android/Release/원격 측정은 없다.


## 2026-11-24 추가 — 카메라 권한 거절과 로컬 정리

[원본](../raw/receipt-ui-1795426328923-permission.json)39개 중 기존36개가 이전 스냅샷과 같고 새 표본은37~39다. [환경과 한계](../environments/receipt-ui-1795426328923-permission.json). 실제 iPhone17/iOS27.2 시뮬레이터 Debug 앱에서 OS 권한 팝업을 거절하고 재시도한 뒤 사진 선택창을 열고 취소했다. 기존 JPEG46.7KB는 보존됐고 업로드 구간은 실행되지 않았다.

| 표본 | 시나리오 | picker ms | ACK ms | 결과 |
| --- | --- | ---: | ---: | --- |
|37|카메라 최초 권한 거절|13069.28|48.80|error/acked|
|38|거절 후 카메라 재시도|5.28|2.54|error/acked|
|39|사진 선택창 열기 후 취소|14127.01|369.32|cancelled/acked|

대기0/초과0/저장 실패false. picker에는 에이전트 조작 대기가 포함된다. Release 컴파일 및 Android export와 겹친 실행이므로 기존 성능과 비교하지 않는다. ACK는 웹 상태 적용이며 paint가 아니다. 원본 SHA-256은 `e28001cfe7db54b36ca01d25e1a3e7bd575331fcf7664936c39e4baa9f8c3c2d`. 실제 촬영/허용 후 설정 복귀 표본은0이다. 시뮬레이터 카메라 권한은 거절 상태로 남았다.

별도 PostgreSQL18.6/55433에서 정리 CLI108행 중105개 대상 검증:1회99삭제/1실패(1140.95ms),2회6삭제/0실패(1370.11ms),3회0삭제/0실패(1510.60ms). 각1회이며 Node 시작·DB 연결을 포함한 프로세스 경과시간으로, 업로드 성능 지표가 아니다. [원본 및 검증](../../verification/day-05/local/cleanup-result.json). 기존 DB/저장소는 정리하지 않았고 임시 클러스터와 합성 파일만 제거했다.


## 2026-11-24 — iOS Simulator Release 실행 관찰

[실행 검증](../../verification/day-05/release/result.md). Xcode ad-hoc 서명 Release, iPhone17/iOS27.2, 로컬 Next 개발 서버/저장소. 합성 PNG44888B 업로드1회가201/READY/0600/원본 바이트 일치했다. [서버 로그](../../verification/day-05/release/server-flow.log)의103ms는 Next 요청 처리 시간1회이며 picker·prepare·네트워크 왕복·ACK·paint의 종합 시간이 아니다.

Release에서 DEV journal을 켜지 않았다. 기존39표본 파일은 해시 동일, 새 파일0개였으므로 이번 picker/prepare/upload/ACK 표본 수는0이다. 미측정 값을0ms로 채우거나 Debug 통계와 비교하지 않는다. [보존 근거](../../verification/day-05/release/preservation.json).

[Metro 중지 원본](../../verification/day-05/release/metro-independent.json)의 실행 명령 반환은943.67ms, 중지는51.32초였다. CUA로 홈과 신청 화면이 나타남을 확인했지만 관찰 사이에 에이전트 대기가 있으므로 시작/첫 화면 렌더 성능 수치로 사용하지 않는다. 이번 결과는 내장 번들 실행과 기능 확인이며 Release 성능 벤치마크는 아니다.

## 2026-11-24 — Android Release 관찰

[검증 결과](../../verification/day-05/android/result.md). Pixel7/API36 ARM64, WebView133.0.6943.137, R8 Release/개발 서명, 로컬 Next 개발 서버. 원본 APK32,775,569B, 임시 HTTP 허용 APK32,776,013B이며 JS번들3,207,260B/SHA는 동일하다. 빌드13m57s와3m51s는 캐시/병렬도/환경 준비 조건이 달라 성능 비교에 사용하지 않는다.

[Metro 중지 실행](../../verification/day-05/android/metro.json)의 ActivityManager TotalTime293ms/WaitTime294ms는 단1회 명령 반환 기준이며 첫 화면 렌더/사용 가능 시간이나 통계가 아니다. ANR 초기14건은 시스템/GMS, 재부팅 후0건. WebView 브릿지 연결 실패로 Android picker/prepare/upload/ACK 표본0건, 미측정을0ms로 대체하지 않는다.


## 2026-11-25 — Android 로컬 연결·신청 브릿지 수정

명시적 local Release 네트워크 설정과 Next 개발 origin 허용을 재현 가능한 명령으로 정리했다. Android origin-only 메시지를 활성 /apply 문서와 함께 검증하고, 고정 WebView 패치로 직접 하위 프레임 송신을 차단했다. 실제 WEB_READY 뒤 동일 URL history 이벤트가 다시 초기화하던 두 번째 원인도 수정했다.

AC1~4 충족: 최종333테스트/36파일, 타입4 workspace, 스타일132파일0위반, Release 빌드/서명/설치 해시 일치. 에뮬레이터에서25초 안정성·hard reload·다른 경로 차단·정상 웹/네이티브 닫기·재진입·서버 복구 후 재시도 확인. 기존 DB4테이블/영수증31파일 동일, 임시 fixture/로그 제거, 학습 로컬 제외 유지. Android OAuth/실제 영수증·실기기·원격 운영은 미검증. 구형 WebView는 연결을 거부하는 호환성 제한이 있다. commit/push/PR 없음.

[실행 증거](../../verification/day-05/android-fix/result.md). 이번에는 영수증 성능 표본을 추가하지 않았다. 빌드/Activity 시간과25초 안정성 대기는 업로드 지연 측정이 아니다.

## 2026-11-25 Android Debug 영수증 실측

Pixel 7 API 36 에뮬레이터에서 실제 Google 로그인 후 시스템 사진 선택창을 ADB로 조작했다. PNG 44,888바이트와 JPEG 47,843바이트를 번갈아 업로드했다. 형식별 준비 표본 1회씩을 제외한 10회씩의 중앙값이다. [앱 측정 원본](../raw/android-receipt-ui-1795589615522.json) · [환경과 APK 해시](../environments/android-receipt-ui-1795589615522.json)

| 형식 | 본 측정 | 사진 선택 (ms) | 파일 준비 (ms) | 업로드 (ms) | 웹 상태 반영 ACK (ms) |
| --- | ---: | ---: | ---: | ---: | ---: |
| PNG | 10 | 2244.05 | 0.72 | 169.18 | 28.97 |
| JPEG | 10 | 2387.51 | 0.81 | 245.54 | 17.89 |

선택 시간에는 도구의 화면 조회·탭 대기가 포함된다. 업로드는 토큰 조회부터 서버 응답 파싱까지, ACK는 웹 상태 반영 응답까지다. 개발용 로컬 서버에 ADB 포트 연결로 접근했다. 총 23개 표본 중 업로드 22개, 선택 취소 1개였고 전부 ACK를 받았다. 미완료·누락은 0건이었다. 취소 후 최종 JPEG를 유지해 신청 한 건을 제출했다.

## 2026-11-25 Supabase 비공개 버킷 서버 처리 시간

Node 24.22.3에서 차곡 업로드 라우트를 호출해 로컬 PostgreSQL과 실제 Supabase Storage를 거쳐 응답 JSON을 읽을 때까지 측정했다. 형식별 준비 1회를 제외했다. 후속 다운로드로 22개 모두 원본과 일치함을 확인했다. [원시 표본](../raw/supabase-receipts-8d097dfa-cf69-4278-a901-24f550d2c0c6.json)

| 형식 | 바이트 | 본 표본 | 최소 (ms) | 중앙값 (ms) | 최대 (ms) |
| --- | ---: | ---: | ---: | ---: | ---: |
| JPEG | 47,843 | 10 | 237.80 | 281.87 | 635.39 |
| PNG | 44,888 | 10 | 269.20 | 342.94 | 1,023.98 |

준비 표본을 포함해 HTTP 201 응답은 22/22였다. 사진 선택, 기기에서 서버까지의 전송, 업로드 후 원본 대조는 측정 구간 밖이다.
