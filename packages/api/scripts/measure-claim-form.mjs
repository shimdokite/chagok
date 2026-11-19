// Node 24: node --env-file=apps/web/.env.local --experimental-transform-types packages/api/scripts/measure-claim-form.mjs
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
const origin = "http://127.0.0.1:3000";
const dir = "docs/verification/day-04-form";
mkdirSync(dir, { recursive: true });
const db = getDb();
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  locale: "ko-KR",
  timezoneId: "Asia/Seoul",
});
const page = await context.newPage();
const month = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 7);
const token = randomBytes(32).toString("hex");
const records = [];
const checks = [];
const cache = new QueryClient({
  defaultOptions: { queries: { staleTime: 30000, retry: false } },
});
let user;
let company;
let host;
let dropResult = false;
let creates = 0;
let lastRequestKey;
const sourceFiles = [
  "packages/contracts/src/bridge.ts",
  "apps/mobile/src/bridge/claim-host.ts",
  "apps/web/src/components/apply/form-client.ts",
  "apps/web/src/components/apply/ApplyForm.tsx",
  "apps/web/src/components/bridge/BridgeReceiver.tsx",
  "apps/web/src/app/apply/page.tsx",
  "packages/api/scripts/measure-claim-form.mjs",
];
const environment = {
  measuredAt: new Date().toISOString(),
  node: process.version,
  browser: browser.version(),
  platform: `${process.platform}/${process.arch}`,
  viewport: "390x844 CSS px",
  web: "Next development Turbopack",
  database: "local PostgreSQL",
  transport:
    "Chromium + actual ClaimHost via Node adapter + authenticated HTTP; NOT iOS WKWebView",
  clock: "web performance.now; navigationStart=0",
  condition:
    "1 warmup then 10 warm document navigations in same browser context; server already running",
  count: 10,
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

async function fill() {
  await page.locator("#amount").fill("1000");
  await page.locator("#description").fill("로컬 검증 신청");
}

try {
  // Anonymous preview remains visibly distinct and cannot write.
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
  host = new ClaimHost({
    origin,

    access: () => ({ scope: "isolated-measurement-session", mode: "live" }),

    send(message) {
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
      lastRequestKey = input.requestId;
      return api("create", input, true, signal);
    },

    invalidate: () => cache.invalidateQueries({ queryKey: ["benefits"] }),
  });
  await page.exposeFunction("__formHostSend", (data) =>
    host.receive(data, page.url()),
  );
  await page.addInitScript(() => {
    window.ReactNativeWebView = {
      postMessage: (data) => {
        void window.__formHostSend(data);
      },
    };
  });
  await openForm();
  await page.locator("#used-date").fill("2099-12-01");
  await page
    .getByText("선택한 사용월의 복지 정책이 없어요.", { exact: false })
    .waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "복지비 신청하기", exact: true })
      .isDisabled(),
    true,
  );
  await page.locator("#used-date").fill(`${month}-19`);
  await page.locator("#amount").waitFor({ state: "visible" });
  await page.waitForFunction(
    () =>
      !document.querySelector("#amount").disabled &&
      !document.querySelector("#amount").closest("fieldset").disabled,
  );
  await page.locator("#amount").fill("100001");
  await page.locator("#description").fill("로컬 검증");
  await page
    .getByRole("button", { name: "복지비 신청하기", exact: true })
    .click();
  assert.equal(creates, 0);
  await page.locator("#amount").fill("1000");
  await page.locator("#description").fill("   ");
  await page
    .getByRole("button", { name: "복지비 신청하기", exact: true })
    .click();
  await page.getByRole("alert").filter({ hasText: "사용일, 항목" }).waitFor();
  assert.equal(creates, 0);
  checks.push(
    "missing policy, excess amount, whitespace title rejected before create",
  );

  for (let i = 0; i < 11; i++) {
    const sample = {
      index: i,
      warmup: i === 0,
      measuredAt: new Date().toISOString(),
      status: "failure",
      formReadyMs: null,
      submitStartedMs: null,
      submitEndedMs: null,
      submitDurationMs: null,
    };
    records.push(sample);
    try {
      await openForm();
      sample.formReadyMs = await page.evaluate(
        () => performance.getEntriesByName("chagok:form-ready")[0].startTime,
      );
      await cache.fetchQuery({
        queryKey: ["benefits", "home"],

        queryFn: () => api("home", { month }),
      });
      await cache.fetchQuery({
        queryKey: ["benefits", "history"],

        queryFn: () => api("history", { month }),
      });
      await fill();
      await page
        .getByRole("button", { name: "복지비 신청하기", exact: true })
        .click();
      await page.getByText("신청이 완료됐어요.", { exact: true }).waitFor();
      sample.submitStartedMs = await page.evaluate(
        () => performance.getEntriesByName("chagok:claim-submit")[0].startTime,
      );
      sample.submitEndedMs = await page.evaluate(
        () => performance.getEntriesByName("chagok:claim-success")[0].startTime,
      );
      sample.submitDurationMs = sample.submitEndedMs - sample.submitStartedMs;
      assert.equal(
        cache.getQueryState(["benefits", "home"]).isInvalidated,
        true,
      );
      const home = await cache.fetchQuery({
        queryKey: ["benefits", "home"],

        queryFn: () => api("home", { month }),
      });
      const history = await cache.fetchQuery({
        queryKey: ["benefits", "history"],

        queryFn: () => api("history", { month }),
      });
      assert.equal(home.amounts.available, 100000 - (i + 1) * 1000);
      assert.equal(history.items.length, i + 1);
      assert.equal(await db.claim.count({ where: { userId: user.id } }), i + 1);
      sample.status = "success";
      if (i === 10)
        await page.screenshot({
          path: `${dir}/success-390.png`,
          fullPage: true,
        });
    } catch (error) {
      sample.status = error.name === "TimeoutError" ? "timeout" : "failure";
      throw error;
    }
  }
  checks.push(
    "11 real saves (1 warmup + 10 samples), home/history cache invalidated and real HTTP/DB verified",
  );
  await openForm();
  await fill();
  dropResult = true;
  await page
    .getByRole("button", { name: "복지비 신청하기", exact: true })
    .click();
  await page
    .getByRole("button", { name: "같은 신청 결과 다시 확인" })
    .waitFor({ timeout: 16000 });
  const key = lastRequestKey;
  assert.equal(await db.claim.count({ where: { userId: user.id } }), 12);
  await page.screenshot({ path: `${dir}/uncertain-390.png`, fullPage: true });
  dropResult = false;
  await page.getByRole("button", { name: "같은 신청 결과 다시 확인" }).click();
  await page.getByText("신청이 완료됐어요.", { exact: true }).waitFor();
  assert.equal(lastRequestKey, key);
  assert.equal(await db.claim.count({ where: { userId: user.id } }), 12);
  checks.push(
    "lost result: actual DB commit, client 12s timeout, same UUID retry, still 12 rows",
  );
  records.push(
    {
      scenario: "lost-result-first-attempt",
      status: "timeout",
      reason:
        "test intentionally dropped committed result; separate from warm series",
    },
    {
      scenario: "lost-result-retry",
      status: "success",
      reason: "same UUID, no new row",
    },
  );
  await openForm();
  await fill();
  await db.session.updateMany({
    where: { userId: user.id },
    data: { expiresAt: new Date(0) },
  });
  await page
    .getByRole("button", { name: "복지비 신청하기", exact: true })
    .click();
  await page.getByText("로그인이 만료됐어요.", { exact: false }).waitFor();
  assert.equal(await db.claim.count({ where: { userId: user.id } }), 12);
  checks.push(
    "actual expired DB session rejected with visible error; no new row",
  );
} finally {
  host?.reset();
  cache.clear();
  await browser.close();
  if (user) await db.user.delete({ where: { id: user.id } });
  if (company) await db.company.delete({ where: { id: company.id } });
  await db.$disconnect();
  const values = records.filter(
    (s) => s.status === "success" && s.warmup === false,
  );

  const summary = (key) => {
    const sorted = values.map((s) => s[key]).sort((a, b) => a - b);
    return {
      n: sorted.length,
      medianMs: sorted.length
        ? (sorted[Math.floor((sorted.length - 1) / 2)] +
            sorted[Math.floor(sorted.length / 2)]) /
          2
        : null,
      minMs: sorted[0] ?? null,
      maxMs: sorted.at(-1) ?? null,
    };
  };

  mkdirSync("docs/metrics/environments", { recursive: true });
  writeFileSync(
    "docs/metrics/environments/day-04-form.json",
    `${JSON.stringify(environment, null, 2)}\n`,
  );
  const report = {
    environment: "../environments/day-04-form.json",
    records,
    summary: {
      formReady: summary("formReadyMs"),
      submit: summary("submitDurationMs"),
    },
    checks,
    fixtureCleaned: true,
  };
  writeFileSync(
    "docs/metrics/raw/day-04-form.json",
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(
    JSON.stringify(
      {
        checks,
        samples: records.length,
        summary: report.summary,
        fixtureCleaned: true,
      },
      null,
      2,
    ),
  );
}
