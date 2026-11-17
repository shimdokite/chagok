CREATE TYPE "ClaimStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED');
CREATE TABLE "Company" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "isSample" BOOLEAN NOT NULL DEFAULT false
);
CREATE TABLE "Membership" (
  "userId" TEXT NOT NULL PRIMARY KEY REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "companyId" TEXT NOT NULL REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  UNIQUE ("userId", "companyId")
);
CREATE INDEX "Membership_companyId_idx" ON "Membership"("companyId");
CREATE TABLE "BenefitPolicy" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "companyId" TEXT NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "month" TEXT NOT NULL CHECK ("month" ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'),
  "allowance" INTEGER NOT NULL CHECK ("allowance" >= 0),
  "categories" TEXT[] NOT NULL,
  "guidance" TEXT NOT NULL,
  UNIQUE ("companyId", "month")
);
CREATE TABLE "Claim" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "companyId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "amount" INTEGER NOT NULL CHECK ("amount" > 0),
  "status" "ClaimStatus" NOT NULL,
  "usedOn" TEXT NOT NULL CHECK ("usedOn" ~ '^20[0-9]{2}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'),
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "rejectionReason" TEXT,
  FOREIGN KEY ("userId", "companyId") REFERENCES "Membership"("userId", "companyId") ON DELETE CASCADE ON UPDATE CASCADE,
  CHECK ("status" <> 'REJECTED' OR length(trim("rejectionReason")) > 0 AND "rejectionReason" IS NOT NULL)
);
CREATE INDEX "Claim_userId_companyId_usedOn_submittedAt_id_idx" ON "Claim"("userId", "companyId", "usedOn", "submittedAt", "id");
