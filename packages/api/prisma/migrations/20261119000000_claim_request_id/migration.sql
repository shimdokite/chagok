-- NULL keeps historical claims and existing seeds compatible.
ALTER TABLE "Claim" ADD COLUMN "requestId" TEXT;
CREATE UNIQUE INDEX "Claim_userId_requestId_key" ON "Claim"("userId", "requestId");
