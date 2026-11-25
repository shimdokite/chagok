// Run from the repository root with Node 24 and the local development DB.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (error) {
      if (error.code !== "ERR_MODULE_NOT_FOUND" || !specifier.startsWith("."))
        throw error;
      return next(specifier + ".ts", context);
    }
  },
});
const { assertLocalDatabase } = await import("../src/benefits/seed.ts");
const { createAuthService } = await import("../src/auth/service.ts");
const { prismaAuthStore } = await import("../src/auth/store.ts");
const {
  appRouter,
  configuredReceiptStorage,
  createApiContext,
  createReceiptService,
  getDb,
} = await import("@chagok/api");
const { POST } =
  await import("../../../apps/web/src/app/api/receipts/route.ts");
assertLocalDatabase(process.env.DATABASE_URL);
assert.equal(
  process.env.RECEIPT_STORAGE,
  "supabase",
  "Select RECEIPT_STORAGE=supabase",
);
const storage = configuredReceiptStorage();
const origin = new URL(storage.location).origin;
const db = getDb();
const service = createReceiptService(db, storage);
const runId = "supabase-receipts-" + randomUUID();
const usedOn = new Date().toISOString().slice(0, 10);
const samples = [];
const ids = [];
const checks = {};
let userId;
let companyId;

async function storageRequest(path, options = {}, authenticated = true) {
  const headers = new Headers(options.headers);
  if (authenticated) headers.set("apikey", process.env.SUPABASE_SECRET_KEY);
  return fetch(origin + "/storage/v1/" + path, {
    ...options,
    headers,
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
}

async function ensurePrivateBucket() {
  let response = await storageRequest("bucket/receipts");
  if (!response.ok) {
    const error = await response.json();
    assert.ok(
      [400, 404].includes(response.status) &&
        (error.code === "NoSuchBucket" || error.message === "Bucket not found"),
      "Cannot inspect receipts bucket",
    );
    const created = await storageRequest("bucket", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: "receipts",
        name: "receipts",
        public: false,
        file_size_limit: 10485760,
        allowed_mime_types: ["image/jpeg", "image/png"],
      }),
    });
    assert.ok(
      created.ok,
      "Cannot create receipts bucket: HTTP " + created.status,
    );
    response = await storageRequest("bucket/receipts");
  }
  assert.ok(response.ok);
  const bucket = await response.json();
  assert.equal(bucket.id, "receipts");
  assert.equal(
    bucket.public,
    false,
    "Expected a private bucket; existing bucket was left untouched",
  );
}

async function readObject(id) {
  const response = await storageRequest("object/authenticated/receipts/" + id);
  assert.ok(response.ok, "Authenticated read failed: HTTP " + response.status);
  return Buffer.from(await response.arrayBuffer());
}

async function verify() {
  await ensurePrivateBucket();
  checks.privateBucket = true;
  const auth = createAuthService({
    store: prismaAuthStore(db),

    verifyGoogle: async () => ({ sub: runId }),
  });
  const login = await auth.signIn("synthetic");
  userId = login.user.id;
  const company = await db.company.create({
    data: {
      slug: runId,
      name: "Supabase receipt QA",
      isSample: true,
      memberships: { create: { userId } },
      policies: {
        create: {
          month: usedOn.slice(0, 7),
          allowance: 100,
          categories: ["식비"],
          guidance: "QA",
        },
      },
    },
  });
  companyId = company.id;
  const headers = {
    authorization: "Bearer " + login.token,
    "x-chagok-company": companyId,
  };
  for (const format of ["jpeg", "png"]) {
    const bytes = await readFile(
      `docs/metrics/fixtures/day-05/synthetic-${format}.${format}`,
    );
    for (let i = 0; i < 11; i++) {
      const req = new Request("http://localhost/api/receipts", {
        method: "POST",
        headers: { ...headers, "content-type": "image/" + format },
        body: bytes,
      });
      const start = performance.now();
      const response = await POST(req);
      const result = await response.json();
      samples.push({
        format,
        bytes: bytes.length,
        warmup: i === 0,
        elapsedMs: performance.now() - start,
        status: response.status,
      });
      assert.equal(response.status, 201, "Upload route rejected fixture");
      assert.equal(result.byteSize, bytes.length);
      ids.push(result.attachmentId);
      assert.ok(
        (await readObject(result.attachmentId)).equals(bytes),
        "Remote bytes differ",
      );
    }
  }
  checks.originalsMatched = ids.length;
  const kept = ids.at(-1);
  const anon = await storageRequest(
    "object/public/receipts/" + kept,
    {},
    false,
  );
  assert.ok(
    [400, 401, 403, 404].includes(anon.status),
    "Object readable without authorization or service unavailable",
  );
  checks.anonymousHttp = anon.status;
  const caller = appRouter.createCaller(
    createApiContext(new Request("http://localhost", { headers })),
  );
  await caller.benefits.create({
    requestId: randomUUID(),
    expectedCompanyId: companyId,
    attachmentId: kept,
    title: runId,
    usedOn,
    category: "식비",
    amount: 1,
  });
  assert.equal(
    await db.claim.count({ where: { companyId, userId, attachmentId: kept } }),
    1,
  );
  assert.equal(
    await db.attachment.count({
      where: { id: kept, state: "LINKED", storageLocation: storage.location },
    }),
    1,
  );
  assert.deepEqual(
    await service.cleanup(new Date(Date.now() + 86400001), ids),
    { deleted: ids.length - 1, failed: 0 },
  );
  for (const id of ids.slice(0, -1)) {
    const response = await storageRequest(
      "object/authenticated/receipts/" + id,
    );
    assert.ok([400, 404].includes(response.status), "Expected removed object");
    const error = await response.json();
    assert.ok(
      error.code === "NoSuchKey" || /object not found/i.test(error.message),
      "Expected missing object response",
    );
  }
  await readObject(kept);
  checks.unlinkedRemoved = ids.length - 1;
  checks.linkedPreserved = true;
}

async function removeFixtures() {
  if (companyId) {
    const rows = await db.attachment.findMany({
      where: { userId, companyId, storageLocation: storage.location },
      select: { id: true },
    });
    for (const row of rows) await storage.remove(row.id);
    await db.$transaction([
      db.claim.deleteMany({ where: { userId, companyId } }),
      db.attachment.deleteMany({
        where: { userId, companyId, storageLocation: storage.location },
      }),
      db.membership.deleteMany({ where: { userId, companyId } }),
      db.company.delete({ where: { id: companyId } }),
    ]);
  }
  if (userId) await db.user.delete({ where: { id: userId } });
}

try {
  await verify();
} finally {
  try {
    await removeFixtures();
    checks.fixtureCleanup = true;
  } finally {
    await db.$disconnect();
    const evidence = {
      runId,
      node: process.version,
      measuredAt: new Date().toISOString(),
      boundary:
        "Next POST invocation through local DB and remote Storage to parsed response; subsequent download excluded",
      samples,
      checks,
    };
    await writeFile(
      `docs/metrics/raw/${runId}.json`,
      JSON.stringify(evidence, null, 2) + "\n",
      { flag: "wx" },
    );
    console.log(JSON.stringify({ runId, samples: samples.length, checks }));
  }
}
