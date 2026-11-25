import sharp from "sharp";
import { TRPCError } from "@trpc/server";
import { receiptMetadataSchema } from "@chagok/contracts/receipts";

export const MAX_RECEIPT_PIXELS = 24_000_000;

function isAnimatedPng(bytes: Buffer) {
  // libvips exposes only the PNG default image, so pages alone misses APNG.
  for (let offset = 8; offset + 12 <= bytes.length;) {
    const length = bytes.readUInt32BE(offset);
    if (bytes.toString("ascii", offset + 4, offset + 8) === "acTL") return true;
    offset += length + 12;
  }
  return false;
}

export async function validateImage(bytes: Buffer, mimeType: string | null) {
  try {
    const metadata = receiptMetadataSchema.parse({
      mimeType,
      byteSize: bytes.length,
    });
    const image = sharp(bytes, {
      failOn: "warning",
      limitInputPixels: MAX_RECEIPT_PIXELS,
    });
    const info = await image.metadata();
    if (info.format === "png" && isAnimatedPng(bytes))
      throw new Error("Animated PNG");
    if (`image/${info.format}` !== metadata.mimeType || (info.pages ?? 1) !== 1)
      throw new Error("Invalid image format");
    // Metadata alone does not detect damaged pixel data. Force full decoding.
    await image.timeout({ seconds: 5 }).raw().toBuffer();
    return metadata;
  } catch {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "JPEG/PNG 이미지(10MiB, 2,400만 픽셀 이하)를 확인해 주세요.",
    });
  }
}
