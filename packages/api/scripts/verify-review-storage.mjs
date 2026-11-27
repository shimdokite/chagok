// One synthetic remote object; credentials remain in environment variables.
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (error) {
      if (error.code !== "ERR_MODULE_NOT_FOUND" || !specifier.startsWith("."))
        throw error;
      return next(`${specifier}.ts`, context);
    }
  },
});
const { supabaseReceiptStorage } =
  await import("../src/receipts/supabase-storage.ts");
const { readStoredReceipt } = await import("../src/receipts/read.ts");
const storage = supabaseReceiptStorage();
const bytes = await readFile("docs/metrics/fixtures/day-05/synthetic-png.png");
const id = randomUUID();
const result = {
  provider: "supabase",
  synthetic: true,
  bytes: bytes.length,
  uploaded: false,
  read: false,
  removed: false,
};
try {
  await storage.put(id, bytes, "image/png");
  result.uploaded = true;
  const start = performance.now();
  const downloaded = await readStoredReceipt({
    id,
    storageLocation: storage.location,
    byteSize: bytes.length,
    mimeType: "image/png",
  });
  result.durationMs = performance.now() - start;
  assert.deepEqual(downloaded, bytes);
  result.read = true;
  result.sha256 = createHash("sha256").update(downloaded).digest("hex");
} catch (error) {
  result.error = error instanceof Error ? error.message : String(error);
  process.exitCode = 1;
} finally {
  try {
    await storage.remove(id);
    result.removed = true;
  } catch (error) {
    result.cleanupError =
      error instanceof Error ? error.message : String(error);
    process.exitCode = 1;
  }
  await writeFile(
    "docs/verification/day-06/remote-receipt.json",
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(JSON.stringify(result));
}
