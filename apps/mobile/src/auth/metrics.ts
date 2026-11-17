import { metricStorage } from "./storage";
import { createMetricJournal } from "./metric-journal";
import type { RestoreMetric } from "./session";

const journal = createMetricJournal(metricStorage);

export function recordRestore(metric: RestoreMetric) {
  if (__DEV__) journal.record(metric);
}

export async function restoreMetrics() {
  return {
    schemaVersion: 1,
    metric: "session-restore",
    unit: "ms",
    boundary:
      "restore entry through secure storage read and server decision; excludes UI paint",
    ...(await journal.read()),
  };
}
