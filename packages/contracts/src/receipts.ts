import { z } from "zod";

export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;
// Metadata validation does not verify the file's bytes or decoded image.
export const receiptMetadataSchema = z
  .object({
    mimeType: z.enum(["image/jpeg", "image/png"]),
    byteSize: z.number().int().min(1).max(MAX_RECEIPT_BYTES),
  })
  .strict();
export type ReceiptMetadata = z.infer<typeof receiptMetadataSchema>;

export const uploadedReceiptSchema = receiptMetadataSchema.extend({
  attachmentId: z.uuid(),
});
export type UploadedReceipt = z.infer<typeof uploadedReceiptSchema>;
export const receiptResultSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("cancelled") }).strict(),
  z
    .object({ kind: z.literal("uploaded"), receipt: uploadedReceiptSchema })
    .strict(),
]);
export type ReceiptResult = z.infer<typeof receiptResultSchema>;
export const receiptErrorSchema = z.enum([
  "PERMISSION_DENIED",
  "PERMISSION_SETTINGS",
  "UNSUPPORTED",
  "TOO_LARGE",
  "UPLOAD_FAILED",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "BUSY",
]);
