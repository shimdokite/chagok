// Run against the real HTML, with its iframe sandbox intact (no injected events/state).
// Requires the workspace's installed playwright-core and local Google Chrome.
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const url = process.argv[2] || 'http://127.0.0.1:3015/chagok-prototype.html';
const output = process.argv[3] || 'docs/verification/prototype/green';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
async function textIs(locator, expected) {
  await locator.filter({ hasText: expected }).waitFor({ state: 'visible', timeout: 5000 });
  assert.equal((await locator.innerText()).trim(), expected);
}
async function home(frame, amount) {
  await frame.locator('[data-screen="home"]').click();
  await textIs(frame.locator('.cg-amount'), `${amount}원`);
}
async function apply(frame, title) {
  await frame.locator('[data-screen="apply"]').click();
  await frame.locator('#cg-date').fill('2026-11-13');
  await frame.locator('#cg-amount').fill('20000');
  await frame.locator('#cg-title').fill(title);
}
async function submit(frame) {
  await frame.locator('[data-action="attach"]').click();
  await textIs(frame.locator('[data-action="attach"]'), '영수증 첨부 완료 · 샘플 이미지');
  await frame.locator('button[type="submit"]').click();
  await textIs(frame.locator('.cg-success h1'), '신청이 접수됐어요');
  await textIs(frame.locator('.cg-note strong'), '45,000원');
}
const scenarios = {
  'missing-receipt': async (frame, page) => {
    await home(frame, '65,000');
    await apply(frame, '영수증 검증');
    await frame.locator('button[type="submit"]').click();
    await textIs(frame.locator('#cg-form-error'), '영수증을 먼저 첨부해 주세요.');
    await page.screenshot({ path: path.join(output, 'missing-receipt.png'), fullPage: true });
    await home(frame, '65,000');
    return { balance: 65000, message: '영수증을 먼저 첨부해 주세요.' };
  },
  approve: async (frame, page) => {
    const title = 'AC15 승인 테스트';
    await home(frame, '65,000');
    await apply(frame, title);
    await submit(frame);
    await page.screenshot({ path: path.join(output, 'submitted.png'), fullPage: true });
    await home(frame, '45,000');
    await frame.locator('[data-screen="admin"]').click();
    const row = frame.locator('.cg-manager-entry').filter({ hasText: title });
    await row.getByRole('button', { name: '검토하기' }).click();
    await frame.locator('[data-action="approve"]').click();
    await textIs(row.locator('.cg-badge'), '승인 완료');
    await page.screenshot({ path: path.join(output, 'approved.png'), fullPage: true });
    await home(frame, '45,000');
    await frame.locator('[data-screen="history"]').click();
    await textIs(frame.locator('.cg-row').filter({ hasText: title }).locator('.cg-badge'), '승인 완료');
    return { balances: [65000, 45000, 45000], employeeStatus: '승인 완료' };
  },
  reject: async (frame, page) => {
    const title = 'AC15 반려 테스트';
    const reason = '영수증 사용일을 확인해 주세요.';
    await home(frame, '65,000');
    await apply(frame, title);
    await submit(frame);
    await home(frame, '45,000');
    await frame.locator('[data-screen="admin"]').click();
    const row = frame.locator('.cg-manager-entry').filter({ hasText: title });
    await row.getByRole('button', { name: '검토하기' }).click();
    await frame.locator('[data-action="reject"]').click();
    await textIs(frame.locator('#cg-admin-error'), '직원에게 전달할 반려 사유를 입력해 주세요.');
    await textIs(row.locator('.cg-badge'), '검토 중');
    await frame.locator('#cg-reason').fill(reason);
    await frame.locator('[data-action="reject"]').click();
    await textIs(row.locator('.cg-badge'), '반려');
    await page.screenshot({ path: path.join(output, 'rejected.png'), fullPage: true });
    await home(frame, '65,000');
    await frame.locator('[data-screen="history"]').click();
    const employeeRow = frame.locator('.cg-row').filter({ hasText: title });
    await textIs(employeeRow.locator('.cg-badge'), '반려');
    await employeeRow.click();
    assert.ok((await frame.locator('#cg-content').innerText()).includes(reason));
    return { balances: [65000, 45000, 65000], employeeStatus: '반려', reason, emptyReasonBlocked: true };
  },
};
try {
  for (const [name, run] of Object.entries(scenarios)) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', err => pageErrors.push(err.message));
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 60000 });
      const frame = page.frameLocator('#codex-visualization');
      const observations = await run(frame, page);
      assert.deepEqual(pageErrors, [], 'Uncaught JavaScript errors');
      assert.equal(consoleErrors.some(text => /Blocked form submission|sandboxed.*allow-forms/i.test(text)), false);
      results.push({ name, passed: true, observations, consoleErrors, pageErrors });
    } catch (error) {
      await page.screenshot({ path: path.join(output, `${name}-failed.png`), fullPage: true }).catch(() => {});
      results.push({ name, passed: false, error: error.message, consoleErrors, pageErrors });
    } finally {
      await context.close();
    }
    console.log(JSON.stringify(results.at(-1)));
  }
  await writeFile(path.join(output, 'results.json'), JSON.stringify({
    at: new Date().toISOString(), url, browser: browser.version(),
    sourceSha256: createHash('sha256').update(await readFile('docs/design/chagok-prototype.html')).digest('hex'),
    results,
  }, null, 2) + '\n');
} finally {
  await browser.close();
}
if (results.some(result => !result.passed)) process.exitCode = 1;
