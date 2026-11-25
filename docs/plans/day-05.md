# 5일차 — 사진과 영수증 첨부 준비 계획

> 실행자는 구현 재개 시 `superpowers:executing-plans`를 적용한다. 준비 후 잔여 한도17%를 확인하고 사용자가 Task 1 실행을 승인했다. 전체 연결 승인을 받아 Task 2~4 구현과 자동/로컬/네이티브 전송 검증을 마쳤다. 11-23 사진 선택/취소·업로드·교체/삭제·첨부 신청 UI를 확인했다. 실제 촬영, 원격 저장소와 일부 측정은 미검증이다. 최신 상태는 docs/verification/day-05.md를 따른다.

**Goal:** 로그인한 직원이 영수증을 촬영하거나 선택해 비공개 저장소에 업로드하고 신청에 연결한다.
**Architecture:** 웹은 첨부 의도를 전달하고 앱은 권한, 파일, 인증 요청을 맡는다. 서버가 파일과 소유권을 검증하고 기존 신청 트랜잭션에서 첨부 연결을 확정한다. 최종 방식은 개발용 로컬 비공개 저장소다. 아래 초기 비교안은 준비 시점의 기록이다.
**Tech Stack:** 기존 Expo 58, React Native, Next.js, tRPC, Zod, Prisma/PostgreSQL. Expo ImagePicker/FileSystem, Sharp를 설치했다. 원격 저장소 SDK는 없다.
**Spec:** [원본 일정](day-01.md), [제품 범위](../product.md), [4일차 연결 설계](day-04.md). 이 문서의 새 정책은 구현자의 제안이며 사용자 확정 사항과 구분한다.

## 준비 시점 상태와 작업 경계

- 확인일: 2026-11-20 KST. 시작 HEAD `760d43d`. 과거 진행 문서의 `0a66a38`은 당시 기준이다.
- `ApplyForm.tsx`의 영수증 입력은 비활성이다. `ClaimHost`는 FORM_LOAD와 CLAIM_SUBMIT을 처리하며 인증 토큰을 웹에 주입하지 않는다.
- `Claim`에는 첨부 필드가 없다. `createClaim`은 소속 행 잠금, 사용자별 요청 키, 같은 내용 재전송을 처리한다. 첨부도 재전송 내용 비교 대상에 포함해야 한다.
- 모바일 package.json에는 사진 선택 패키지가 없다. 저장소 서비스와 자격 증명의 실제 준비 여부는 이번에 조사하지 않았다. 비밀값은 문서나 로그에 출력하지 않는다.
- 기존 수정 `apps/web/next-env.d.ts`와 미추적 `handoff.md`, 기존 학습 자료를 보존한다. 준비 단계에서는 문서만 변경한다.

## 공통 제약

- Node 요구사항은 `>=24.3.0 <25`. 코드 스타일과 하위 AGENTS를 적용하며 구현 시 설치된 Next.js 가이드를 읽는다.
- 파일 선택, 업로드, 취소만으로 한도를 차감하지 않는다. 신청 접수 때 한 번만 예약하는 기존 동작을 유지한다.
- 기존 영수증 없는 신청과 데모 미리보기를 유지한다. 사용자/회사 식별자는 인증과 서버 소속에서 결정한다.
- 새 커밋, push, PR, 저장소 계정 생성은 이번 준비 범위에 없다. 학습 파일은 로컬 전용이다.
- OCR, 여러 장 첨부, 담당자 승인 기능, 영구 초안 복구는 5일차 기본 범위에서 제외하는 제안이다.

## 준비 시점 접근 방식과 제안

| 안 | 이점 | 비용과 제약 |
| --- | --- | --- |
| 인증 서버를 거쳐 비공개 객체 저장소에 저장 — 권장 제안 | 바이트 검증과 소유권 확정 경계를 한곳에 두기 쉬움 | 서버 전송 비용, 요청 크기와 시간 제한 확인 필요 |
| 앱에서 presigned URL로 직접 업로드 | 서버의 파일 중계 부담 감소 | 만료, 재시도, 덮어쓰기와 검증 후 불변성까지 설계 필요 |
| 개발 서버의 로컬 디스크 | 계정 없이 개발 흐름 확인 가능 | 운영 저장소 검증이 아니며 배포와 다중 인스턴스에 별도 대응 필요 |

서버 중계는 기존 인증 경계에 맞춘 구현자 제안이다. 실제 저장소 제공자, 버킷, 리전, 서버 자격 증명 준비 여부와 요청 제한을 확인한 뒤 Task 2 방식을 확정한다. 기존 저장소를 찾으면 재사용을 우선하며 새 유료 서비스는 임의로 개설하지 않는다. 로컬 저장만 성공한 결과를 원격 업로드 완료로 표시하지 않는다.

첫 정책 제안은 신청당 선택적 이미지 1장, 전송 MIME JPEG/PNG, 크기 **1바이트 이상, 10 MiB 이하**(상한 10 × 1024 × 1024바이트 포함)다. 빈 파일은 거부한다. 기존 첨부 없는 생성은 허용한다. HEIC 등은 앱에서 검증된 변환을 제공하기 전에는 지원하지 않는다고 안내한다. 이 제한과 선택 여부는 구현 전에 검토하며, 성능 개선을 주장하기 위한 무조건 압축은 넣지 않는다.

## 전체 흐름과 실패 경계

1. 웹이 현재 connectionId와 requestId로 사진 촬영/선택 요청을 보낸다. 앱은 검증된 origin, 현재 인증 scope, 요청 종류를 검사한다.
2. 앱이 필요한 권한만 요청한다. 사용자 취소는 오류와 구분하고 기존 첨부를 유지한다. 권한 거절과 다시 요청할 수 없는 경우를 구분한다. 사진 선택에 카메라 권한을 일괄 요구하지 않는다.
3. 앱은 파일 크기와 형식을 검사하고 인증된 서버에 전송한다. 원본 바이트, base64, 로컬 URI, 인증 토큰을 브릿지에 싣지 않는다.
4. 서버는 스트림 크기 제한, 실제 이미지 디코딩과 MIME 일치, 과도한 픽셀 수 제한을 검사한다. 픽셀 상한과 디코더는 Task 2 시작 전 정한다. 클라이언트 메타데이터 통과는 실제 파일 검증 성공이 아니다.
5. 검증 완료 파일을 비공개 불변 키에 저장하고 서버가 attachmentId를 발급한다. 웹에는 ID와 표시용 메타데이터 및 상태만 전달한다. 웹 미리보기는 인증 없는 공개 URL로 우회하지 않고, 5일차 기본안은 파일 정보와 교체/삭제 상태 표시다.
6. 신청 입력에 선택적 attachmentId를 추가한다. 서버는 같은 사용자/회사, 업로드 완료, 미연결 상태를 확인하고 신청 생성과 연결을 한 트랜잭션에서 확정한다. 같은 요청 키의 재전송은 같은 첨부까지 비교하고 기존 성공을 반환한다.
7. 업로드 중에는 제출을 막는다. 실패하면 재시도/선택 해제를 제공한다. 요청별 취소와 세대 변경은 오래된 결과를 폐기하며 이미 서버에 저장된 파일은 미연결 정리 대상으로 남긴다.
8. 성공한 첨부 교체는 새 업로드 성공 후 확정한다. 연결된 첨부는 교체/정리 경로에서 지우지 않는다. 미연결 파일 정리는 생성 후 24시간 경과를 제안하며 실제 작업과 삭제/연결 경합 테스트를 Task 2에 포함한다.

## 변경 파일 지도 — 구현 시 예정

| 단계 | 신규/수정 파일 | 책임 |
| --- | --- | --- |
| Task 1 | 신규 `packages/contracts/src/receipts.ts`, `receipts.test.ts`; 수정 `packages/contracts/package.json` | 독립 메타데이터 계약과 `./receipts` export |
| Task 2 | 신규 `packages/api/src/receipts/service.ts`, `storage.ts`, `service.test.ts`, `receipts.integration.test.ts`; 수정 `packages/api/src/index.ts`, `router.ts`, Prisma schema와 새 migration | 인증 업로드와 저장소, 첨부 소유권 및 정리 |
| Task 2 | 신규 `apps/web/src/app/api/receipts/route.ts`; 수정 `packages/api/package.json`, 필요한 서버 `.env.example`과 lockfile | 서버 중계안 채택 시 파일 수신, 검증 의존성 및 설정 |
| Task 3 | 신규 `apps/mobile/src/receipts/picker.ts`, `upload.ts`와 각각의 테스트; 수정 모바일 package.json, app.config.ts와 lockfile | 사진 선택, 권한, 인증 전송; 필요한 네이티브 생성 변경은 실행 전 범위 갱신 |
| Task 3 | 수정 `packages/contracts/src/bridge.ts`, `form-bridge.test.ts`, 모바일 `bridge/claim-host.ts`, `useClaimHost.ts`, 관련 테스트, 웹 `ApplyForm.tsx`, `form-client.ts`, 관련 테스트 | 첨부 요청 수명, 상태, 교체와 취소 |
| Task 4 | 수정 `packages/contracts/src/benefits.ts`, `claim-input.test.ts`, API `benefits/create-claim.ts`, `service.ts`, 관련 통합 테스트 | 첨부와 신청 연결, 멱등성 및 기존 조회 회귀 |
| Task 5 | 신규 `packages/api/scripts/measure-receipts.mjs`, `docs/verification/day-05.md`, 측정 raw/environment; 기존 일일 측정/진행/초안과 로컬 학습 갱신 | 실제 환경 검증과 측정, 기록 |

아직 없는 경로는 구현 예정이며 현재 링크로 제시하지 않는다. 저장소안이 달라지면 해당 파일 목록을 수정 전에 갱신한다.

## 실행 단계

### Task 1 — 완료: 독립 메타데이터 계약

이 단계만 수행하면 파일 촬영/업로드 기능은 여전히 미구현이다. DB, 브릿지, 화면, 패키지 설치 없이 기존 Zod로 진행한다.

- 입력: 외부 메타데이터 `unknown`.
- 출력: `receiptMetadataSchema`의 strict 객체 `{ mimeType: "image/jpeg" | "image/png", byteSize: number }`, `ReceiptMetadata` 타입, `MAX_RECEIPT_BYTES = 10 * 1024 * 1024`.
- [x] 제안한 파일 정책을 재개 시 확정하고 `receipts.test.ts`에 경계 테스트를 작성한다: 1/상한 바이트 허용, 0/음수/소수/상한+1 거부, 미지원 MIME, 누락/추가 필드, NaN/Infinity 거부.
- [x] `npm test -- packages/contracts/src/receipts.test.ts`로 RED를 확인한다. 환경 실패와 미구현 실패를 구분한다.
- [x] `receipts.ts`와 `./receipts` export만 구현한다. 실제 파일의 바이트 검증이나 기존 신청 입력 변경을 이 단계에 섞지 않는다.
- [x] 같은 명령으로 GREEN, `npm run style:check`, `npm run typecheck`, `npm test`를 실행한다. 실패를 고치고 실제 결과를 기록한다.
- [x] 검증 문서, 로컬 학습과 최신 초안을 갱신한다. 화면 변화가 없으므로 브라우저 검증은 해당 없음으로 기록한다. 자동 커밋하지 않는다.

### Task 2 — 구현 완료, 로컬 저장소 검증

- [x] 저장소/서버 요청 제한, 파일 디코더/픽셀 제한, 환경변수 이름과 필요한 의존성을 확인해 이 계획을 구체화한다. 확인 전 구현을 진행하지 않는다.
- [x] 업로드 계약을 확정한다: 인증 파일 요청 → `{ attachmentId, mimeType, byteSize }`; 클라이언트가 userId/companyId/objectKey를 지정할 수 없게 한다.
- [x] 서비스 테스트 RED: 위조 MIME, 초과 크기, 이미지 손상, 미인증, 타 사용자 접근, 저장 실패, 중단 스트림에서 완료 첨부가 없어야 한다.
- [x] Attachment 모델/스토리지 어댑터/인증 경로를 구현한다. 서버 검증 후 생성한 키만 사용하며 클라이언트 파일명을 경로로 사용하지 않는다.
- [x] DB 및 실제 로컬 파일 저장소 통합 테스트: 바이트 일치, 비공개 접근, 실패 정리, 24시간 경계와 연결/정리 경합을 검증한다. 연결 실패 후 남은 객체도 정리 가능하게 한다.

### Task 3 — 구현 완료, 선택/촬영 UI 검증 대기

- [x] 설치된 Expo와 공식 API를 대조해 이미지 선택 패키지, 권한 문구, 네이티브 재빌드 범위를 확정한다.
- [x] `RECEIPT_PICK` 요청의 camera/library 구분, 상태 응답과 취소 계약을 기존 connectionId/requestId 규칙으로 정의한다. 설치와 브릿지 변경 전 정확한 타입/파일 목록을 갱신한다.
- [x] 테스트 RED: 취소 시 기존 첨부 유지, 권한 거절, 업로드 실패 후 재시도, 이중 클릭, close/reload/logout/회사 전환 후 오래된 응답 폐기를 고정한다.
- [x] picker와 인증 upload를 앱에 연결하고 웹의 비활성 입력을 상태/교체/삭제 UI로 전환한다. 기존 폼 입력을 불필요하게 초기화하지 않는다.
- [ ] GREEN 후 브라우저 레이아웃과 iOS 네이티브 선택을 각각 확인한다. 카메라 성공은 실제 촬영 가능한 기기로 확인하고 시뮬레이터 선택 성공과 구분한다.

### Task 4 — 완료: 신청에 연결

- [x] 테스트 RED: 타인/타회사/미완료/이미 연결된 첨부 거부, 같은 키와 다른 첨부 충돌, 같은 요청 재전송 성공, 동일 첨부 동시 연결 1건.
- [x] 선택적 attachmentId 계약과 migration을 적용하고 서버가 관계를 트랜잭션 안에서 확정한다. 기존 첨부 없는 신청과 한도 계산을 유지한다.
- [x] 저장 중 닫기, 늦은 저장 후 캐시 갱신, 응답 유실 재시도, 회사 변경 및 기존 신청 회귀를 DB 포함 검증한다.

### Task 5 — 자동/전송 측정 완료, 실제 UI/원격 대기

- [ ] 아래 AC와 검증 묶음을 실행한다. 화면 경로를 열고 사용자 확인 대기를 별도 표로 남긴다.
- [ ] [측정 계획](../metrics/daily/day-05.md)에 따라 환경을 고정하고 raw를 수집한다. 실측 전 원본 파일을 만들거나 숫자를 채우지 않는다.
- [ ] 학습, 진행, 초안을 갱신하고 AC별 상태/한계를 보고한다. 사용자 확인과 별도 승인 전 push/PR을 만들지 않는다.

## 회귀 검토 초점

1. picker 취소가 기존 첨부/입력을 지우지 않는가 — Task 3.
2. 같은 요청 키로 첨부만 바꿔 다른 결과를 만들 수 없는가 — Task 4.
3. logout/회사 전환 중 업로드 결과가 새 세션에 보이지 않는가 — Task 3/4.
4. 이미지 헤더가 정상이어도 손상/과도한 픽셀로 자원을 소모하지 않는가 — Task 2.
5. 파일 정리와 신청 연결의 경합에서 연결된 객체가 삭제되지 않는가 — Task 2/4.

## 전체 구현 AC와 검증 — 최신 판정은 검증 문서 참조

| AC | 완료 기준 | 검증 묶음 |
| --- | --- | --- |
| D5-01 | 촬영/선택, 필요한 권한, 취소/거절 안내 | 5 네이티브 실제 조작 |
| D5-02 | 크기/MIME/실제 이미지 검증, 비공개 저장과 소유권 | 1 계약/서비스, 2 DB/저장소 |
| D5-03 | 브릿지 인증 경계와 close/reload/session 취소 | 1 호스트 회귀, 5 iOS |
| D5-04 | 신청 첨부 연결과 멱등성, 한도 예약 1회 | 2 실제 DB 동시성/회귀 |
| D5-05 | 업로드 실패/재시도/교체/삭제/미연결 정리 | 1 상태, 2 저장소 실패/경합, 5 실제 UI |
| D5-06 | 기존 화면과 생성 동작 유지 | 3 정적 검사, 4 빌드, 5 UI |
| D5-07 | 이미지 용량/시간 원본과 환경·실패 기록 | 6 반복 측정과 원본 재계산 |
| D5-08 | AC별 기록, 로컬 학습, 최신 초안과 기존 자료 보존 | 7 문서/Git 검사 |

필수 검증은 7묶음이다: ① 관련 단위/상태 테스트 ② DB/저장소 통합과 전체 `npm test` ③ `npm run style:check`/`npm run typecheck` ④ 웹 및 필요한 네이티브 빌드 ⑤ 브라우저 `/apply`와 iOS 실제 화면, 촬영 가능한 기기 ⑥ 실측 ⑦ 문서/보존. Android와 Release를 확인하지 못하면 별도 미검증으로 남긴다.

## 이번 준비 AC

- P1: 현재 코드와 연결된 단계/파일/경계가 있다.
- P2: 전체 AC, 실패 경로, 검증 및 측정 계획과 미결정 사항이 있다.
- P3: 준비 기록과 로컬 학습, 최신 초안을 작성하고 미구현/표본0을 구분한다.
- P4: 기존 변경과 코드/학습 자료를 보존하고 문서를 검사한다.

준비 단계의 실제 결과는 [준비 검증 기록](../verification/day-05-preparation.md)을 따른다. 당시 재개 조건이던 한도 전달과 후속 승인은 충족됐으며 최신 결과는 최종 장부를 따른다.

## 확인한 공식 자료

- 2026-11-20 [Expo ImagePicker](https://docs.expo.dev/versions/latest/sdk/imagepicker/): 시스템 선택/촬영 UI, 설정 변경 시 새 바이너리 필요 여부. 현재 프로젝트 미설치이므로 설치 성공이나 기기 동작을 주장하지 않는다.
- 2026-11-20 [S3 presigned URL](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html): 유효기간 안에 재사용할 수 있고 같은 키 업로드는 덮어쓸 수 있다. 이 특성 때문에 직접 업로드안에는 검증 완료 객체의 불변성 설계가 추가로 필요하다. S3 사용이 확정됐다는 뜻은 아니다.

## Task 1 실행 장부 — 2026-11-20

- 사용자 승인으로 JPEG/PNG, 1바이트~10MiB 메타데이터 계약과 테스트를 구현했다. 신청당 장수나 선택 여부, 저장소 정책은 아직 후속 제안이다.
- 신규 계약26테스트, DB 포함 전체258테스트, 스타일106파일, 타입4개 workspace 통과. 초기 DB EPERM 실패와 재실행을 구분했다. [실제 결과](../verification/day-05-contract.md).
- Ruling: 준비 문서와 기존 사용자 변경이 있는 현재 폴더를 이어 사용했다. 계획의 문서 장부를 갱신하며 자동 worktree/commit 스크립트는 적용하지 않았다. 별도 코드 리뷰는 이번3파일에 한정했다.
- Task 1 당시에는 Task 2 이후 구현을 승인하지 않았으며 실제 파일 검증/업로드/촬영/실측은 미완료다. 메타데이터만 통과한 결과를 전체 D5-02 충족으로 처리하지 않는다.

## 전체 실행 장부 — 2026-11-20

- 승인 범위: 최초 안내의 세 번째 범위인 촬영/업로드 전체 연결, 실제 환경 검증과 반복 측정, 기록. 조회 잔여 한도16%, 소모량 보장 없음.
- Ruling: 현재 작업 폴더와 기존 변경을 이어 사용하며 커밋/push/PR은 별도 승인 전 수행하지 않는다. 기존 준비 장부를 유지한다.
- 저장소 설정 조사: 기존 환경변수 이름에 DB/OAuth만 존재. 사용자에게 기존 저장소 여부를 질문했다. 답변 전 로컬 비공개 개발 어댑터로 진행하며 운영/원격 검증은 구분한다.
- Ruling: 서버 raw-body POST /api/receipts, Bearer 인증과 X-Chagok-Company 헤더, 최대10MiB 스트림/30초 제한. Sharp0.35.5 JPEG/PNG 실제 디코딩, 24,000,000픽셀, 단일 프레임. 전송 원본 바이트를 그대로 보관한다.
- Attachment는 사용자/회사/상태/생성시간/불변 UUID 키를 저장한다. 객체 쓰기 전 PENDING 행을 만들어 실패 객체도 추적하고, READY만 신청 연결 가능하다. 연결/정리는 같은 첨부 행을 잠가 경합을 방지한다. 24시간 지난 미연결/PENDING과 실패 정리를 수동 CLI로 재시도한다.
- 추가 파일: API receipts/{image,body,storage,service,http}.ts와 테스트, cleanup/measure scripts; 새 schema migration; 서버 경로; 모바일 receipts/{picker,upload}.ts와 테스트. 기존 계획의 bridge/form/client/create-claim 파일 및 관련 테스트도 수정한다. 로컬 저장 디렉터리는 Git 제외한다.
- 인터페이스: 업로드 결과는 strict {attachmentId,mimeType,byteSize}, 웹은 ID/메타데이터만 수신. RECEIPT_PICK(camera/library), RECEIPT_CANCEL, RECEIPT_RESULT(cancelled/uploaded), RECEIPT_ERROR. 신청 입력에 선택적 attachmentId를 추가해 기존 무첨부 요청을 유지한다.
- AC는 D5-01~08. 검증7묶음 유지, 원격/실기기 미확인은 별도 표시. 실제 사용자가 선택하는 UI를 계측한 것과 fixture HTTP 실측을 구분한다.

- 사용자 확인: 기존 저장소는 GitHub 코드 저장소만 있다. 외부 객체 저장소 미구축으로 로컬 개발 저장소를 사용한다. 운영환경에서는 로컬 어댑터를 거부하고 원격 검증은 미완료로 남긴다. native.ts에 Expo 어댑터를 분리한다.

- 검증 스크립트 추가: packages/api/scripts/verify-receipt-native.mjs는 별도 가상 토큰을 인자로 전달하는 비UI 전송 계측이다. 사용자 세션을 변경하지 않는다. CUA 좌표 입력이 막혀 picker UI는 별도 미검증으로 남겼다.
- 리뷰 수정: 원격 DB를 향한 로컬 정리 방지 guard, 만료된 첨부 요청의 RECEIPT_ERROR, APNG acTL 검사를 회귀 RED→GREEN으로 반영했다. APNG는 Sharp pages만으로 검사하면 첫 프레임으로 통과하는 실제 실패를 재현했다.

## 최종 실행 장부

- Task 2/4: 로컬 저장, 실제 파일 검증, 첨부 장부와 신청 연결 구현. Task 3: 사진 선택/촬영/취소 코드와 화면 구현, iOS Debug 빌드 및 실제 네이티브 전송 검증 완료. 시스템 picker UI는 CUA 좌표 입력 오류로 미확인.
- 최종283테스트/스타일122파일/타입4개 workspace 통과. 웹은 기본 Turbopack 포트 오류를 보존하고 Webpack 빌드 통과. iOS Debug Build Succeeded.
- 최종 HTTP22/22, iOS File·expo/fetch22/22 성공과 바이트 일치/생성 데이터 정리 확인. 기존 세션은 변경하지 않았다.
- Ruling: 원격 저장소가 없으므로 운영 배포 성공을 주장하지 않는다. 선택/촬영 UI 조작을 네이티브 전송 테스트로 대체 통과시키지 않고 AC 미검증을 남긴다. 미검증 비용은 사용자의 수동 확인과 후속 실기기/원격 검증이다.
- 별도 리뷰 중요2건과 APNG 회귀 공백을 한 번의 수정 단계에서 RED→GREEN으로 해결했다. 리뷰가 판단하지 않은 실기기/원격 동작은 미검증으로 수용했다. 남겨둔 경미한 코드 지적은 없다.
- [전체 AC와 실패 로그](../verification/day-05.md), [최종 측정](../metrics/daily/day-05.md). 학습은 로컬 전용. commit/push/PR 없음.


## 2026-11-23 재개 장부

Task5 재개: 기존 코드/사용자 변경 보존 후 환경 복구, 전체283테스트와 타입/스타일 통과, HTTP22/22회 실측 및 생성 객체 정리 완료. [이번 AC와 다음 순서](../verification/day-05/followup/result.md). 사용자 인증 후 사진 선택/취소, PNG·JPEG 업로드와 교체/삭제/재선택, 첨부 신청1건·홈/내역 갱신을 직접 확인했다. 연결 기기 목록은 시뮬레이터뿐이며 실기기 촬영은 미검증이다. picker/prepare/ACK는 현재 코드에 계측이 없으므로 구현할 파일과 회귀 AC를 먼저 제시한 뒤 추가한다. 원격 저장소/운영 예약 정리는 제공자·환경 확정 후 진행한다. 전체 완료나 PR 승인으로 해석하지 않는다.

## 2026-11-23 후속 계획 — 영수증 구간 계측

승인된 다음 단계는 앱의 단일 monotonic clock으로 picker/prepare/upload와 RESULT 또는 ERROR 송신→웹 상태 적용 ACK 수신을 분리해 기록하는 것이다. ACK는 paint 완료가 아니다. picker에는 사용자 선택과 카메라 권한 대기가 포함되고 upload에는 토큰 조회와 HTTP 응답 파싱이 포함된다.

- 수정 파일: contracts/src/bridge.ts, mobile/src/receipts/{native,metrics,metrics-native}.ts와 관련 테스트, mobile/src/bridge/{claim-host,useClaimHost}.ts 및 host 테스트, web/src/components/apply/form-client.ts 및 테스트, mobile/src/dev/BridgeDiagnostics.tsx. 개발 도구에 원본 조회/공유만 추가한다.
- 결과/문서: verification/day-05/timing/*, metrics/raw 및 environments 새 원본, metrics/daily/day-05.md, verification/day-05.md, progress.md, 로컬 learning/day-05.md와 changes/latest-*.
- M1: pickerMs/prepareMs/uploadMs를 분리하고 성공/취소/실패의 수행된 구간만 남긴다.
- M2: origin/connection/request/scope가 맞는 ACK만 한 번 반영한다. 늦은 ACK, reset/cancel, ACK3초 누락을 구분하며 사용자 흐름을 차단하지 않는다.
- M3: 개발환경만 최대100개 기록, 초과/저장 실패를 표시한다. 토큰/사용자/회사/파일 URI/신청 내용은 저장하지 않는다. 실행별 JSON으로 기존 원본을 덮어쓰지 않는다.
- M4: RED→GREEN, 전체 테스트(실제 DB)/스타일/타입/웹 빌드, 앱 실제 선택과 원본 재계산. 반복 표본은 JPEG/PNG 각각 준비1+본10회를 목표로 하고 실제 확보 수와 미측정을 구분한다.

Ruling: 기존 작업 폴더의 미커밋 구현을 이어서 수정하며 시작 해시/diff로 보존한다. 사용자 PR 승인 전 commit/push/PR은 수행하지 않는다. 일반 설계 선택은 기존 승인된 계측 목적에 맞춰 결정하며 별도 설계 승인 질문을 반복하지 않는다.


### 계측 실행 결과

2026-11-23 M1~M4 충족. 전체291테스트/스타일127파일/타입4 workspace/웹 빌드, 실제 선택 업로드22회·취소1회·ACK23건 및 Python/Node 재계산을 확인했다. [상세 검증](../verification/day-05/timing/result.md). 기록의 저장 실패/초과/대기는0이며 실기기 촬영·실패 UI·원격 운영 검증은 다음 범위로 남긴다. 기존 데이터 보존, commit/push/PR 없음.


## 2026-11-23 후속 검증 — 실패 복구와 진행 중 종료

현재 제품 코드를 유지한 채 로컬 Next PID85458의 응답을 최대55초 지연(SIGSTOP, watchdog SIGCONT)시켜 실제 UI를 검증한다. 원격 서버/DB/세션은 변경하지 않는다. R1: timeout 오류와 기존 첨부 유지/재시도. R2: 전송 중 닫기 후 재진입에서 이전 응답 폐기. R3: 전송 중 웹뷰 reload 후 새 연결과 새 첨부 성공. R4: 서버 복구, 관련 자동 검사, 원본/문서/기존 파일 보존.

수정 대상은 verification/day-05/recovery/*, metrics/raw·environments의 새 실행 원본, metrics/daily/day-05.md, verification/day-05.md, progress.md, 로컬 learning/day-05.md와 changes/latest-*다. 결함 발견 시 코드 수정 계획을 먼저 추가한다. 이전 세션의 자동 검사 결과를 이번 통과 근거로 재사용하지 않는다. 기존 미커밋 작업을 이어 쓰며 commit/push/PR은 하지 않는다.


실행 결과: R1~R4 충족. [실제 UI/자동 검사/복구 근거](../verification/day-05/recovery/result.md). 제품 수정 없이 timeout 재시도·진행 중 닫기·reload를 확인했고 관련45테스트/스타일127파일 통과, 서버3회 모두 재개했다. 기존 시뮬레이터에 합성 첨부4건 추가 보존·신규 신청0. 실기기/세션 변경/원격 검증을 별도로 남긴다.


## 2026-11-24 후속 검증 — 서버 오류와 세션 경계

수정 범위는 mobile receipts/picker.test.ts, 신규 bridge/useClaimHost.test.ts, web apply/form-client.test.ts, api receipts/receipts.integration.test.ts와 검증/측정/진행/로컬 학습/최신 초안이다. 제품 API 경로는 실제 화면 오류 검증 중에만 임시 변경하고 원본으로 복구한다. E1 오류별 안내와 첨부 보존, E2 세션 변경 후 이전 응답 차단, E3 복구/회귀, E4 실측/기록/보존을 확인한다. 실제 DB 만료/회사 변경은 독립 가상 계정으로 실행하며 로그인 사용자 데이터는 변경하지 않는다.

결과: 오류 UI5종과 정상 재시도, 세션 구독3종 및 실제 DB 경계3종 확인. 최종307테스트/스타일128파일/타입4 workspace 통과. [AC별 결과와 미검증](../verification/day-05/errors/result.md). E2 자동 검증은 충족하나 실제 계정 변경 전체 UI, 실기기/원격/Android/Release/운영 예약 정리는 미검증이다. 새 합성 첨부1건 보존, 신규 신청0. commit/push/PR 없음.


## 2026-11-24 추가 로컬 검증 — 정리 CLI·운영 차단·빌드·권한

실기기와 원격 저장소 없이 가능한 검증을 진행한다. 기존 로그인 앱과 DB를 유지하고, 별도 임시 PostgreSQL 55433과 임시 파일에서 정리 CLI를 실행한다. L1은100건 제한/후속 배치/삭제 실패 재시도/최신·연결 첨부 보존, L2는 production 로컬 저장 차단, L3는 iOS Simulator Release 빌드와 Android production JS export 가능 범위, L4는 회귀·기록·보존이다. 추가 L5는 시뮬레이터 실제 카메라 권한 거절→재시도→사진 선택 취소의 UI와 기존 첨부 보존이다.

수정 대상은 scripts/cleanup-receipts.test.ts, verification/day-05/local/*, 새 permission 측정 원본·환경, 일일 측정/진행/검증/로컬 학습/최신 초안이다. 제품 코드/설정/스키마는 변경하지 않는다. 실제 계정의 토큰·만료·회사 소속을 조작하지 않으며, 테스트 계정 로그인 없이 전체 계정 전환 UI를 통과 처리하지 않는다. Android SDK를 새로 구축하거나 운영 예약 작업을 등록하는 작업은 포함하지 않는다. 결과는 [이번 검증](../verification/day-05/local/result.md)에 기록한다.

## 2026-11-24 후속 검증 — iOS Release 실행

제품 코드 변경 없이 기존 iOS Simulator Release 산출물을 iPhone17/iOS27.2에 업데이트 설치한다. 수정 대상은 verification/day-05/release/*의 실행 근거, plans/day-05.md, verification/day-05.md, metrics/daily/day-05.md, progress.md, 로컬 learning/day-05.md 및 changes/latest-*다.

- S1: Release 빌드/서명/설치된 앱의 일치와 실제 시작.
- S2: 로그인 복원·홈·신청 WebView 및 개발 UI 숨김.
- S3: 사진 선택·취소·합성 이미지 업로드·화면 재진입.
- S4: 재실행·데이터 보존·기록 및 남은 한계 구분.

최초 CODE_SIGNING_ALLOWED=NO 산출물은 실행되지만 Keychain -34018로 로그인 복원에 실패했다. 로그와 Debug 서명을 비교한 뒤 제품 소스/설정 변경 없이 CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=-로 시뮬레이터 ad-hoc 서명을 적용해 재빌드한다. 초기 실패도 결과에 보존한다. 새 신청 제출·로그아웃·세션/회사 데이터 조작·원격 배포는 수행하지 않는다. 업데이트/재실행 시 메모리에만 있는 신청 폼은 초기화될 수 있다.

결과: S1~S4 시뮬레이터/로컬 서버 범위 충족. 서명 후 로그인 복원·신청·PNG 업로드·취소/거절 안내와 Metro 중지 중 재실행을 확인했다. 관련20테스트/스타일128파일 통과, 기존 데이터 보존, 새 합성 PNG1건·신청0. [실패와 성공을 포함한 상세 검증](../verification/day-05/release/result.md). 현재 설치 앱은 Release이며 실기기·배포·원격 운영 검증과 구분한다.


## 2026-11-24 후속 검증 — Android 환경·빌드·에뮬레이터

Java/SDK/Gradle/AVD를 Git 제외된 `.local-tools/android/`에 준비하고 기존 Expo 설정으로 `apps/mobile/android/`를 생성한다. 제품 소스 변경 없이 ARM64 Release APK와 에뮬레이터를 검증한다. 변경 대상은 verification/day-05/android/*, 이 계획, verification/day-05.md, metrics/daily/day-05.md, progress.md, 로컬 learning/day-05.md 및 changes/latest-*다. 생성 네이티브 프로젝트와 도구는 기존 Git 제외 정책을 유지한다.

- A1: Java·SDK·가속·가상 기기 부팅.
- A2: Release APK 빌드·서명·설치 일치.
- A3: 로그인 진입/취소, 데모 홈·내역·정책·신청 화면 및 복귀의 가능한 범위. 사용자 확인으로 Android OAuth는 미등록이며 실제 로그인/영수증 업로드는 후속 항목이다.
- A4: Metro 의존성 없는 재실행·관련 자동 검사·데이터/기존 파일 보존·기록.

실기기 촬영·배포 서명·Play Store·원격 저장은 제외한다. 입력된 계정이나 세션을 조작해 인증 검증을 우회하지 않는다. 로컬 HTTP 연결 또는 기존 구현 결함이 발견되면 원인과 수정 범위를 먼저 공유한다. [실행 근거](../verification/day-05/android/environment.json).

Android 추가 범위: 원본 Release의 데모 신청 WebView가 로컬 HTTP를 거부해, 서버 직접 응답200/재시도 동일 실패/APK manifest 설정 부재를 확인했다. Git 제외 생성 프로젝트 src/release/AndroidManifest.xml과 res/xml/chagok_local_network.xml에 호스트10.0.2.2만 허용하는 임시 설정으로 동일 Release를 재빌드한다. 원본 APK를 보존하고 검증 후 이 두 임시 파일을 제거한다. 제품 Expo 설정·인증·운영 HTTPS는 변경하지 않는다. 원본 Release와 로컬 검증용 APK의 해시·결과를 분리한다.

Android 개발 서버 추가 진단: 로컬 HTTP 허용 후 HTML은 열렸으나 WEB_READY가 15초 내 완료되지 않았다. 서버 로그의10.0.2.2 개발 리소스 차단을 근거로 apps/web/next.config.ts의 allowedDevOrigins에 해당 호스트를 임시 추가하고 재검증한다. AC는 데모 FORM_INIT 안내·제출 제한·복귀이며, 검증 후 원본 설정으로 복구한다. 제품 설정의 영구 변경은 포함하지 않는다.

Android 추가 진단 범위: apps/web/src/app/layout.tsx에 일시적인 JS 오류/브릿지 존재 표시를 넣어 hydration 실패 여부를 확인한다. 인증이나 브릿지 응답은 조작하지 않으며 원본 바이트를 별도 보존하고 검사 후 복구한다.

Android 결과: A1/A2/A4 충족, A3 미충족. 환경·원본/로컬 Release·데모 탐색·Metro 독립 실행 확인. 신청 브릿지는 Android WebView sourceOrigin과 /apply 검사 간 호환성 불일치로 후속 수정이 필요하다. 실제 OAuth 로그인/영수증은 미등록으로 미검증. 임시 Android/Next/레이아웃 설정 원복, 관련23테스트·스타일128파일 통과, 기존 DB/31파일 보존·새 신청/첨부0. [상세 결과](../verification/day-05/android/result.md). commit/push/PR 없음.

## 2026-11-25 — Android 로컬 연결·브릿지 수정

대상: mobile/app.config.ts, mobile/package.json, mobile/.env.example, mobile/plugins/withAndroidNetwork.cjs, mobile/src/components/ApplyContainer.tsx 및 테스트, mobile/src/bridge/message-source.ts 및 테스트, scripts/android-network.test.ts, web/next.config.ts. 검증 증거는 verification/day-05/android-fix/에 기록하고 누적 검증·진행·측정·로컬 학습·latest-* 문서를 갱신한다. 기존 Day5 수정과 DB/영수증은 보존한다.

- AC1: 명시적인 로컬 모드에서만 Android Release의10.0.2.2 HTTP를 허용. Expo prebuild 재생성으로 재현하고 일반 모드 재생성 시 예외를 제거한다. 기존 Debug 네트워크 설정은 유지한다.
- AC2: Android origin-only 메시지와 현재 로드된 /apply 문서를 함께 검증. 탐색은 기존 exact URL 제한을 유지한다. 외부 출처·다른 경로·미로드/종료/이전 revision 메시지는 거부한다. /apply의 프레임·object 삽입은 CSP로 차단한다.
- AC3: RED→GREEN 회귀, 전체 테스트·타입·스타일, Release 빌드/설치, 에뮬레이터 초기화·닫기·재진입·복구 및 실제 화면 증거.
- AC4: 기존 DB·파일 보존, 기록과 초안 갱신. OAuth 실제 로그인·영수증, 실기기·원격 저장소는 이번 범위 밖이다.

실제 출처 확인을 위한 진단 Release의 URL/종류 로그와 WebView 디버깅 옵션은 일시적으로만 사용하고 최종 소스/산출물에서 제거한다. 인증 상태나 FORM_INIT 응답을 주입하지 않는다. [후속 결과](../verification/day-05/android-fix/result.md).

추가 보완: 리뷰와 실제 srcdoc 닫기 재현으로 CSP만으로 직접 하위 프레임 송신을 차단하지 못함을 확인했다. root package.json/package-lock.json, patches/react-native-webview+14.0.1.patch 및 README에 고정 버전 네이티브 main-frame 검사·구형 fallback 차단·설치 자동 패치를 추가한다. BridgeReceiver.tsx의 임시 srcdoc/about:blank fixture로 전후 비교 후 원본 복구한다. AC2는 직접 하위 프레임 송신 거부까지 확인하며, 같은 origin의 임의 스크립트/XSS나 부모 브릿지 호출을 완전 격리한다고 주장하지 않는다. 구형 WEB_MESSAGE_LISTENER 미지원 환경은 연결 실패로 종료하는 의도된 호환성 제한이다.

추가 원인: Android 실제 로그에서 WEB_READY accepted 뒤 동일 URL history 갱신이 load-start로 도착해 준비 상태를 지우고15초 뒤 timeout이 발생했다. RNCWebViewClient 패치에 실제 onPageStarted와 같은 URL history 갱신 분리를 추가한다. 다른 경로 history는 계속 호스트에 전달한다. 임시 웹 fixture로25초 안정성·hard reload·다른 경로 차단·최상위 닫기를 검증 후 복구한다. 진단 로그는 최종 앱에 포함하지 않는다.

최종 결과: AC1~4 충족.333테스트·타입·스타일 및 최종 Release에서25초 안정성/실제 reload/경로 차단/직접 프레임 송신/닫기·복구 확인. 임시 코드를 복구하고 기존 DB/31파일 보존. 구형 WebView/OAuth/실기기/원격의 범위는 [최종 결과](../verification/day-05/android-fix/result.md)에 구분했다.
