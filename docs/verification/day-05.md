# 5일차 — 영수증 첨부 구현과 검증

2026-11-20 KST. 기준 HEAD `760d43d`, 기존 작업 폴더에서 준비/계약에 이어 전체 연결을 구현했다. 사용자에게 확인한 저장소는 GitHub 코드 저장소뿐이므로 **개발용 로컬 비공개 파일 저장소**를 사용한다. 2026-11-23 후속 검증에서 실제 사진 선택·취소·첨부 신청과 홈/내역 반영을 확인했다. 실제 촬영과 원격 저장소는 미완료다.

## AC 결과

| AC | 상태 | 실제 확인과 남은 항목 |
| --- | --- | --- |
| D5-01 촬영/선택/권한 | 미검증 | Expo picker와 권한/취소 코드, 단위 테스트, iOS 권한 설정과 Debug 빌드 완료. 11-23 시스템 선택창 열기/취소와 PNG/JPEG 업로드 확인. 실기기 촬영·권한 분기는 미확인. |
| D5-02 실제 파일/비공개 저장/소유권 | 충족 | 로컬 범위에서 전체 디코딩, JPEG/PNG, 10MiB/24MP, APNG 거부, 소유권 DB 테스트와 HTTP/네이티브 바이트 일치. 원격 비공개 버킷은 미구축. |
| D5-03 브릿지/세션/취소 | 미검증 | 호스트·폼 자동 검사로 종료/재연결/세션 변경/만료와 늦은 응답 폐기를 확인했다. 11-23 실제 선택창→업로드→웹 첨부→신청 연결 성공. 11-23 후속에서 전송 중 닫기·재진입 및 웹뷰 reload 복구를 확인했다. 11-24 실제 세션 구독/폼 연결과 DB 만료·회사 변경 경계 검사를 보강했다. 세션 변경 전체 UI는 미확인. |
| D5-04 신청 연결/멱등성 | 충족 | 실제 DB에서 타 사용자/회사/미완료/만료/이미 연결 첨부 거부, 같은 요청 재전송, 첨부 변경 충돌, 동시 연결1건과 기존 한도 회귀 통과. |
| D5-05 실패/교체/삭제/정리 | 미검증 | 폼 상태·저장 실패·24시간 경계·삭제 재시도·정리/연결 경합 자동 검사 통과. 11-23 교체 취소 시 기존 첨부 유지, JPEG 교체, 삭제/PNG 재선택 확인. 11-23 응답 지연35초 timeout 오류·기존 첨부 유지·재시도 성공을 실제 UI로 확인했다. 11-24 서버401/403/413/500/503 주입 시 안내·기존 첨부 유지와 복구 후 재시도 성공을 실제 UI로 확인했다. 정리는 수동 CLI이며 예약 실행 없음. |
| D5-06 기존 동작/화면 | 충족 | 전체283테스트, 스타일122파일, 타입4개 workspace, Webpack 웹 빌드와 iOS Debug 빌드 성공. 브라우저 `/apply` 미리보기의 입력·첨부 안내·비활성 버튼 확인. Android/Release는 미검증. |
| D5-07 측정 근거 | 미검증 | 최종 로컬 HTTP22회와 iOS File·expo/fetch22회 성공, 각 MIME 본10회 원본/환경 기록. 11-23 후속에서 실제 picker/prepare/upload/ACK 업로드22회와 취소1회 원본을 추가했다. 실기기 촬영·원격 표본은0이며 [후속 결과](day-05/timing/result.md) 참조. |
| D5-08 기록/보존 | 충족 | 계획/진행/측정/검증/로컬 학습/최신 초안을 갱신했다. 최종 검사에서 허용 경로 외646파일 보존, 로컬 링크72개 유효, 학습 질문5개/답변15문장, 학습 tracked0/staged0을 확인했다. commit/push/PR 없음. |

## 필수 검증 7묶음

1. **단위/상태 검사:** 이미지/스트림5개 → APNG 추가 후6개, picker/전송6개, 호스트/폼22개 → 만료 회귀 추가. [이미지 RED](day-05/image-red.log), [이미지 GREEN](day-05/image-green.log), [브릿지 RED](day-05/bridge-red.log), [브릿지 GREEN](day-05/bridge-green.log), [picker RED](day-05/picker-red.log), [picker GREEN](day-05/picker-green.log). 신규 모듈 RED 일부는 모듈 부재로 suite load 실패이며 assertion 실패로 세지 않는다.
2. **DB/저장소/전체 회귀:** 추가 전용 [마이그레이션](day-05/migration.log) 적용과 [생성](day-05/generate.log). DB 첨부7개+이미지5개 최초12통과 [로그](day-05/storage-green.log). 최종 `npm test -- --maxWorkers=2`는 **30파일283통과, 실패0, skip0** [전체 로그](day-05/tests.log). 정리 테스트는 fixture ID에 한정한다.
3. **정적 검사/리뷰:** `npm run style:check`122파일 위반0 [로그](day-05/style.log), `npm run typecheck`4개 workspace exit0 [로그](day-05/typecheck.log). 별도 읽기 전용 리뷰의 중요2건과 APNG 검증 공백을 수정했다. [리뷰 RED](day-05/review-red.log), [APNG 재현](day-05/review-apng-red.log), [19개 GREEN](day-05/review-green.log). 다른 리뷰어를 추가하지 않았다.
4. **빌드:** `npm run build -w @chagok/web -- --webpack` 최종 exit0 [로그](day-05/web-build-final.log). iOS `expo run:ios --device ECA59080-35A7-42E0-BE0C-7E4C4A4BEFEA --no-bundler`는 Build Succeeded, 오류0/경고2, 앱 설치와 Metro 연결 확인 [로그](day-05/ios-build.log). 기본 Turbopack은 아래 환경 제한으로 실패했으며 기본 명령 성공으로 주장하지 않는다.
5. **화면/네이티브:** [브라우저 미리보기](http://127.0.0.1:3000/apply)를 사용자 확인용으로 열었다. 미리보기에서는 로그인 앱 전용 버튼 비활성 안내를 확인했다. Device Hub 화면 조회와 Home AX 동작은 가능했지만 앱 좌표 클릭이 `noWindowsAvailable`로 실패했다. 실제 사진 선택/촬영/권한 팝업 검증은 사용자 확인 대기다. 실제 iOS 파일/전송 계층은 [native 로그](day-05/native.log)의22/22와 바이트 비교로 확인했으며 선택창 성공을 의미하지 않는다.
6. **측정:** [일일 결과](../metrics/daily/day-05.md)와 원본/환경을 보존했다. Node HTTP와 Hermes iOS의 각 시계를 분리했고 서버 파일 바이트 대조는 측정 시간에서 제외했다. 가상 계정/생성 객체는 정리됐으며 기존 사용자 세션은 읽거나 교체하지 않았다. [정리 CLI 실행](day-05/cleanup-cli.log)도 기록했다.
7. **문서/Git:** 상대 링크, 학습 질문5개/각3문장 및 과거 답변 보존, 허용 경로 외 파일 SHA-256, `git diff --check`, 학습 tracked0/ignore, staged0을 검사했다. SHA-256 대조646파일 일치, 상대 링크72개 유효, 학습 질문5개와 답변15문장, 공백 오류0을 확인했다. 초기 `next-env.d.ts`는 웹 빌드가 자동 재작성해 시작 시점의 두 dev 경로로 돌렸고 해시로 확인한다. 기존 `handoff.md`와 나머지 학습 자료를 보존한다.

## 실패와 해결 기록

- 오프라인 Sharp 설치는 캐시 부재로 실패했다. npm 네트워크 설치 후 Sharp0.35.5, Expo ImagePicker58.0.10, FileSystem58.0.14를 사용했다. Node24.22.3/npm11.6.2 기준이다.
- DB 모델 이전 기존 개발 서버에서 첫 HTTP22회가500으로 실패했다. 원본을 보존했고 재시작 후22회 성공했다. 그 후 APNG 보완한 최종 코드에서도22회 성공했다. 재시작 해결은 확인했지만 첫 오류의 내부 원인을 응답만으로 확정하지 않는다.
- 최초 타입 검사는 테스트의 MIME 인자 누락2곳으로 실패 [로그](day-05/typecheck-initial-failed.log). 전체 테스트 최초 실행은 Node 테스트에 Expo 네이티브 import가 유입돼 suite load 실패 [로그](day-05/tests-initial-failed.log). 실제 기능 테스트를 대체하지 않고 기존 화면 테스트의 네이티브 경계만 mock 처리했다.
- 다음 전체 실행은 기존 스타일 검사 테스트가5초를 넘어1실패/279통과 [로그](day-05/tests-timeout-failed.log). 같은 항목을 유지하고 빌드와의 자원 경합을 줄이려고 워커를2개로 제한해 최종283개 통과했다.
- 웹 기본 빌드는 Turbopack PostCSS worker의 포트 바인딩 EPERM [샌드박스 로그](day-05/web-build-sandbox-failed.log), 허용 실행에서도 같은 실패 [로그](day-05/web-build-turbopack-failed.log). 지원되는 Webpack 빌드로 최종 번들을 검증했다.
- 기본 xcrun 경로에서는 simctl 부재, Xcode 경로 지정 후 샌드박스에서는 CoreSimulator 접근 제한. 허용 환경에서는 기존 부팅 기기를 확인했다. prebuild는 clean 옵션 없이도 생성 ios 디렉터리를 재생성했다 [로그](day-05/prebuild.log). 첫 run:ios는 CocoaPods CLI 경로 부재로 실패했고 기존 `.local-tools/gems/bin`과 GEM_HOME/GEM_PATH를 명시해 해결했다. 최초 pod 오류 로그 파일은 재시도 중 덮어써졌으며 대화 도구 출력의 `spawn pod ENOENT`만 근거로 남긴다.
- 네이티브 계측 첫 실행은 Expo의 src 경로를 찾다가 설치된 build 경로와 맞지 않아 표본0으로 실패 [로그](day-05/native-module-failed.log). 실제 모듈 경로와 비동기 완료 플래그를 확인한 후22/22 성공했다. 이 과정은 사용자 세션을 수정하지 않았다.
- 리뷰: 로컬 정리 CLI에 전용 로컬 DB guard 누락, 만료 첨부의 오류 메시지 종류 불일치를 재현/수정했다. APNG 테스트가 처음에는 정상으로 통과해 단일 프레임 제한 위반을 확인하고 acTL 검사로 거부했다.
- 문서 갱신 임시 Python 스크립트가 `### 4.` 소제목을 `## 4.`로 잘못 찾아 실패했다. 파일 쓰기 전에 멈춰 기존 내용은 유지됐고 줄 시작으로 찾도록 고쳤다. 테스트 작성 중 함수 앞 간격3곳을 고친 뒤 RED를 실행했다.
- npm audit는 Expo/minimatch/fingerprint의 moderate3건, Prisma/config/effect의 high3건을 보고했다. 제안된 수정은 Expo52/Prisma6로의 큰 변경이어서 이번 범위에서 강제 적용하지 않았다. 배포 전 별도 검토가 필요하다.

## 실행과 운영 한계

서버 `.env.local`에 `RECEIPT_LOCAL_DIR=/Users/doyeon/Desktop/chagok/.local-data/receipts`만 추가했다. 기존 DB/OAuth 값은 보존했다. 디렉터리0700, 파일0600, UUID 이름과 exclusive create로 저장하고 공개 GET 경로는 제공하지 않는다. production에서는 로컬 어댑터가503으로 거부한다. 현재 배포 가능한 원격 저장소 구현은 없다.

첨부는 원본 바이트를 보관하며 최대10MiB/24MP, 단일 JPEG/PNG만 지원한다. 선택적1장, HEIC/변환/OCR/압축/공개 미리보기는 없다. 파일 선택/업로드만으로 한도를 예약하지 않는다. 첨부 ID는 같은 사용자와 회사의 READY 상태만 신청 트랜잭션에서 연결할 수 있다.

정리 CLI는 다음 명령으로 최대100건씩 수동 실행한다. 실패 행은 DELETING으로 남아 재실행 가능하다. 연결된 파일은 삭제하지 않는다. 원격 DB를 지정하면 작업 전에 거부한다.

```sh
PATH="$PWD/.local-tools/node24/node_modules/.bin:$PATH" node --env-file=apps/web/.env.local --experimental-transform-types packages/api/scripts/cleanup-receipts.mjs
```

## 사용자 직접 확인

- 브라우저: `http://127.0.0.1:3000/apply`의 입력과 영수증 안내, 작은 화면에서 버튼 줄바꿈 확인. 데모에서는 사진 버튼이 비활성인 것이 정상이다.
- iOS 로그인 앱의 신청 화면에서 JPEG/PNG 선택 → 첨부 완료 → 교체 중 취소 → 기존 첨부 유지 → 삭제 → 재선택 → 신청 성공을 확인한다.
- 실기기에서 촬영 권한 거절/설정 안내, 촬영 성공, 전송 중 닫기와 재접속을 확인한다. 카메라 없는 시뮬레이터로 촬영 성공을 대신하지 않는다.
- Android/Release와 원격 저장소를 붙인 배포 검증은 이번에 실행하지 않았다.

커밋/push/PR은 생성하지 않았다. [PR 초안](../changes/latest-pr.md)과 [커밋 초안](../changes/latest-commit.txt)은 이번 구현 범위의 로컬 초안이며 실제 PR 전 전체 diff와 사용자 확인을 다시 반영해야 한다.


## 2026-11-23 재개 후속

[이번 실행 기록](day-05/followup/result.md)을 따른다. 현재 코드로 전체283테스트/스타일122파일/타입4개 workspace를 재검증했고 로컬 HTTP22/22성공과 생성 첨부22건 정리를 확인했다. 사용자 인증 후 에이전트가 사진 선택/취소, PNG·JPEG 업로드, 교체/삭제/재선택과 첨부 신청1건 및 홈/내역 반영을 직접 확인했다. [DB 근거](day-05/followup/auth-ui-db.json). 기존 D5-01/03/05/07의 미검증을 해제하지 않는다. picker/prepare/웹 ACK는 표본뿐 아니라 계측 코드도 후속 구현 대상이다. 최신 PR/커밋 초안은 이번 검증 재개 범위이며 전체5일차 PR 본문이 아니다.


## 2026-11-23 영수증 구간 계측 후속

위 재개 시점의 계측 미구현 항목을 구현했다. [이번 M1~M4 AC와 검증](day-05/timing/result.md): 모두 충족. DB 포함291테스트/스타일127파일/타입4 workspace/웹 Webpack 빌드 통과. 빌드 동시 실행 때 기존 간격 검사1건 timeout 후 단독 재실행291통과를 구분해 보존했다. 늦은 ACK와 동일 요청 재사용 회귀를 RED→GREEN으로 해결했다.

시뮬레이터에서 실제 선택 업로드22회·취소1회, ACK23건, 저장 원본 바이트22/22일치. 개발 도구 기록 화면을 확인했고 picker의 조작 대기와 ACK의 paint 제외 경계를 명시했다. 로컬 첨부22건 READY로 보존, 신규 신청0. D5-07은 실기기 촬영/원격이 남아 전체 미검증 상태를 유지한다. D5-01/03/05의 실제 카메라·실패 복구·세션 변경 UI도 별도 미검증이다. 최신 초안은 이번 계측 변경 범위이며 전체 Day5 PR 본문으로 그대로 쓰지 않는다.


## 2026-11-23 업로드 실패 복구/종료 후속

[이번 R1~R4 검증](day-05/recovery/result.md)은 모두 충족했다. 서버 응답 지연 후35.32초 오류·기존 JPEG 유지·PNG 재시도 성공, 전송 중 닫기/재진입과 웹뷰 reload 후 이전 응답 폐기·새 업로드 성공을 에이전트가 확인했다. 이번 관련45테스트/스타일127파일 통과, 서버 일시정지3회 모두 재개 및 Next/Metro HTTP200. 제품 코드는 수정하지 않았다.

새 표본7건(성공4/오류1/중단2), 생성 첨부4건 READY·원본 바이트 일치·신규 신청0, 기존 데이터 보존. 실기기 촬영·권한·실제 세션 변경·서버 오류 응답별 UI·원격·Android/Release는 남는다. 최신 초안은 이번 검증 문서 범위다.


## 2026-11-24 서버 오류와 세션 경계

[이번 상세 결과](day-05/errors/result.md): 실제 앱의 오류 응답5종·정상 재시도와6표본, 세션 구독/폼 연결 및 DB 실제 만료/소속 변경을 검증했다. 최종34파일307테스트·스타일128파일·타입4 workspace 통과. 기존 계정의 실제 만료/회사 변경 전체 UI를 자동 검사로 대체 충족 처리하지 않는다. 임시 경로는 원본 복구했고 새 합성 첨부1건 READY로 보존했다. 실기기 카메라/권한, 원격 운영, Android/Release는 미검증이다.


## 2026-11-24 추가 로컬 검증

[정리 CLI·운영 차단·Release·권한 거절 결과](day-05/local/result.md). 실제 CLI 배치100건/재시도/연결 첨부 보존, production503/no-store, iOS Simulator Release 빌드, Android production JS export, 실제 시뮬레이터 권한 팝업 거절/재시도/사진 선택 취소를 확인했다. 새3개 포함310테스트/스타일128파일/타입4 workspace 통과. 기존 DB 새 첨부0/신청0, 이전36개와 새3개 원본 보존.

D5-01의 시뮬레이터 카메라 거절 UI는 확인했지만 촬영/허용 후 설정 복귀는 미검증이다. D5-05의 실제 수동 CLI 검증은 완료했으며 운영 예약은 미구현이다. D5-06에서 Release는 시뮬레이터 빌드만 완료했고 실행은 미검증이다. Android도 JS export만 완료했다. D5-03 실제 계정 전환 전체 UI, D5-07 실기기·원격 측정은 계속 미검증이다. 시뮬레이터 카메라 권한은 거절 상태로 남았고 기존 앱/소스/사용자 데이터는 보존했다.


## 2026-11-24 후속 — iOS Simulator Release 실행

[실행 결과와 S1~S4](day-05/release/result.md)는 시뮬레이터/로컬 서버 범위에서 충족했다. 최초 서명 비활성 산출물은 Keychain -34018로 로그인 복원에 실패했고, Xcode 시뮬레이터 ad-hoc 서명 후 기존 세션 복원·홈·신청 WebView·사진 선택/취소·PNG 업로드201·카메라 거절 안내/첨부 보존·홈 복귀를 확인했다. Metro 중지 중 프로세스 재실행 후 로그인 홈과 신청 화면도 확인했다. D5-06의 iOS Simulator Release **실행 미검증은 이 결과로 해소**한다. 실기기·배포·운영 서버/저장소 검증을 포함하지 않는다.

이번 관련3파일20테스트/스타일128파일 위반0, 서명된 Release 재빌드 및 설치 해시 대조 통과. 기존 첨부30행/파일·신청10행·소속3행·세션3행 보존, 새 합성 PNG1건 READY·0600·원본 일치, 신규 신청0. 기존 개발 journal39표본 불변/새 측정 파일0. 제품 코드/설정 변경 없음. 현재 시뮬레이터 앱은 Release이며 로그인된 새 신청 화면, 카메라는 거절 상태다. 입력 포커스 확대/오른쪽 잘림은 기존 현상으로 남았다. 사용자 수동 검토 대기, commit/push/PR 없음.

## 2026-11-24 — Android 환경·Release·에뮬레이터

A1 환경/A2 빌드·설치/A4 독립 실행·회귀·보존 충족. A3 앱 연동은 미충족: 데모 홈·내역·정책·복귀는 확인했으나 신청 WebView의 FORM_INIT 연결이 실패한다. WebView14.0.1 Android의 origin-only 출처와 앱의 /apply 경로 검사 불일치를 확인했다. OAuth 미등록으로 실제 로그인·사진 선택·업로드는 미검증이다. [AC·실패·복구·산출물](day-05/android/result.md).

원본/로컬 HTTP 진단용 Release 빌드·서명·설치 SHA 일치, Metro 중지 중 로그인 화면/데모 홈 시작 확인. 관련23테스트·스타일128파일0위반, 기존 DB/31파일 동일·신청/첨부 추가0. 임시 네트워크 설정과 웹 진단 코드 복구, 제품 최종 변경 없음. 사용자 수동 검토 대기, 실기기·배포·원격 운영 검증은 남는다.


## 2026-11-25 — Android 로컬 연결·신청 브릿지 수정

명시적 local Release 네트워크 설정과 Next 개발 origin 허용을 재현 가능한 명령으로 정리했다. Android origin-only 메시지를 활성 /apply 문서와 함께 검증하고, 고정 WebView 패치로 직접 하위 프레임 송신을 차단했다. 실제 WEB_READY 뒤 동일 URL history 이벤트가 다시 초기화하던 두 번째 원인도 수정했다.

AC1~4 충족: 최종333테스트/36파일, 타입4 workspace, 스타일132파일0위반, Release 빌드/서명/설치 해시 일치. 에뮬레이터에서25초 안정성·hard reload·다른 경로 차단·정상 웹/네이티브 닫기·재진입·서버 복구 후 재시도 확인. 기존 DB4테이블/영수증31파일 동일, 임시 fixture/로그 제거, 학습 로컬 제외 유지. Android OAuth/실제 영수증·실기기·원격 운영은 미검증. 구형 WebView는 연결을 거부하는 호환성 제한이 있다. commit/push/PR 없음.

[상세 결과와 이번 검증 범위](day-05/android-fix/result.md).

## 2026-11-25 iOS 신청 화면 포커스와 재로그인

| AC | 상태 | 이번 확인 |
| --- | --- | --- |
| 입력 중 오른쪽 끝 표시 | 충족 | Device Hub iPhone 17, iOS 27.2, 기존 설치 Release에서 금액을 누르면 확대되어 ‘원’이 사라졌다. 신청 폼의 날짜·항목·금액·사용 내용에 16px를 적용하고 홈에서 재진입했다. 금액과 사용 내용을 차례로 눌렀을 때 두 입력의 양쪽 테두리, 원 단위, 사진 선택 버튼 전체가 보였다. |
| 로그아웃과 새 Google 로그인 | 충족 | 회사 홈 하단 로그아웃 → 로그인 화면 → Google로 계속하기 → 시스템 인증 창 → 기존 Google 계정 선택 → 계속 → 회사 홈의 그로브, 신청 가능 금액 64,000원 표시. 시뮬레이터는 로그인 상태다. |
| 자동 회귀와 미리보기 | 충족 | Node 24에서 npm test로 form-client.test.ts, session.test.ts, useClaimHost.test.ts 실행(3파일 30개 통과). pretest 스타일 132파일 위반 0건, npm run typecheck 4개 workspace 통과. 로컬 /apply HTTP 200 및 브라우저 입력 미리보기 확인. |

사용자 수동 확인 경로는 http://127.0.0.1:3000/apply 이며, iOS 포커스 동작은 Device Hub의 회사 홈 → 복지비 신청하기에서 확인한다. 이번 검증은 설치된 Release와 로컬 개발 서버 조합이다. 신규 신청이나 업로드, 지연 시간 측정은 수행하지 않았다.

실제 세션 만료·소속 변경 중의 전체 화면 흐름은 상태를 변경할 수 있는 테스트 계정이 필요해 미검증이다. Android 실제 계정 로그인·영수증 처리 및 구간 실측은 Android OAuth 클라이언트 등록 후 진행한다. 실기기 촬영·권한 복귀와 원격 비공개 저장소 실측은 해당 환경 준비까지 보류한다. 운영 HTTPS와 배포 서명은 별도 배포 단계다.
