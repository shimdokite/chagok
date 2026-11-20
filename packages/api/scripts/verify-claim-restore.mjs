// Node 24, production Next :3100: DAY04_WEB_ORIGIN=http://127.0.0.1:3100 node --env-file=apps/web/.env.local --experimental-transform-types packages/api/scripts/verify-claim-restore.mjs
import assert from "node:assert/strict";
import { randomBytes, createHash, randomUUID } from "node:crypto";
import { registerHooks } from "node:module";
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { QueryClient } from "@tanstack/react-query";

// Resolve the repository's extensionless TS imports without generating files.
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
const { ClaimHost } =
  await import("../../../apps/mobile/src/bridge/claim-host.ts");
const { getDb } = await import("../src/auth/store.ts");
const { assertLocalDatabase } = await import("../src/benefits/seed.ts");
assertLocalDatabase(process.env.DATABASE_URL);
const origin = process.env.DAY04_WEB_ORIGIN ?? "http://127.0.0.1:3000";
const artifact = process.env.DAY04_RESTORE_ARTIFACT ?? "day-04-followup";
assert.match(artifact, /^day-04-[a-z0-9-]+$/);
const dir = `docs/verification/${artifact}`;
mkdirSync(dir, { recursive: true });
const db = getDb();
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  ignoreDefaultArgs: ["--disable-back-forward-cache"],
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  locale: "ko-KR",
  timezoneId: "Asia/Seoul",
});
const page = await context.newPage();
const month = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 7);
const token = randomBytes(32).toString("hex");
let completed = false;
const checks = [];
const trace = [];
const cache = new QueryClient({
  defaultOptions: { queries: { staleTime: 30000, retry: false } },
});
let user;
let company;
let host;
let dropResult = false;
let creates = 0;
const sourceFiles = [
  "packages/contracts/src/bridge.ts",
  "apps/mobile/src/bridge/claim-host.ts",
  "apps/web/src/components/apply/form-client.ts",
  "apps/web/src/components/apply/ApplyForm.tsx",
  "apps/web/src/components/bridge/BridgeReceiver.tsx",
  "apps/web/src/app/apply/page.tsx",
  "packages/api/scripts/verify-claim-restore.mjs",
];
const environment = {
  measuredAt: new Date().toISOString(),
  node: process.version,
  browser: browser.version(),
  platform: `${process.platform}/${process.arch}`,
  viewport: "390x844 CSS px",
  web: process.env.DAY04_WEB_ORIGIN
    ? "Next production webpack"
    : "Next development Turbopack",
  database: "local PostgreSQL",
  transport:
    "Chromium + actual ClaimHost via Node adapter + authenticated HTTP; NOT iOS WKWebView",
  clock: "web performance.now; navigationStart=0",
  condition: "actual history navigation; no synthetic pageshow; local server",
  count: 2,
  source: Object.fromEntries(
    sourceFiles.map((file) => [
      file,
      createHash("sha256").update(readFileSync(file)).digest("hex"),
    ]),
  ),
};

async function api(name, input, mutation = false, signal) {
  const url = `${origin}/api/trpc/benefits.${name}${mutation ? "" : `?input=${encodeURIComponent(JSON.stringify(input))}`}`;
  const response = await fetch(url, {
    method: mutation ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: mutation ? JSON.stringify(input) : undefined,
    signal,
  });
  const body = await response.json();
  if (!response.ok)
    throw { data: { code: body.error?.data?.code ?? "UNKNOWN" } };
  return body.result.data;
}

async function openForm() {
  host.reset();
  await page.goto(`${origin}/apply`);
  await page.waitForFunction(
    () => performance.getEntriesByName("chagok:form-ready").length > 0,
  );
}

try {
  // Anonymous preview and real keyboard events are checked separately from native UI.
  await page.goto(`${origin}/apply`);
  await page.getByText("입력 미리보기예요.", { exact: false }).waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "복지비 신청하기", exact: true })
      .isDisabled(),
    true,
  );
  await page.setViewportSize({ width: 320, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.screenshot({ path: `${dir}/preview-320.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  checks.push("anonymous preview disabled; 320px no horizontal overflow");
  company = await db.company.create({
    data: {
      slug: `form-measure-${randomUUID()}`,
      name: "실측용 가상 회사",
      isSample: true,
    },
  });
  user = await db.user.create({
    data: {
      googleSub: `form-measure:${randomUUID()}`,
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
      guidance: "격리된 로컬 측정",
    },
  });
  if (process.env.DAY04_RESTORE_FAULT === "closed-page") {
    await page.close();
    throw new Error("Injected page closure before cleanup");
  }
  host = new ClaimHost({
    origin,

    access: () => ({ scope: "isolated-measurement-session", mode: "live" }),

    send(message) {
      trace.push({
        direction: "native-to-web",
        type: message.type,
        code: message.type === "FORM_ERROR" ? message.payload.code : undefined,
      });
      if (dropResult && message.type === "CLAIM_RESULT") return;
      void page
        .evaluate((value) => window.__CHAGOK_BRIDGE__?.receive(value), message)
        .catch(() => {});
    },

    async load(month, signal) {
      const home = await api("home", { month }, false, signal);
      if (home.kind !== "ready") return { kind: home.kind, month };
      return {
        kind: "ready",
        month,
        companyName: home.company.name,
        categories: home.policy.categories,
        available: home.amounts.available,
      };
    },

    async create(input, signal) {
      creates++;
      return api("create", input, true, signal);
    },

    invalidate: () => cache.invalidateQueries({ queryKey: ["benefits"] }),
  });
  await page.exposeFunction("__formHostSend", (data, url) => {
    trace.push({ direction: "web-to-native", type: JSON.parse(data).type });
    return host.receive(data, url);
  });
  await page.addInitScript(() => {
    window.ReactNativeWebView = {
      postMessage: (data) => {
        void window.__formHostSend(data, location.href);
      },
    };
  });
  await page.addInitScript(() => {
    window.__restoreEvents = [];
    window.addEventListener("pageshow", (event) =>
      window.__restoreEvents.push({
        type: "pageshow",
        persisted: event.persisted,
      }),
    );
    window.addEventListener("pagehide", (event) =>
      window.__restoreEvents.push({
        type: "pagehide",
        persisted: event.persisted,
      }),
    );
  });
  const cdp = await context.newCDPSession(page);
  await cdp.send("Page.enable");
  const missed = [];
  cdp.on("Page.backForwardCacheNotUsed", (event) => missed.push(event));
  await openForm();
  await page.locator("#amount").pressSequentially("1000");
  await page
    .locator("#description")
    .pressSequentially("Keyboard restore check");
  assert.equal(await page.locator("#amount").inputValue(), "1000");
  assert.equal(
    await page.locator("#description").inputValue(),
    "Keyboard restore check",
  );
  await page.goto("about:blank");
  host.reset();
  await page.goBack({ waitUntil: "commit" });
  await page.waitForTimeout(1500);
  const readyEvents = await page.evaluate(() => window.__restoreEvents);
  const readyRestored = readyEvents.some(
    (e) => e.type === "pageshow" && e.persisted,
  );
  checks.push({
    name: "ready-history-return",
    persisted: readyRestored,
    events: readyEvents,
    notRestored: missed.splice(0),
  });
  assert.ok(
    readyRestored,
    "Browser must actually restore from BFCache to claim coverage",
  );
  await page.waitForFunction(
    () => !document.querySelector("fieldset").disabled,
  );
  assert.equal(await page.locator("#amount").inputValue(), "1000");
  assert.equal(
    await page.locator("#description").inputValue(),
    "Keyboard restore check",
  );
  dropResult = true;
  await page
    .getByRole("button", { name: "복지비 신청하기", exact: true })
    .click();
  const deadline = Date.now() + 5000;
  while (
    (await db.claim.count({ where: { userId: user.id } })) !== 1 &&
    Date.now() < deadline
  )
    await page.waitForTimeout(50);
  assert.equal(await db.claim.count({ where: { userId: user.id } }), 1);
  await page.goto("about:blank");
  host.reset();
  await page.goBack({ waitUntil: "commit" });
  await page.waitForTimeout(1500);
  const pendingEvents = await page.evaluate(() => window.__restoreEvents);
  assert.ok(pendingEvents.some((e) => e.type === "pageshow" && e.persisted));
  await page.getByText("신청 내역", { exact: false }).first().waitFor();
  assert.ok(
    await page
      .getByRole("button", { name: "복지비 신청하기", exact: true })
      .isDisabled(),
  );
  assert.equal(await db.claim.count({ where: { userId: user.id } }), 1);
  checks.push({
    name: "pending-history-return",
    persisted: true,
    events: pendingEvents,
    claims: 1,
    resubmitDisabled: true,
  });
  await page.screenshot({
    path: `${dir}/bfcache-interrupted.png`,
    fullPage: true,
  });
  completed = true;
} finally {
  let fixtureCleaned = false;
  const cleanupErrors = [];
  try {
    checks.push({
      name: "diagnostics",
      creates,
      trace,
      status: await page
        .locator('[role="alert"], [role="status"]')
        .allTextContents(),
    });
  } catch {
    checks.push({
      name: "diagnostics",
      unavailable: "page closed or inaccessible",
    });
  }
  try {
    await browser.close();
  } catch {
    cleanupErrors.push("browser close failed");
  }
  try {
    if (user) await db.user.delete({ where: { id: user.id } });
  } catch {
    cleanupErrors.push("fixture user deletion failed");
  }
  try {
    if (company) await db.company.delete({ where: { id: company.id } });
    fixtureCleaned = !cleanupErrors.includes("fixture user deletion failed");
  } catch {
    cleanupErrors.push("fixture company deletion failed");
  }
  try {
    await db.$disconnect();
  } catch {
    cleanupErrors.push("database disconnect failed");
  }
  writeFileSync(
    `${dir}/restore.json`,
    JSON.stringify(
      { environment, checks, completed, fixtureCleaned, cleanupErrors },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify({ completed, fixtureCleaned, cleanupErrors, checks }),
  );
  if (cleanupErrors.length)
    throw new Error("Restore verification cleanup failed; see artifact");
}
