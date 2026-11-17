# Day 3 independent review

Scope: uncommitted Day 3 API, schema, auth/cache boundary, and mobile query/screens. Read AGENTS.md, docs/code-style.md, docs/plans/day-03.md first; prior conventions changes excluded. Read-only source review; no repository edits, commits, pushes, or agents. Existing passing suite was not rerun. Pending final documentation/build/UI work is not treated as a defect.

## Findings

### P2 — Do not reassign historical claims when company membership changes

- Location: `packages/api/prisma/migrations/20261117000000_benefits/migration.sql:34`; corresponding relation `packages/api/prisma/schema.prisma:71`.
- The composite Claim→Membership FK uses `ON UPDATE CASCADE`. If an administrator changes an existing user's `Membership.companyId` from A to B, PostgreSQL silently changes every historical Claim.companyId from A to B. `home/history/detail` then correctly filter by B but return A's historical applications as B's and subtract A's amounts from B's policy. Thus the isolation filters cannot preserve the original company attribution. The seed command refuses reassignment, but the database constraint itself permits this update; membership-change behavior is explicitly in the plan's review focus.
- Minimum fix for the current one-membership model: explicitly restrict the company-key update rather than cascade it, including Prisma `onUpdate` so schema and migration agree. If transfers must be supported now, preserve claim company ownership using an explicit transfer/history model instead of rewriting past claims. `ON DELETE CASCADE` similarly destroys historical claims when membership is removed; decide whether that is intentional rather than automatically interpreting removal as historical erasure.
- Targeted regression: create A/B policies and an A member with an approved claim; try updating membership to B. Assert either the update is rejected or the original claim stays with A and never affects B's balance/history. Existing integration test only checks that the seed helper refuses reassignment.
- Evidence: static SQL/Prisma/service inspection; no database mutation executed in this review.

### P2 — Invalidate the old scope when a history response reports lost/changed affiliation

- Location: `apps/mobile/src/benefits/queries.ts:55-60`; presentation at `apps/mobile/app/history.tsx:26-27`.
- A user can load page 1 while assigned to A, have the membership removed server-side while the app remains foreground, and tap “더 보기”. The server safely returns `{company:null, items:[]}` for page 2, but the infinite query appends that page to the old A pages. History still derives its company from page 1 and flattens the old records, so the successful next query does not clear the revoked affiliation or show the unassigned state. Switching affiliation can similarly mix page companies. The client scope only changes during an auth.session refresh, and successful benefits responses never reconcile company identity. This contradicts the explicit next-query refresh behavior for affiliation changes.
- Fix: before accepting a non-demo benefits result, compare its current company/unassigned state against the session scope. On mismatch, block/cancel the old query, refresh session scope, and discard old pages/caches; restart history without the old cursor. Apply a shared response check to home/policy/detail as appropriate so the old scope cannot continue serving other fresh resources after the change is detected.
- Targeted regression: mount/use an infinite observer with page 1 in A; simulate membership deletion and fetchNextPage returning company:null. Assert old A rows are removed and unassigned UI appears. Also test A→B while fetching the next page; no A cursor/page should remain in B's query and no older resource cache should be reused.
- Evidence: executed a standalone read-only reproduction using the installed `InfiniteQueryObserver`, the actual query-key shape and page response shapes, then the screen's exact company/flatten expressions. Result: `{"pageCompanies":[{"id":"company-a"},null],"renderedCompany":{"id":"company-a"},"renderedItems":[{"id":"old-claim"}]}`. No existing suite rerun and no source files changed.

## Reviewed without additional findings

- tRPC employee procedures invoke actual AuthService.session before benefits queries; strict inputs do not accept client authorization user/company IDs.
- Service membership and company/owner filters plus uniform detail NOT_FOUND prevent cross-user/cross-company reads under an unchanged membership.
- Repeatable-read home aggregation and keyset ordering `(submittedAt DESC,id DESC)` handle same timestamps correctly; month filter uses calendar usedOn strings and KST currentMonth.
- Absent policy has an explicit discriminant separate from allowance zero; rejected amounts are excluded.
- Session-scope keyed provider and synchronous controller subscription cancel/clear old cache at sign-out/error/account changes. Late-result cache test exercises ignored cancellation, and source review found no extra data-restoration path.
- Hook calls are unconditional and precede rendering branches; foreground validation retains the navigator with its blocking overlay.

Result: 2 P2 correctness findings; no P0/P1 authorization bypass found. No claim that pending browser/native/build checks are complete.

## 작성자 수정·검증

- 두 지적을 수용했다. FK 변경 전 실제 DB 회귀는 update가 성공해 실패했고, 후속 마이그레이션 적용 후 회사 변경을 거부하고 원래 companyId가 유지되는 검증을 통과했다.
- company:null/다른 company 응답을 받으면 기존 캐시 전체를 취소·삭제하고 세션 갱신을 요청하는 공통 응답 경계를 추가했다. 기존 데이터 삭제와 갱신 호출 회귀가 실패→통과했다.
- 상세 NOT_FOUND/오류 시 캐시된 상세 본문을 숨기며 NOT_FOUND는 소속·세션도 재확인한다.
- 계정/소속 삭제용 제품 API는 없다. 현재 스키마의 onDelete Cascade는 직접 DB에서 사용자/소속을 삭제하면 이력도 삭제한다. 실제 탈퇴·소속 이동 도입 시 이력 보존 모델을 별도로 설계해야 한다. 3일차 seed는 소속 재지정을 거부한다.
- 별도 재리뷰는 하지 않았다. 최종 테스트·타입 결과는 상위 검증 문서를 따른다.
