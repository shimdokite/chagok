import { describe, expect, it } from "vitest";
import {
  MAX_RECEIPT_BYTES,
  receiptMetadataSchema,
  type ReceiptMetadata,
} from "@chagok/contracts/receipts";

describe("영수증 메타데이터 계약", () => {
  it.each([
    { mimeType: "image/jpeg", byteSize: 1 },
    { mimeType: "image/png", byteSize: 10485760 },
  ] satisfies ReceiptMetadata[])("허용된 경계 %j 보존", (input) => {
    expect(receiptMetadataSchema.parse(input)).toEqual(input);
  });
  it("전송 상한은 10 MiB다", () => {
    expect(MAX_RECEIPT_BYTES).toBe(10485760);
  });
  it.each([0, -1, 1.5, 10485761, NaN, Infinity, -Infinity, "1", null])(
    "잘못된 바이트 크기 %s 거부",
    (byteSize) => {
      expect(
        receiptMetadataSchema.safeParse({ mimeType: "image/jpeg", byteSize })
          .success,
      ).toBe(false);
    },
  );
  it.each(["image/heic", "image/gif", "image/jpg", "IMAGE/JPEG", "", null])(
    "지원하지 않는 MIME %s 거부",
    (mimeType) => {
      expect(
        receiptMetadataSchema.safeParse({ mimeType, byteSize: 1 }).success,
      ).toBe(false);
    },
  );
  it.each([
    {},
    { mimeType: "image/png" },
    { byteSize: 1 },
    { mimeType: "image/png", byteSize: 1, userId: "forged" },
    { mimeType: "image/png", byteSize: 1, uri: "file:///receipt.png" },
    null,
    undefined,
    [],
  ])("누락·추가 필드 또는 잘못된 객체 %j 거부", (input) => {
    expect(receiptMetadataSchema.safeParse(input).success).toBe(false);
  });
});
