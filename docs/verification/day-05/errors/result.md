# 5일차 후속 — 서버 오류와 세션 경계 검증

2026-11-24 KST. 기존 미커밋 Day5 구현을 유지하고 테스트16개와 검증 기록을 추가했다. 제품 코드·설정·DB 스키마의 최종 변경은 없다. 시작785파일 SHA-256 및 staged/unstaged diff를 기록했다.

## AC 결과

| AC | 상태 | 확인 방법과 결과 |
| --- | --- | --- |
| E1 오류 안내·첨부 보존 | 충족 | iPhone17/iOS27.2 Debug 앱에서 합성 JPEG를 선택하고 HTTP401/403/413/500/503을 각각 한 번 반환했다. 로그인 만료/회사 변경/10MiB 제한/업로드 실패 안내, 기존 PNG43.8KB 유지와 선택 버튼 재활성화를 확인했다. 원래 경로 복구 후 JPEG46.7KB 성공과 오류 해제를 확인했다. |
| E2 세션 변경과 늦은 응답 | 충족 — 자동 검증 범위 | 실제 SessionController→useClaimHost 구독→ClaimHost→FormClient를 연결한3테스트. 만료/회사 변경에서 signal abort, 기존 첨부 제거, 늦은 결과 미전달. 같은 세션 재확인은 취소하지 않고 첨부 유지. 실제 DB 가상 계정의 만료401·회사 변경403·인증 완료 후 본문 소비 도중 회사 변경403도 확인했다. |
| E2 실제 계정 전체 UI | 미검증 | 오류 화면 주입과 DB/구독 검증을 분리했다. 현재 로그인 계정의 만료 시각·회사·토큰은 변경하지 않았다. 앱에 회사 전환 UI가 없으며 별도 테스트 계정의 로그인→만료/소속 변경→재로그인 전체 흐름은 아직 관찰하지 않았다. |
| E3 복구·회귀 | 충족 | 임시 API 경로를 시작 SHA-256과 동일하게 복구, 주입 설정 null 및 watchdog 종료. 최종34파일307테스트/skip0, 스타일128파일 위반0, 타입4 workspace 통과. 복구된 서버의 실제 업로드201과 새 파일 바이트 일치. |
| E4 실측·기록·보존 | 충족 | 새6표본과 환경·DB 대조·학습·최신 초안 기록. 이전30표본 동일, 대기/초과/저장 실패0. 학습 파일은 로컬 Git 제외. 실기기/원격/Android/Release는 아래 이유로 미검증. |

## 검증 5묶음

1. **자동/DB:** Node24.22.3, 로컬 PostgreSQL18.6. `node --env-file=apps/web/.env.local --input-type=module`로 DATABASE_URL을 출력 없이 CHAGOK_TEST_DATABASE_URL에 전달해 `npm test -- --maxWorkers=2` 실행. [최종 로그](tests-final.log)34파일307통과·실패0·skip0, pretest `npm run style:check`128파일 위반0. HTTP 오류/토큰6개, 웹 안내·ACK·재시도4개, 세션 구독3개, 실제 DB 경계3개를 추가했다. 본문 도중 변경 테스트는 highWaterMark0 스트림이 실제 인증 완료 뒤 소비되는지도 assertion으로 확인한다. [타입](typecheck-complete.log)은 `npm run typecheck`4 workspace exit0. 제품 코드는 최종 불변이므로 웹/네이티브 빌드는 반복하지 않았다.
2. **실제 앱/서버:** CUA로 시스템 picker와 오류 안내를 직접 관찰했다. 별도 screenshot 파일은 없고 대화의 CUA 화면 기록이 근거다. 임시 route는 development에서만 동작하고15분 만료·복구 watchdog을 두었다. 유효 JPEG 전체 본문을 받은 뒤 지정한 상태를 반환했으며 저장 서비스에 전달하지 않았다. [요청 기록](http-fault.json)은5건 전부47843B. 기존 인증 세션은 살아 있어401/403 뒤 실제 auth.session 재확인200과 benefits.home200을 관찰했다. 이는 실제 만료나 회사 변경 UI 성공으로 세지 않는다. 화면 구현 변경이 없어 추가 브라우저 열기는 해당 없음; 기존 미리보기는 http://127.0.0.1:3000/apply 이며 시스템 picker는 로그인된 앱에서 확인한다.
3. **측정/바이트:** [원본](../../../metrics/raw/receipt-ui-1795426328923-errors.json), [환경](../../../metrics/environments/receipt-ui-1795426328923-errors.json), [재계산](measurement-summary.json). 아래31~36번만 이번 실행이며1~30은 이전 스냅샷과 동일하다. [DB/파일](storage-check.json)에서 성공 재시도1건 READY/미연결·0600·원본 SHA-256 일치, 신규 신청0. 이 합성 첨부는 로컬에 보존했다. 자동 DB 테스트는 자체 가상 계정/회사/객체만 정리한다.
4. **실행 실패/환경 한계:** 첫 새 hook 테스트는 잘못된 테스트 수신기 이름 때문에3실패/28통과했다. 실제 injectionFor의 `__CHAGOK_BRIDGE__.receive`를 연결한 뒤 [31통과](targeted.log); 제품 결함의 RED로 주장하지 않는다. 첫 전체 검사 [로그](tests.log)는 sandbox의 localhost:55432 connect EPERM으로27실패/280통과. 로컬 DB 허용 실행에서 [307통과](tests-local-db.log), 인증 선행 assertion 보강 후 최종307통과다. Device Hub compact 창 좌표 입력의 noWindowsAvailable은 AX로 전체 창을 연 뒤 해결했다. 기본 xcrun은 devicectl을 못 찾았고 Xcode 경로 지정 후 sandbox CoreDevice 초기화 timeout이 있었다. 허용 실행 [기기 목록](devices.log)은 시뮬레이터4개뿐이다. adb/emulator는 PATH 및 기본 SDK 경로에서 찾지 못했다. 실기기·Android·Release·원격 저장소/운영 예약 정리는 미검증이다.
5. **최종 문서/보존:** [보존 검사](document-check.log)에 시작 파일 해시, 상대 링크, git diff --check, 학습 tracked/staged/PR diff 제외를 기록한다. 새 테스트와 문서 외 기존 파일은 보존했다. 현재 사용자 변경·이전 원본·handoff.md·next-env.d.ts를 되돌리거나 정리하지 않았다. commit/push/PR은 하지 않았다.

## 이번 앱 측정

| 표본/시나리오 | upload ms | ACK ms | 결과 |
| --- | ---: | ---: | --- |
| 31 HTTP 401 | 536.54 | 64.06 | error/acked |
| 32 HTTP 403 | 132.55 | 13.02 | error/acked |
| 33 HTTP 413 | 16.19 | 2.10 | error/acked |
| 34 HTTP 500 | 76.18 | 2.11 | error/acked |
| 35 HTTP 503 | 60.09 | 2.59 | error/acked |
| 36 restored HTTP 201 | 115.39 | 10.02 | uploaded/acked |

각 오류 종류당1회이며 처리 성능 비교나 평균으로 일반화하지 않는다. picker에는 조작 대기가, 첫401 upload에는 개발 서버 경로 컴파일이 포함될 수 있다. ACK는 웹 상태 적용이며 paint 완료가 아니다. 오류5건도 응답 전달에 성공했으므로 모두 acked다.

## 남은 작업과 사용자 확인

실제 계정의 만료·소속 변경 전체 UI는 전용 테스트 계정과 재로그인 가능한 환경에서 이어 검증한다. 실기기 카메라/권한 거절은 연결된 실제 iPhone이 필요하다. 원격 객체 저장소는 제공자/설정이 아직 없고 현재 로컬 어댑터는 production을 거부한다. Android/Release와 운영 예약 정리도 별도 환경 검증이 필요하다. 관련 환경 질문에 새 답변이 없는 상태에서 준비됐다고 가정하지 않는다.

사용자 최종 검토는 대기다. 현재 로그인 앱의 영수증은 정상 재시도의 JPEG46.7KB이며, 사진 선택·교체·취소를 직접 확인할 수 있다. 모든 오류 주입은 해제돼 있다.
