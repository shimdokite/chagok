ALTER TABLE "Claim" DROP CONSTRAINT "Claim_userId_companyId_fkey";
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_userId_companyId_fkey"
  FOREIGN KEY ("userId", "companyId") REFERENCES "Membership"("userId", "companyId")
  ON DELETE CASCADE ON UPDATE RESTRICT;
