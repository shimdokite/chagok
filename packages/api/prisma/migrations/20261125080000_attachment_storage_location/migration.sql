-- Receipts recorded before remote storage was supported are local files.
ALTER TABLE "Attachment" ADD COLUMN "storageLocation" TEXT NOT NULL DEFAULT 'local';
