CREATE TYPE "MembershipRole" AS ENUM ('EMPLOYEE', 'REVIEWER');
ALTER TABLE "Membership" ADD COLUMN "role" "MembershipRole" NOT NULL DEFAULT 'EMPLOYEE';
ALTER TABLE "Claim" ADD COLUMN "reviewedBy" TEXT, ADD COLUMN "reviewedAt" TIMESTAMP(3);
CREATE INDEX "Claim_companyId_usedOn_submittedAt_id_idx" ON "Claim"("companyId", "usedOn", "submittedAt", "id");
