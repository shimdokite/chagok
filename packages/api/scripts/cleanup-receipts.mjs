// node --env-file=apps/web/.env.local --experimental-transform-types packages/api/scripts/cleanup-receipts.mjs
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
const { getDb } = await import("../src/auth/store.ts");
const { createReceiptService } = await import("../src/receipts/service.ts");
const { configuredReceiptStorage } = await import("../src/receipts/storage.ts");
const { assertLocalDatabase } = await import("../src/benefits/seed.ts");
assertLocalDatabase(process.env.DATABASE_URL);
const db = getDb();
try {
  // One bounded batch. Failed deletions remain DELETING for the next invocation.
  console.log(
    JSON.stringify(
      await createReceiptService(db, configuredReceiptStorage()).cleanup(),
    ),
  );
} finally {
  await db.$disconnect();
}
