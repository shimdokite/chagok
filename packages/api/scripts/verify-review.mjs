// Local-only Day 6 HTTP, browser and contention measurements with synthetic data.
// node --env-file=apps/web/.env.local --experimental-transform-types packages/api/scripts/verify-review.mjs
import assert from "node:assert/strict";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { registerHooks } from "node:module";
import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { platform, release, arch } from "node:os";

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE_PATH ?? "playwright"
);

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
const { createBenefitsService } = await import("../src/benefits/service.ts");
const { localReceiptStorage } = await import("../src/receipts/storage.ts");
assertLocalDatabase(process.env.DATABASE_URL);
const origin = "http://localhost:3000";
const dir = "docs/verification/day-06";
const runId = `day-06-${Date.now()}`;
const db = getDb();
const users = [];
const tokens = [];
const companies = [];
const samples = [];
const checks = [];
let receiptId;
let browser;
let failure;

async function api(token, body, query = "?month=2026-11") {
  const start = performance.now();
  const response = await fetch(`${origin}/api/admin${query}`, {
    method: body ? "POST" : "GET",
    headers: {
      cookie: `chagok_admin=${token}`,
      origin,
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  return {
    status: response.status,
    result,
    durationMs: performance.now() - start,
  };
}

async function claim(title, amount = 1000, attachmentId) {
  return db.claim.create({
    data: {
      userId: users[0],
      companyId: companies[0],
      title,
      category: "도서비",
      usedOn: "2026-11-27",
      amount,
      status: "SUBMITTED",
      attachmentId,
    },
  });
}

try {
  await mkdir(dir, { recursive: true });
  for (let i = 0; i < 4; i++) {
    const token = randomBytes(32).toString("hex");
    const user = await db.user.create({
      data: {
        googleSub: `${runId}-${i}`,
        sessions: {
          create: {
            tokenHash: createHash("sha256").update(token).digest("hex"),
            expiresAt: new Date(Date.now() + 3600000),
          },
        },
      },
    });
    users.push(user.id);
    tokens.push(token);
  }
  for (let i = 0; i < 2; i++)
    companies.push(
      (
        await db.company.create({
          data: {
            slug: `${runId}-${i}`,
            name: i ? "검증용 다른 회사" : "차곡 검증용 회사",
            isSample: true,
            policies: {
              create: {
                month: "2026-11",
                allowance: 100000,
                categories: ["도서비"],
                guidance: "합성 검증",
              },
            },
          },
        })
      ).id,
    );
  for (let i = 0; i < 4; i++)
    await db.membership.create({
      data: {
        userId: users[i],
        companyId: companies[i === 3 ? 1 : 0],
        role: i === 0 ? "EMPLOYEE" : "REVIEWER",
      },
    });
  assert.equal((await api("")).status, 401);
  assert.equal((await api(tokens[0])).status, 403);
  assert.equal((await api(tokens[1])).status, 200);
  checks.push("HTTP anonymous 401, employee 403, reviewer 200");
  const storage = localReceiptStorage(process.env.RECEIPT_LOCAL_DIR);
  const bytes = await readFile(
    "docs/metrics/fixtures/day-05/synthetic-png.png",
  );
  receiptId = randomUUID();
  await storage.put(receiptId, bytes, "image/png");
  await db.attachment.create({
    data: {
      id: receiptId,
      userId: users[0],
      companyId: companies[0],
      mimeType: "image/png",
      byteSize: bytes.length,
      state: "LINKED",
      storageLocation: "local",
    },
  });
  const proof = await claim("영수증 확인 후 승인", 15000, receiptId);
  const reject = await claim("사유를 전달할 반려 신청", 9000);
  const receiptUrl = `${origin}/api/admin?id=${proof.id}&receipt=1`;
  const receiptResponse = await fetch(receiptUrl, {
    headers: { cookie: `chagok_admin=${tokens[1]}` },
  });
  assert.equal(receiptResponse.status, 200);
  assert.equal(receiptResponse.headers.get("cache-control"), "no-store");
  assert.deepEqual(Buffer.from(await receiptResponse.arrayBuffer()), bytes);
  assert.equal(
    (
      await fetch(receiptUrl, {
        headers: { cookie: `chagok_admin=${tokens[3]}` },
      })
    ).status,
    404,
  );
  assert.equal((await fetch(receiptUrl)).status, 401);
  checks.push(
    "Authenticated receipt bytes equal original; cross-company 404; anonymous 401; no-store",
  );
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  await context.addCookies([
    {
      name: "chagok_admin",
      value: tokens[1],
      url: `${origin}/api/admin`,
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(`${origin}/admin`);
  await page.getByLabel("사용 월").fill("2026-11");
  await page
    .getByRole("heading", { name: "영수증 확인 후 승인", exact: true })
    .waitFor();
  let releaseImage;
  const imageGate = new Promise((resolve) => {
    releaseImage = resolve;
  });
  await page.route("**/api/admin*receipt=1", async (route) => {
    await imageGate;
    await route.continue();
  });
  await page
    .getByRole("article")
    .filter({ hasText: "영수증 확인 후 승인" })
    .getByRole("button", { name: "검토하기" })
    .click();
  await page.getByRole("button", { name: "승인하기", exact: true }).waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "승인하기", exact: true })
      .isDisabled(),
    true,
  );
  releaseImage();
  await page.waitForFunction(
    () =>
      !Array.from(document.querySelectorAll("button")).find(
        (b) => b.textContent === "승인하기",
      )?.disabled,
  );
  await page.screenshot({ path: `${dir}/admin-desktop.png`, fullPage: true });
  const benefits = createBenefitsService(db);
  const before = await benefits.home(users[0], "2026-11");
  await page.getByRole("button", { name: "승인하기", exact: true }).click();
  await page
    .getByText("승인했어요. 신청자의 사용 가능 한도는 그대로 유지돼요.")
    .waitFor();
  assert.equal(
    (await benefits.home(users[0], "2026-11")).amounts.available,
    before.amounts.available,
  );
  await page
    .getByRole("article")
    .filter({ hasText: "사유를 전달할 반려 신청" })
    .getByRole("button", { name: "검토하기" })
    .click();
  await page.getByLabel("반려 사유", { exact: true }).waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "반려하기", exact: true })
      .isDisabled(),
    true,
  );
  await page
    .getByLabel("반려 사유", { exact: true })
    .fill("사용일을 확인할 수 있는 영수증을 첨부해 주세요.");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${dir}/admin-mobile.png`, fullPage: true });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.getByRole("button", { name: "반려하기", exact: true }).click();
  await page
    .getByText("반려했어요. 신청자의 사용 가능 한도가 복원됐어요.")
    .waitFor();
  assert.equal(
    (await benefits.home(users[0], "2026-11")).amounts.available,
    before.amounts.available + 9000,
  );
  assert.equal(
    (await benefits.detail(users[0], reject.id)).claim.rejectionReason,
    "사용일을 확인할 수 있는 영수증을 첨부해 주세요.",
  );
  checks.push(
    "Browser receipt pending guard, approve, reason required, reject, balances, 390px overflow",
  );
  await page.emulateMedia({ colorScheme: "dark" });
  await page.screenshot({ path: `${dir}/admin-dark.png`, fullPage: true });
  await page.getByLabel("신청 상태").selectOption("SUBMITTED");
  await page.getByText("선택한 조건의 신청이 없어요.").waitFor();
  checks.push("Browser status filter and empty state");
  for (let i = 0; i < 10; i++) {
    const row = await claim(`동시 검토 ${i}`, 100);
    const input = { id: row.id, expectedCompanyId: companies[0] };
    const pair = await Promise.all([
      api(tokens[1], {
        action: "decide",
        input: { ...input, decision: "APPROVED" },
      }),
      api(tokens[2], {
        action: "decide",
        input: { ...input, decision: "REJECTED", reason: "합성 검증" },
      }),
    ]);
    pair.forEach((result, index) =>
      samples.push({
        pair: i + 1,
        decision: index === 0 ? "APPROVED" : "REJECTED",
        status: result.status,
        durationMs: result.durationMs,
      }),
    );
    assert.deepEqual(pair.map((r) => r.status).sort(), [200, 409]);
    const saved = await db.claim.findUniqueOrThrow({ where: { id: row.id } });
    const winning = pair[0].status === 200 ? "APPROVED" : "REJECTED";
    assert.equal(saved.status, winning);
    const replay = await api(tokens[1], {
      action: "decide",
      input: {
        ...input,
        decision: winning,
        ...(winning === "REJECTED" ? { reason: "합성 검증" } : {}),
      },
    });
    assert.equal(replay.status, 200);
    assert.equal(
      replay.result.claim.reviewedAt,
      saved.reviewedAt.toISOString(),
    );
  }
  checks.push(
    "10 concurrent HTTP pairs: one success/one conflict each; retry audit unchanged",
  );
  await db.session.updateMany({
    where: { userId: users[1] },
    data: { expiresAt: new Date(0) },
  });
  await page.getByRole("button", { name: "새로고침", exact: true }).click();
  await page.getByRole("heading", { name: "담당자 로그인" }).waitFor();
  await page.screenshot({ path: `${dir}/admin-expired.png`, fullPage: true });
  checks.push("Expired DB session removes review UI and shows login");
  assert.deepEqual(pageErrors, []);
} catch (error) {
  failure = error instanceof Error ? error.message : String(error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  await db.user.deleteMany({ where: { id: { in: users } } });
  if (receiptId) {
    await db.attachment.deleteMany({ where: { id: receiptId } });
    await rm(`${process.env.RECEIPT_LOCAL_DIR}/${receiptId}`, { force: true });
  }
  await db.company.deleteMany({ where: { id: { in: companies } } });
  const remaining = await db.user.count({
    where: { googleSub: { startsWith: runId } },
  });
  await db.$disconnect();
  const sourceFiles = [
    "packages/api/src/review/service.ts",
    "packages/api/src/review/http.ts",
    "apps/web/src/components/admin/AdminReview.tsx",
    "packages/api/scripts/verify-review.mjs",
  ];
  const hashes = Object.fromEntries(
    await Promise.all(
      sourceFiles.map(async (path) => [
        path,
        createHash("sha256")
          .update(await readFile(path))
          .digest("hex"),
      ]),
    ),
  );
  const env = {
    runId,
    dateKst: "2026-11-27",
    node: process.version,
    os: `${platform()} ${release()} ${arch()}`,
    browser: "Chrome headless",
    server: "Next development localhost:3000",
    database: "local PostgreSQL",
    scope:
      "Synthetic authenticated HTTP request start through parsed response; includes local Next and DB; excludes Google login and native rendering",
    head: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
    sourceHashes: hashes,
  };
  await writeFile(
    `docs/metrics/raw/${runId}.json`,
    JSON.stringify(
      { runId, samples, checks, failure, remainingFixtures: remaining },
      null,
      2,
    ) + "\n",
  );
  await writeFile(
    `docs/metrics/environments/${runId}.json`,
    JSON.stringify(env, null, 2) + "\n",
  );
  console.log(
    JSON.stringify(
      {
        runId,
        samples: samples.length,
        checks,
        failure,
        remainingFixtures: remaining,
      },
      null,
      2,
    ),
  );
}
