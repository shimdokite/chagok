import { randomBytes, createHash, randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { getDb } from "../src/auth/store.ts";
import {
  assertLocalDatabase,
  seedBenefits,
  linkSampleMember,
} from "../src/benefits/seed.ts";
import {
  BenefitsCache,
  benefitKey,
} from "../../../apps/mobile/src/benefits/cache.ts";

assertLocalDatabase(process.env.DATABASE_URL);
const db = getDb();
const token = randomBytes(32).toString("hex");
const user = await db.user.create({
  data: { googleSub: `measurement:${randomUUID()}` },
});
const expiresAt = new Date(Date.now() + 60000);
const records: {
  scenario: string;
  requests: number;
  responseBytes: number;
  durationMs: number;
  status: number;
}[] = [];
try {
  await seedBenefits(db, "2026-11");
  await linkSampleMember(db, user.id, "sample-grove", "2026-11");
  const member = await db.membership.findUniqueOrThrow({
    where: { userId: user.id },
  });
  await db.session.create({
    data: {
      userId: user.id,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      expiresAt,
    },
  });
  const state = {
    status: "authenticated" as const,
    session: {
      user: { id: user.id, companyId: member.companyId },
      expiresAt: expiresAt.toISOString(),
    },
  };
  const cache = new BenefitsCache(state);
  let requests = 0;
  let bytes = 0;
  let status = 0;
  const queryKey = benefitKey(state, "home", "2026-11");

  async function queryFn() {
    const response = await fetch(
      `http://127.0.0.1:3000/api/trpc/benefits.home?input=${encodeURIComponent(JSON.stringify({ month: "2026-11" }))}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const body = await response.text();
    requests++;
    bytes += Buffer.byteLength(body);
    status = response.status;
    if (!response.ok) throw new Error(`Home HTTP ${response.status}`);
    const result = JSON.parse(body);
    if (result.result?.data?.amounts?.available !== 65000)
      throw new Error("Unexpected balance");
    return result.result.data;
  }

  for (const scenario of ["cold", "within-30s", "manual-refresh"]) {
    requests = 0;
    bytes = 0;
    if (scenario === "manual-refresh")
      await cache.client.invalidateQueries({ queryKey });
    const start = performance.now();
    await cache.client.fetchQuery({ queryKey, queryFn });
    records.push({
      scenario,
      requests,
      responseBytes: bytes,
      durationMs: performance.now() - start,
      status,
    });
  }
  cache.dispose();
  const output = {
    measuredAt: new Date().toISOString(),
    environment: `Node ${process.version}, localhost Next dev, PostgreSQL, synthetic session, no browser/RN render measurement`,
    metric:
      "uncompressed HTTP JSON bytes; home query only (auth.session excluded)",
    records,
  };
  writeFileSync(
    "docs/verification/day-03/home-metrics.json",
    `${JSON.stringify(output, null, 2)}\n`,
  );
  console.log(JSON.stringify(output));
} finally {
  await db.user.delete({ where: { id: user.id } });
  await db.$disconnect();
}
