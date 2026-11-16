import type { RestoreMetric } from "./session";
type Store = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
};
// One small SecureStore entry per sample avoids large native storage values.
// Evidence is never rotated silently; 100 records require export/reset for a new experiment.
export function createMetricJournal(store: Store) {
  let pending = Promise.resolve();
  let saveFailed = false;
  async function count() {
    return Number((await store.get("count")) ?? "0");
  }
  return {
    record(metric: RestoreMetric) {
      pending = pending
        .then(async () => {
          const n = await count();
          if (!Number.isSafeInteger(n) || n < 0 || n >= 100)
            throw new Error(
              "Export measurement journal before collecting more",
            );
          await store.set(`sample.${n}`, JSON.stringify(metric));
          await store.set("count", String(n + 1));
        })
        .catch(() => {
          saveFailed = true;
        });
    },
    async read() {
      await pending;
      const n = await count();
      const samples: RestoreMetric[] = [];
      if (!Number.isSafeInteger(n) || n < 0 || n > 100)
        throw new Error("Invalid measurement journal");
      for (let i = 0; i < n; i++) {
        const row = await store.get(`sample.${i}`);
        if (!row) {
          saveFailed = true;
          continue;
        }
        samples.push(JSON.parse(row));
      }
      return { saveFailed, capacity: 100, capacityReached: n === 100, samples };
    },
  };
}
