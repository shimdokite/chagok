import { expect, it } from "vitest";
import { createMetricJournal } from "./metric-journal";
it("retains startup and failure samples beyond ten writes and across journal instances", async () => {
  const data = new Map<string, string>();
  const storage = {
    get: async (k: string) => data.get(k) ?? null,
    set: async (k: string, v: string) => {
      data.set(k, v);
    },
  };
  const journal = createMetricJournal(storage);
  for (let i = 0; i < 12; i++)
    journal.record({
      runId: `run-${i}`,
      durationMs: i,
      status: i === 0 ? "failure" : "success",
      trigger: "startup",
      measuredAt: "2026-11-16T00:00:00Z",
    });
  expect((await journal.read()).samples).toHaveLength(12);
  const restored = await createMetricJournal(storage).read();
  expect(restored.samples[0].status).toBe("failure");
  expect(restored.saveFailed).toBe(false);
});
it("reports storage errors rather than returning apparently complete evidence", async () => {
  const journal = createMetricJournal({
    get: async () => null,
    set: async () => {
      throw new Error("disk");
    },
  });
  journal.record({
    runId: "one",
    durationMs: 1,
    status: "empty",
    trigger: "startup",
    measuredAt: "2026-11-16T00:00:00Z",
  });
  expect((await journal.read()).saveFailed).toBe(true);
});
