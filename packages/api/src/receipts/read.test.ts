import { afterEach, expect, it, vi } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { readStoredReceipt } from "./read";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("로컬 원본을 읽고 크기 불일치와 경로 탈출을 거절한다", async () => {
  const directory = await mkdtemp(join(tmpdir(), "review-read-"));
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("RECEIPT_LOCAL_DIR", directory);
  const id = randomUUID();
  const bytes = Buffer.from("synthetic-image");
  await writeFile(join(directory, id), bytes);
  const receipt = {
    id,
    storageLocation: "local",
    mimeType: "image/png",
    byteSize: bytes.length,
  };
  try {
    expect(await readStoredReceipt(receipt)).toEqual(bytes);
    await expect(
      readStoredReceipt({ ...receipt, byteSize: 1 }),
    ).rejects.toThrow("size mismatch");
    await expect(
      readStoredReceipt({ ...receipt, id: "../private" }),
    ).rejects.toThrow();
    vi.stubEnv("NODE_ENV", "production");
    await expect(readStoredReceipt(receipt)).rejects.toThrow(
      "Local receipts unavailable",
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it("설정된 원격 위치만 읽고 저장소 실패를 숨기지 않는다", async () => {
  vi.stubEnv("SUPABASE_URL", "https://fixture.supabase.co");
  vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_fixture");
  const receipt = {
    id: randomUUID(),
    storageLocation: "https://fixture.supabase.co/receipts",
    mimeType: "image/png",
    byteSize: 3,
  };
  vi.stubGlobal("fetch", async (url: string, options: RequestInit) => {
    expect(url).toBe(
      `https://fixture.supabase.co/storage/v1/object/authenticated/receipts/${receipt.id}`,
    );
    expect(options.redirect).toBe("error");
    return new Response(new Uint8Array([1, 2, 3]));
  });
  expect(await readStoredReceipt(receipt)).toEqual(Buffer.from([1, 2, 3]));
  await expect(
    readStoredReceipt({
      ...receipt,
      storageLocation: "https://other.supabase.co/receipts",
    }),
  ).rejects.toThrow("Unknown receipt location");
  vi.stubGlobal("fetch", async () => new Response(null, { status: 403 }));
  await expect(readStoredReceipt(receipt)).rejects.toThrow(
    "Receipt storage unavailable",
  );
});
