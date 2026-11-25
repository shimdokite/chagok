// Local development HTTP measurement; never uses a real employee or receipt.
// node --env-file=apps/web/.env.local --experimental-transform-types packages/api/scripts/measure-receipts.mjs
import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import { platform, release, arch } from "node:os";
import sharp from "sharp";

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
const { assertLocalDatabase } = await import("../src/benefits/seed.ts");
const { createReceiptService } = await import("../src/receipts/service.ts");
const { configuredReceiptStorage } = await import("../src/receipts/storage.ts");
assertLocalDatabase(process.env.DATABASE_URL);
const origin = "http://127.0.0.1:3000";
const db = getDb();
const runId = `day-05-${Date.now()}`;
const token = randomBytes(32).toString("hex");
const samples = [];
const fixtures = [];
let userId;
let companyId;
let cleanup;
const source = Buffer.from(
  '<svg width="1200" height="1600" xmlns="http://www.w3.org/2000/svg"><rect width="1200" height="1600" fill="white"/><g fill="black" font-family="sans-serif" font-size="48"><text x="100" y="150">CHAGOK TEST RECEIPT</text><text x="100" y="300">SYNTHETIC FIXTURE - NO PERSONAL DATA</text><text x="100" y="500">Meal 10,000 KRW</text><text x="100" y="700">Total 10,000 KRW</text></g><path d="M100 800H1100M100 850H1100M100 900H1100" stroke="black" stroke-width="4"/></svg>',
);
await mkdir("docs/metrics/fixtures/day-05", { recursive: true });
await mkdir("docs/metrics/raw", { recursive: true });
await mkdir("docs/metrics/environments", { recursive: true });
try {
  const user = await db.user.create({ data: { googleSub: runId } });
  userId = user.id;
  const company = await db.company.create({
    data: {
      name: "Receipt measurement fixture",
      slug: runId,
      isSample: true,
      memberships: { create: { userId } },
    },
  });
  companyId = company.id;
  await db.session.create({
    data: {
      userId,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      expiresAt: new Date(Date.now() + 600000),
    },
  });
  for (const format of ["jpeg", "png"]) {
    const bytes = await sharp(source)[format]().toBuffer();
    const fixtureId = `synthetic-${format}`;
    await writeFile(
      `docs/metrics/fixtures/day-05/${fixtureId}.${format}`,
      bytes,
    );
    fixtures.push({
      fixtureId,
      mimeType: `image/${format}`,
      originalBytes: bytes.length,
      transmittedBytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      width: 1200,
      height: 1600,
    });
    for (let index = 0; index < 11; index++) {
      const start = performance.now();
      let status = "failure";
      let httpStatus;
      let endMs;
      let error;
      try {
        const response = await fetch(`${origin}/api/receipts`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "X-Chagok-Company": companyId,
            "Content-Type": `image/${format}`,
          },
          body: bytes,
          signal: AbortSignal.timeout(35000),
        });
        httpStatus = response.status;
        const result = await response.json();
        endMs = performance.now();
        assert.equal(response.status, 201);
        assert.equal(result.byteSize, bytes.length);
        const saved = await readFile(
          `${process.env.RECEIPT_LOCAL_DIR}/${result.attachmentId}`,
        );
        assert.deepEqual(saved, bytes);
        status = "success";
      } catch (failure) {
        error = failure.name;
      }
      samples.push({
        fixtureId,
        index,
        warmup: index === 0,
        startMs: start,
        endMs: endMs ?? performance.now(),
        status,
        httpStatus,
        error,
      });
    }
  }
} finally {
  if (companyId) {
    const rows = await db.attachment.findMany({
      where: { companyId },
      select: { id: true },
    });
    cleanup = await createReceiptService(
      db,
      configuredReceiptStorage(),
    ).cleanup(
      new Date(Date.now() + 86400001),
      rows.map((r) => r.id),
    );
    assert.equal(cleanup.failed, 0);
    assert.equal(await db.attachment.count({ where: { companyId } }), 0);
  }
  if (userId) await db.user.delete({ where: { id: userId } });
  if (companyId) await db.company.delete({ where: { id: companyId } });
  await db.$disconnect();
  const environment = {
    runId,
    os: platform(),
    release: release(),
    arch: arch(),
    node: process.version,
    sharp: sharp.versions.sharp,
    transport:
      "loopback HTTP, Next development, raw body, local private filesystem",
    clock: "Node performance.now",
    boundary:
      "fetch start to parsed upload response; local byte verification excluded",
    nativePickerSamples: 0,
    cameraSamples: 0,
    bridgeAckSamples: 0,
    warmupPerFixture: 1,
    measuredPerFixture: 10,
    fixtures,
    cleanup,
  };
  await writeFile(
    `docs/metrics/environments/${runId}.json`,
    JSON.stringify(environment, null, 2) + "\n",
  );
  await writeFile(
    `docs/metrics/raw/${runId}.json`,
    JSON.stringify(
      {
        runId,
        samples: samples.map((s) => ({ ...s, elapsedMs: s.endMs - s.startMs })),
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify({
      runId,
      attempts: samples.length,
      success: samples.filter((s) => s.status === "success").length,
      cleanup,
    }),
  );
}
assert.equal(samples.filter((s) => s.status === "success").length, 22);
