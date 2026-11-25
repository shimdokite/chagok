# 5일차 후속 — 영수증 구간 계측

2026-11-23 KST. 기존 HEAD `760d43d`의 미커밋 Day5 구현 위에 추가했다. 시작 시 746파일 SHA-256과 diff를 기록해 이번 변경을 구분했다. 전체 Day5 완료나 운영 검증을 뜻하지 않는다.

## AC 결과

| AC | 상태 | 확인 방법과 실제 결과 |
| --- | --- | --- |
| M1 구간 분리 | 충족 | native 어댑터/trace 자동 검사와 실제 선택 22회. picker·prepare·upload를 앱 performance.now로 측정하고 취소1회에는 picker/ACK만 남겼다. 오류·중단은 자동 검사로 확인했다. |
| M2 ACK 경계 | 충족 | origin/connection/request/scope 검사, 중복 PICK/ACK, reset/cancel, 3초 deadline 자동 검사. 실제 uploaded22+cancelled1 모두 acked, pending0. ACK는 웹 상태 처리 확인이며 paint 완료가 아니다. |
| M3 개발 기록 | 충족 | 개발 전용 최대100개, 초과/쓰기 실패와 production 미수집 자동 검사. 기기 Documents JSON과 개발 도구에서23건/대기0/초과0/저장실패false 확인. 원본에 토큰·사용자·회사·파일 URI·신청 내용 없음. |
| M4 검증/실측/기록 | 충족 | DB 포함291테스트, 스타일127파일, 타입4 workspace, 웹 빌드 통과. JPEG/PNG 각각 준비1+본10회와 취소1회 원본 보존, Python/Node 독립 재계산 일치. 환경·실패·학습·초안 기록. |

## 필수 검증 7묶음

1. **TDD/리뷰:** [최초 RED](red.log), [호스트 RED](host-red.log), [native RED](native-red.log), [초기 GREEN](green.log). 모듈 부재 suite load와 assertion 실패를 구분한다. 별도 읽기 전용 리뷰에서 지연 timer 뒤 late ACK 허용 문제와 동일 request 재사용 위험을 발견했다. [deadline RED](deadline-red.log), [replay RED](replay-red.log) 후 elapsed>=3000 거부/ACK 대기 중 동일 PICK 무시로 수정, [최종 관련45테스트](review-green.log) 통과. 기존 브릿지의 인증/세션 검사 뒤에 ACK를 처리한다.
2. **전체/DB/스타일:** Node24.22.3, 로컬 PostgreSQL18.6. `.env.local`의 DATABASE_URL을 값 출력 없이 CHAGOK_TEST_DATABASE_URL로 전달해 `npm test -- --maxWorkers=2` 실행. [최종 단독 실행](tests-serial.log) 33파일291통과/skip0, pretest 스타일127파일 위반0. [초기289통과](tests.log)와 [빌드 동시 실행의290통과/1실패](tests-final.log)를 보존했다. 실패는 기존 간격 검사 subprocess 테스트의5초 timeout이며 빌드 종료 후 같은 검사가 통과했다. 자원 경합은 추정이며 원인을 확정하지 않는다.
3. **타입/빌드:** `npm run typecheck` [4 workspace exit0](typecheck-final.log), `npm run build -w @chagok/web -- --webpack` [exit0](build.log). 네이티브 설정·의존성 변화가 없어 새 native binary 빌드는 해당 없음. 기존 Debug 앱에서 최신 Metro JS Reload 후 계측을 확인했다. Release/Android는 미검증.
4. **실제 화면:** 에이전트가 Device Hub iPhone17/iOS27.2에서 시스템 picker를 열고 합성 PNG/JPEG22회 업로드, 취소1회 후 기존 JPEG 유지 확인. 개발 도구 → 영수증 구간 측정 기록에서 runId/23건/대기0/초과0/저장실패false와 마지막 표본 확인. [브라우저 미리보기](http://127.0.0.1:3000/apply)를 열었고 앱 전용 사진 버튼은 비활성이다. OS 공유 시트의 외부 전송은 실행하지 않았으며 앱 Documents 원본을 읽기 전용으로 복사했다.
5. **원본/통계:** [원본](../../../metrics/raw/receipt-ui-1795426328923.json), [환경/소스해시](../../../metrics/environments/receipt-ui-1795426328923.json), [통계](measurement-summary.json), [독립 재계산](recalculation.log). 업로드22건/취소1건/ACK23건. 각 MIME 첫1회만 준비 표본으로 제외하고 이상치도 보존했다. picker는 조작/도구 대기 포함, upload는 토큰 조회/HTTP/파싱 포함, ACK는 paint 제외. 일부 빌드/테스트와 겹쳐 격리 성능 벤치마크가 아니다.
6. **저장 대조:** [읽기 전용 DB/파일 확인](storage-check.json)에서22건 READY·미연결,22/22 fixture 바이트 일치, 파일0600, 해당 시간 신규 신청0. 첨부22건은 로컬에 남겼고 기존24시간 미연결 정리 대상이다. 삭제/cleanup은 실행하지 않았다. 첫 점검은 Claim에 없는 createdAt 필드를 조회해 실패했다. 스키마의 submittedAt으로 바로잡아 재실행했으며 데이터 변경은 없었다.
7. **문서/보존:** [최종 검사](document-check.log)에 시작 해시 대비 허용 변경, 상대 링크, git diff 공백, 학습 Git 제외와 staged 상태를 기록한다. 빌드가 next-env.d.ts의 dev 경로를 바꾼 부분은 시작 상태로만 복구했다. 기존 사용자 변경·과거 원본·학습 자료를 보존한다. 최신 두 초안은 이번 계측 작업 범위이며 commit/push/PR은 수행하지 않았다.

## 측정 결과

각 MIME 본10회, 단위ms. 최소/중앙/최대를 함께 보존한다.

| 파일 | picker | prepare | upload | bridge ACK |
| --- | --- | --- | --- | --- |
| PNG | 4125.86 / 5338.71 / 12043.60 | 4.02 / 6.45 / 7.67 | 63.32 / 100.40 / 1159.30 | 1.60 / 2.24 / 6.44 |
| JPEG | 4536.00 / 5652.59 / 11143.53 | 5.09 / 6.95 / 9.93 | 47.34 / 67.88 / 290.80 | 1.69 / 2.55 / 3.99 |

PNG44888B/JPEG47843B 원본 그대로 전송했다. 취소 picker4427.41ms/ACK92.90ms는 업로드 표본과 합치지 않는다. 이전 HTTP/File 전송과 경계가 달라 개선율을 계산하지 않는다.

## 영향과 남은 확인

RECEIPT_ACK는 새 strict 계약이며 기존 RESULT/ERROR의 수신 처리를 끝낸 웹이 응답한다. ACK가 없거나 늦으면 개발 기록만 timeout 처리하며 이미 완료된 첨부를 되돌리지 않는다. request/connection ID는 메모리 상관관계에만 쓰고 원본에서는 제외한다. 개발 측정 JSON 쓰기는 최대100표본으로 제한하지만 동기 파일 쓰기 비용이 있으며 이번 결과를 production 성능으로 쓰지 않는다. 앱 강제 종료 직전 미완료 trace의 영구 복구는 제공하지 않는다.

실기기 카메라/권한 거절, 실제 업로드 실패 복구와 진행 중 닫기·재연결·세션 전환 UI, Android/Release, 원격 비공개 객체 저장소/운영 예약 정리는 남아 있다. 연결 목록은 시뮬레이터뿐이며 촬영을 통과 처리하지 않았다. 입력 포커스 확대/오른쪽 잘림은 기존 관찰로 남긴다.

사용자 직접 확인: 로그인 앱 신청 → 개발 도구 → 영수증 구간 측정 기록. 브라우저는 입력 미리보기이고 시스템 picker/개발 패널은 앱 전용이다. 사용자 최종 화면 검토는 대기이며 이번 실제 조작 근거는 에이전트 검증이다.
