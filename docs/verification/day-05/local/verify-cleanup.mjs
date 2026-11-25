// Run from repository root with Node 24. This creates its own temporary DB cluster.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  mkdtemp,
  readFile,
  readdir,
  mkdir,
  writeFile,
  rm,
  stat,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";

const require = createRequire(resolve("package.json"));
const postgresRequire = createRequire(
  resolve(".local-tools/postgres/package.json"),
);
const { default: EmbeddedPostgres } = await import(
  postgresRequire.resolve("embedded-postgres")
);
const { Client } = require("pg");
const root = await mkdtemp(join(tmpdir(), "chagok-cleanup-isolated-"));
const directory = join(root, "receipts");
const cluster = new EmbeddedPostgres({
  databaseDir: join(root, "database"),
  user: "cleanup_test",
  password: randomUUID(),
  port: 55433,
  persistent: true,
  authMethod: "trust",
  postgresFlags: ["-h", "127.0.0.1", "-k", root],
  onLog: () => {},
  onError: () => {},
});
const url = "postgresql://cleanup_test@127.0.0.1:55433/chagok";
const client = new Client({ connectionString: url });
const report = {
  date: "2026-11-24 KST",
  port: 55433,
  isolated: true,
  batches: [],
};
let started = false;
let connected = false;

async function row(state, ageHours, file = true) {
  const id = randomUUID();
  await client.query(
    'INSERT INTO "Attachment" (id,"userId","companyId","mimeType","byteSize",state,"createdAt") VALUES ($1,$2,$3,\'image/png\',4,$4,$5)',
    [id, userId, companyId, state, new Date(Date.now() - ageHours * 3600000)],
  );
  if (file) await writeFile(join(directory, id), "test", { mode: 0o600 });
  return id;
}

function runCleanup() {
  const start = performance.now();
  const child = spawnSync(
    process.execPath,
    [
      "--experimental-transform-types",
      "packages/api/scripts/cleanup-receipts.mjs",
    ],
    {
      env: {
        ...process.env,
        NODE_ENV: "development",
        DATABASE_URL: url,
        RECEIPT_LOCAL_DIR: directory,
      },
      encoding: "utf8",
      timeout: 30000,
    },
  );
  assert.equal(child.status, 0, child.stderr);
  const counts = JSON.parse(child.stdout.trim());
  report.batches.push({
    ...counts,
    elapsedMs: performance.now() - start,
    exitCode: child.status,
  });
  return counts;
}

const userId = randomUUID();
const companyId = randomUUID();
try {
  await cluster.initialise();
  await cluster.start();
  started = true;
  await cluster.createDatabase("chagok");
  await client.connect();
  connected = true;
  report.postgres = (
    await client.query("SHOW server_version")
  ).rows[0].server_version;
  const migrationRoot = resolve("packages/api/prisma/migrations");
  const migrations = (await readdir(migrationRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  for (const name of migrations) {
    await client.query(
      await readFile(join(migrationRoot, name, "migration.sql"), "utf8"),
    );
  }
  report.migrationsAppliedAsSql = migrations;
  await mkdir(directory, { mode: 0o700 });
  await client.query('INSERT INTO "User" (id,"googleSub") VALUES ($1,$2)', [
    userId,
    `cleanup-${userId}`,
  ]);
  await client.query(
    "INSERT INTO \"Company\" (id,slug,name) VALUES ($1,$2,'cleanup fixture')",
    [companyId, companyId],
  );
  await client.query(
    'INSERT INTO "Membership" ("userId","companyId") VALUES ($1,$2)',
    [userId, companyId],
  );

  const failure = await row("READY", 72, false);
  await mkdir(join(directory, failure));
  await writeFile(join(directory, failure, "obstruction"), "fixture");
  for (let index = 0; index < 102; index++) await row("READY", 48);
  await row("PENDING", 48, false);
  await row("DELETING", 1);
  const fresh = await row("READY", 1);
  const pending = await row("PENDING", 1);
  const linked = await row("LINKED", 72);
  await client.query(
    'INSERT INTO "Claim" (id,"companyId","userId",title,category,amount,status,"usedOn","attachmentId") VALUES ($1,$2,$3,\'cleanup fixture\',\'test\',1,\'SUBMITTED\',\'2026-11-24\',$4)',
    [randomUUID(), companyId, userId, linked],
  );
  assert.equal(
    (await client.query('SELECT count(*)::int AS n FROM "Attachment"')).rows[0]
      .n,
    108,
  );
  assert.deepEqual(runCleanup(), { deleted: 99, failed: 1 });
  assert.equal(
    (
      await client.query('SELECT state FROM "Attachment" WHERE id=$1', [
        failure,
      ])
    ).rows[0].state,
    "DELETING",
  );
  assert.equal(
    (await client.query('SELECT count(*)::int AS n FROM "Attachment"')).rows[0]
      .n,
    9,
  );
  await rm(join(directory, failure), { recursive: true });
  await writeFile(join(directory, failure), "test", { mode: 0o600 });
  assert.deepEqual(runCleanup(), { deleted: 6, failed: 0 });
  assert.deepEqual(runCleanup(), { deleted: 0, failed: 0 });
  const survivors = (
    await client.query('SELECT id,state FROM "Attachment" ORDER BY id')
  ).rows;
  assert.deepEqual(
    survivors.map(({ id }) => id),
    [fresh, pending, linked].sort(),
  );
  assert.deepEqual(
    (await readdir(directory)).sort(),
    [fresh, pending, linked].sort(),
  );
  for (const id of [fresh, pending, linked]) {
    assert.equal(await readFile(join(directory, id), "utf8"), "test");
    assert.equal((await stat(join(directory, id))).mode & 0o777, 0o600);
  }
  assert.equal((await stat(directory)).mode & 0o777, 0o700);
  assert.equal(
    (
      await client.query(
        'SELECT count(*)::int AS n FROM "Claim" WHERE "attachmentId"=$1',
        [linked],
      )
    ).rows[0].n,
    1,
  );
  report.result = "passed";
  report.fixtureRows = 108;
  report.eligibleRows = 105;
  report.preserved = [
    "fresh READY",
    "fresh PENDING",
    "old LINKED with actual claim",
  ];
  report.deletedMissingObject = true;
  report.failedDeletionRetried = true;
  report.fileMode = "0600";
  report.directoryMode = "0700";
} finally {
  if (connected) await client.end();
  if (started) await cluster.stop();
  await rm(root, { recursive: true, force: true });
  report.temporaryClusterStoppedAndRemoved = true;
  await writeFile(
    "docs/verification/day-05/local/cleanup-result.json",
    JSON.stringify(report, null, 2) + "\n",
  );
}
console.log(JSON.stringify(report, null, 2));
