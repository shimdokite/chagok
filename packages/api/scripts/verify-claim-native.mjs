// Local iOS Debug verification; Metro :8081, Next :3000, existing simulator app.
// node --env-file=apps/web/.env.local --experimental-transform-types packages/api/scripts/verify-claim-native.mjs
import assert from "node:assert/strict";
import { randomBytes, createHash, randomUUID } from "node:crypto";
import { registerHooks } from "node:module";
import { writeFileSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
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
assertLocalDatabase(process.env.DATABASE_URL);
const targets = await (await fetch("http://127.0.0.1:8081/json/list")).json();
const target = targets.find((item) => item.deviceName === "iPhone 17");
assert.ok(target, "Booted iPhone 17 app required");
const devices = JSON.parse(
  execFileSync(
    "/usr/bin/xcrun",
    ["simctl", "list", "devices", "booted", "--json"],
    {
      env: {
        ...process.env,
        DEVELOPER_DIR: "/Applications/Xcode.app/Contents/Developer",
      },
    },
  ),
);
const device = Object.values(devices.devices)
  .flat()
  .find((item) => item.name === "iPhone 17");
assert.ok(device);
const socket = new WebSocket(target.webSocketDebuggerUrl, {
  origin: "http://127.0.0.1:8081",
  perMessageDeflate: false,
});

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

await new Promise((resolve, reject) => {
  socket.once("open", resolve);
  socket.once("error", reject);
});
// Allow the device-side inspector session to attach before the first command.
await wait(300);
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
      reject(new Error("Native inspector timeout"));
    }, 12000);
    pending.set(id, (message) => {
      clearTimeout(timer);
      pending.delete(id);
      if (message.error || message.result?.exceptionDetails)
        reject(
          new Error(
            "Native evaluation failed (details omitted to protect session)",
          ),
        );
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

async function until(expression) {
  const start = Date.now();
  while (Date.now() - start < 20000) {
    if (await evaluate(expression)) return;
    await wait(100);
  }
  throw new Error("Native condition timeout");
}

function launch(bundle) {
  execFileSync("/usr/bin/xcrun", ["simctl", "launch", device.udid, bundle], {
    env: {
      ...process.env,
      DEVELOPER_DIR: "/Applications/Xcode.app/Contents/Developer",
    },
    stdio: "ignore",
  });
}

const modules = JSON.parse(
  await evaluate(
    `JSON.stringify(Array.from(__r.getModules()).filter(([id,m])=>/src\\/auth\\/storage|src\\/bridge\\/useClaimHost|expo-router.*exports/.test(m.verboseName||"")).map(([id,m])=>({id,name:m.verboseName})))`,
  ),
);
const storage = modules.find((m) => m.name === "src/auth/storage.ts").id;
const hook = modules.find((m) => m.name === "src/bridge/useClaimHost.ts").id;
const router = modules.find((m) => m.name.includes("expo-router")).id;
const db = getDb();
const month = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 7);
const token = randomBytes(32).toString("hex");
const records = [];
let user;
let company;
let prepared = false;
let restored = false;

async function inject(script) {
  await evaluate(
    `__day04.ref.current.injectJavaScript(${JSON.stringify(`${script}; true;`)}); true`,
  );
}

try {
  company = await db.company.create({
    data: {
      slug: `native-form-${randomUUID()}`,
      name: "iOS 검증용 가상 회사",
      isSample: true,
    },
  });
  user = await db.user.create({
    data: {
      googleSub: `native-form:${randomUUID()}`,
      membership: { create: { companyId: company.id } },
      sessions: {
        create: {
          tokenHash: createHash("sha256").update(token).digest("hex"),
          expiresAt: new Date(Date.now() + 30 * 60000),
        },
      },
    },
  });
  await db.benefitPolicy.create({
    data: {
      companyId: company.id,
      month,
      allowance: 100000,
      categories: ["식비", "도서비"],
      guidance: "격리된 iOS 검증",
    },
  });
  prepared = true;
  await evaluate(`(async()=>{
    const storage=__r(${storage}).storage;
    globalThis.__day04={previous:await storage.get(),events:[],ref:null,started:null,original:__r(${hook}).useClaimHost};
    await storage.set(${JSON.stringify(token)});
    const original=__day04.original;
    __r(${hook}).useClaimHost=function(ref){
      const host=original(ref); __day04.ref=ref;
      if(!host.__day04Observed){
        host.__day04Observed=true;
        const reset=host.reset.bind(host), receive=host.receive.bind(host);
        host.reset=function(){ __day04.started=performance.now(); return reset(); };
        host.receive=function(value,url){
          let m;try{m=typeof value==='string'?JSON.parse(value):value;}catch{}
          if(m?.type==='FORM_READY')__day04.events.push({kind:'ready',start:__day04.started,end:performance.now()});
          if(m?.type==='PING'&&m.requestId.startsWith('d4:'))__day04.events.push({kind:'web',...JSON.parse(m.requestId.slice(3))});
          return receive(value,url);
        };
      }
      return host;
    };
    __day04.prepared=true; return true;
  })()`);
  await until(`globalThis.__day04?.prepared===true`);
  launch("com.apple.Preferences");
  await wait(500);
  launch("dev.doyeon.chagok");
  await wait(1200);
  await evaluate(`__r(${router}).router.replace('/home'); true`);
  await wait(500);
  for (let i = 0; i < 11; i++) {
    const record = {
      index: i,
      warmup: i === 0,
      status: "failure",
      measuredAt: new Date().toISOString(),
    };
    records.push(record);
    await evaluate(
      `__day04.events=[]; __r(${router}).router.push('/apply'); true`,
    );
    await until(`__day04.events.some(e=>e.kind==='ready')`);
    const ready = JSON.parse(
      await evaluate(
        `JSON.stringify(__day04.events.find(e=>e.kind==='ready'))`,
      ),
    );
    assert.ok(ready.start !== null);
    record.nativeLoadStartMs = ready.start;
    record.nativeFormReadyMs = ready.end;
    record.formReadyDurationMs = ready.end - ready.start;
    if (i === 0)
      execFileSync(
        "/usr/bin/xcrun",
        [
          "simctl",
          "io",
          device.udid,
          "screenshot",
          "docs/verification/day-04-form/ios-ready.png",
        ],
        {
          env: {
            ...process.env,
            DEVELOPER_DIR: "/Applications/Xcode.app/Contents/Developer",
          },
          stdio: "ignore",
        },
      );
    await inject(
      `(()=>{for(const [id,value] of [['amount','1000'],['description','iOS 로컬 검증']]){const input=document.getElementById(id);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));} })()`,
    );
    await wait(150);
    await inject(`document.querySelector('form').requestSubmit()`);
    await inject(
      `(()=>{const timer=setInterval(()=>{const end=performance.getEntriesByName('chagok:claim-success')[0];if(!end)return;clearInterval(timer);const start=performance.getEntriesByName('chagok:claim-submit')[0];window.ReactNativeWebView.postMessage(JSON.stringify({channel:'chagok.bridge',version:1,type:'PING',payload:{},requestId:'d4:'+JSON.stringify({s:start.startTime,e:end.startTime})}));},50);setTimeout(()=>clearInterval(timer),15000);})()`,
    );
    await until(`__day04.events.some(e=>e.kind==='web')`);
    const web = JSON.parse(
      await evaluate(`JSON.stringify(__day04.events.find(e=>e.kind==='web'))`),
    );
    record.webSubmitStartMs = web.s;
    record.webSubmitEndMs = web.e;
    record.submitDurationMs = web.e - web.s;
    assert.equal(await db.claim.count({ where: { userId: user.id } }), i + 1);
    record.status = "success";
    if (i === 10)
      execFileSync(
        "/usr/bin/xcrun",
        [
          "simctl",
          "io",
          device.udid,
          "screenshot",
          "docs/verification/day-04-form/ios-success.png",
        ],
        {
          env: {
            ...process.env,
            DEVELOPER_DIR: "/Applications/Xcode.app/Contents/Developer",
          },
          stdio: "ignore",
        },
      );
    await evaluate(`__r(${router}).router.back(); true`);
    await wait(250);
  }
  // Native cache refresh is visible after returning to the mounted home.
  execFileSync(
    "/usr/bin/xcrun",
    [
      "simctl",
      "io",
      device.udid,
      "screenshot",
      "docs/verification/day-04-form/ios-home.png",
    ],
    {
      env: {
        ...process.env,
        DEVELOPER_DIR: "/Applications/Xcode.app/Contents/Developer",
      },
      stdio: "ignore",
    },
  );
} catch (error) {
  const last = records.at(-1);
  if (last && last.status !== "success")
    last.status = /timeout/i.test(error.message) ? "timeout" : "failure";
  throw error;
} finally {
  let cleanupError;
  let fixtureCleaned = false;
  try {
    if (prepared) {
      await evaluate(
        `globalThis.__day04Cleanup=false;(async()=>{if(!globalThis.__day04){globalThis.__day04Cleanup=true;return;}__r(${hook}).useClaimHost=__day04.original;__r(${router}).router.replace('/home');if(__day04.previous)await __r(${storage}).storage.set(__day04.previous);else await __r(${storage}).storage.remove();if(await __r(${storage}).storage.get()!==__day04.previous)return;delete globalThis.__day04;globalThis.__day04Cleanup=true;})()`,
      );
      await until(`globalThis.__day04Cleanup===true`);
      restored = true;
      await evaluate(`delete globalThis.__day04Cleanup; true`);
      launch("com.apple.Preferences");
      await wait(300);
      launch("dev.doyeon.chagok");
    }
  } catch {
    cleanupError = new Error(
      "Native cleanup could not be confirmed; test session will be revoked in DB",
    );
  }
  socket.close();
  try {
    if (user) await db.user.delete({ where: { id: user.id } });
    if (company) await db.company.delete({ where: { id: company.id } });
    fixtureCleaned = true;
  } catch {
    cleanupError = new Error("Fixture cleanup could not be confirmed");
  } finally {
    await db.$disconnect();
  }
  const environment = {
    measuredAt: new Date().toISOString(),
    platform: "iOS 27.2 Simulator iPhone 17",
    app: "existing Debug development client + current Metro bundle",
    web: "Next development Turbopack",
    database: "local PostgreSQL, isolated real DB session",
    formClock: "RN performance.now on actual load reset to received FORM_READY",
    submitClock:
      "WebView performance.now submit handler to success effect; different clock from RN, no clock subtraction across runtimes",
    input:
      "debugger-triggered native router and injected DOM events, actual RN WebView/host/HTTP/DB; not manual taps",
    conditions: "1 warmup then 10 warm opens; server already running",
    source: Object.fromEntries(
      [
        "apps/mobile/src/bridge/useClaimHost.ts",
        "apps/mobile/src/bridge/claim-host.ts",
        "apps/mobile/src/components/ApplyContainer.tsx",
        "apps/web/src/components/apply/ApplyForm.tsx",
        "packages/api/scripts/verify-claim-native.mjs",
      ].map((file) => [
        file,
        createHash("sha256").update(readFileSync(file)).digest("hex"),
      ]),
    ),
  };
  writeFileSync(
    "docs/metrics/environments/day-04-native.json",
    `${JSON.stringify(environment, null, 2)}\n`,
  );
  writeFileSync(
    "docs/metrics/raw/day-04-native.json",
    `${JSON.stringify({ records, restored, fixtureCleaned }, null, 2)}\n`,
  );
  if (cleanupError) console.error(cleanupError.message);
  console.log(
    JSON.stringify({
      samples: records.length,
      success: records.filter((r) => r.status === "success").length,
      restored,
      fixtureCleaned,
    }),
  );
  if (cleanupError) throw cleanupError;
}
