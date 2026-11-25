CREATE TYPE "AttachmentState" AS ENUM ('PENDING', 'READY', 'LINKED', 'DELETING');
CREATE TABLE "Attachment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "byteSize" INTEGER NOT NULL,
  "state" "AttachmentState" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Attachment_byteSize_check" CHECK ("byteSize" BETWEEN 1 AND 10485760),
  CONSTRAINT "Attachment_mimeType_check" CHECK ("mimeType" IN ('image/jpeg', 'image/png'))
);
ALTER TABLE "Claim" ADD COLUMN "attachmentId" TEXT;
CREATE UNIQUE INDEX "Claim_attachmentId_key" ON "Claim"("attachmentId");
CREATE INDEX "Attachment_state_createdAt_idx" ON "Attachment"("state", "createdAt");
CREATE INDEX "Attachment_userId_companyId_idx" ON "Attachment"("userId", "companyId");
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "Attachment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
