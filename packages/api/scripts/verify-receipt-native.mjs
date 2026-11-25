// Native File + expo/fetch smoke/measurement. Does NOT automate the picker UI or change the user's session.
// node --env-file=apps/web/.env.local --experimental-transform-types packages/api/scripts/verify-receipt-native.mjs
import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { copyFile, readFile, writeFile, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { registerHooks } from "node:module";
import { join } from "node:path";
import WebSocket from "ws";

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
const targets = await (await fetch("http://127.0.0.1:8081/json/list")).json();
const target = targets.find((t) => t.deviceName === "iPhone 17");
assert.ok(target, "iPhone 17 running app required");
const socket = new WebSocket(target.webSocketDebuggerUrl, {
  origin: "http://127.0.0.1:8081",
  perMessageDeflate: false,
});
await new Promise((resolve, reject) => {
  socket.once("open", resolve);
  socket.once("error", reject);
});
let sequence = 0;
const pending = new Map();
socket.on("message", (data) => {
  const message = JSON.parse(data.toString());
  pending.get(message.id)?.(message);
});

async function evaluate(expression) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error("Native observer timeout"));
    }, 45000);
    pending.set(id, (message) => {
      clearTimeout(timer);
      pending.delete(id);
      if (message.error || message.result?.exceptionDetails)
        reject(new Error("Native test failed; sensitive details omitted"));
      else resolve(message.result.result?.value);
    });
    socket.send(
      JSON.stringify({
        id,
        method: "Runtime.evaluate",
        params: { expression, returnByValue: true, awaitPromise: true },
      }),
    );
  });
}

const db = getDb();
const files = [];
const events = [];
const runId = `day05-native-${Date.now()}`;
let userId;
let companyId;
let cleanup;
try {
  const modules = JSON.parse(
    await evaluate(
      'JSON.stringify(Array.from(__r.getModules()).filter(([id,m])=>/receipts\\/upload|expo-file-system\\/(src|build)\\/(index|FileSystem)|expo\\/(src|build)\\/.*fetch/.test(m.verboseName||" ")).map(([id,m])=>({id,name:m.verboseName})))',
    ),
  );
  console.log(JSON.stringify({ modules }));

  const moduleId = (pattern) => {
    const entry = modules.find((m) => pattern.test(m.name));
    assert.ok(entry, `Required module: ${pattern}`);
    return entry.id;
  };

  const upload = moduleId(/receipts\/upload\.ts$/);
  const filesystem = moduleId(
    /expo-file-system\/(src|build)\/(index|FileSystem)\.(ts|js)$/,
  );
  const http = moduleId(/expo\/(src|build)\/.*fetch\/index\.(ts|js)$/);
  const container = execFileSync(
    "/usr/bin/xcrun",
    [
      "simctl",
      "get_app_container",
      "ECA59080-35A7-42E0-BE0C-7E4C4A4BEFEA",
      "dev.doyeon.chagok",
      "data",
    ],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        DEVELOPER_DIR: "/Applications/Xcode.app/Contents/Developer",
      },
    },
  ).trim();
  const token = randomBytes(32).toString("hex");
  const company = await db.company.create({
    data: { slug: runId, name: "Native upload fixture", isSample: true },
  });
  companyId = company.id;
  const user = await db.user.create({
    data: {
      googleSub: runId,
      membership: { create: { companyId } },
      sessions: {
        create: {
          tokenHash: createHash("sha256").update(token).digest("hex"),
          expiresAt: new Date(Date.now() + 600000),
        },
      },
    },
  });
  userId = user.id;
  for (const format of ["jpeg", "png"]) {
    const source = `docs/metrics/fixtures/day-05/synthetic-${format}.${format}`;
    const bytes = await readFile(source);
    const local = join(container, "tmp", `${runId}-${randomUUID()}.${format}`);
    files.push(local);
    await copyFile(source, local);
    for (let index = 0; index < 11; index++) {
      await evaluate(`globalThis.__day05NativeResult=null;(async()=>{
        const file=new (__r(${filesystem}).File)(${JSON.stringify(`file://${local}`)});
        const start=performance.now();
        try {
          const receipt=await __r(${upload}).uploadReceipt(file,{mimeType:${JSON.stringify(`image/${format}`)},byteSize:file.size},${JSON.stringify(companyId)},new AbortController().signal,{origin:'http://127.0.0.1:3000',token:async()=>${JSON.stringify(token)},fetch:__r(${http}).fetch});
          return JSON.stringify({status:'success',startMs:start,endMs:performance.now(),byteSize:receipt.byteSize,attachmentId:receipt.attachmentId});
        }catch(error){return JSON.stringify({status:'failure',startMs:start,endMs:performance.now(),code:error?.code||error?.name});}
      })().then(value=>{globalThis.__day05NativeResult=value;});true`);
      let result;
      const deadline = Date.now() + 40000;
      while (Date.now() < deadline) {
        result = await evaluate("globalThis.__day05NativeResult");
        if (typeof result === "string") break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      assert.equal(
        typeof result,
        "string",
        "Native promise must settle before measurement",
      );
      const record = JSON.parse(result);
      const { attachmentId, ...sample } = record;
      events.push({
        ...sample,
        format,
        index,
        warmup: index === 0,
        elapsedMs: sample.endMs - sample.startMs,
      });
      if (record.status === "success")
        assert.deepEqual(
          await readFile(join(process.env.RECEIPT_LOCAL_DIR, attachmentId)),
          bytes,
        );
    }
  }
} finally {
  for (const file of files) await rm(file, { force: true });
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
  await evaluate("delete globalThis.__day05NativeResult; true").catch(
    () => undefined,
  );
  socket.close();
  await db.$disconnect();
  await writeFile(
    `docs/metrics/raw/${runId}.json`,
    JSON.stringify(
      {
        runId,
        events,
        cleanup,
        environment:
          "iPhone 17 iOS27.2 Simulator Debug, Hermes performance.now, real File and expo/fetch, local HTTP server",
        pickerSamples: 0,
        cameraSamples: 0,
        originalSessionUnchanged: true,
        boundary:
          "uploadReceipt start to response validation, file byte verification excluded",
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify({
      runId,
      samples: events.length,
      success: events.filter((e) => e.status === "success").length,
      cleanup,
    }),
  );
}
assert.equal(events.filter((e) => e.status === "success").length, 22);
