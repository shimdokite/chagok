import { BridgeBenchmark, type BenchmarkResult } from "./bridge-benchmark";
// Development-only in-memory history: survives navigation, not application restarts.
// Share evidence before leaving the app. Keep the last ten experiments bounded.
let history: readonly BenchmarkResult[] = [];
const listeners = new Set<() => void>();
export const getBenchmarkHistory = () => history;
export function subscribeBenchmarkHistory(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export async function runRecordedBenchmark(
  engine: BridgeBenchmark,
  options?: Parameters<BridgeBenchmark["runBridgeBenchmark"]>[0],
) {
  const result = await engine.runBridgeBenchmark(options);
  history = [...history, result].slice(-10);
  listeners.forEach((listener) => listener());
  return result;
}
