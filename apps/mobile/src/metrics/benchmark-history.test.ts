import { expect, it } from "vitest";
import { BridgeBenchmark } from "./bridge-benchmark";
import { getBenchmarkHistory, runRecordedBenchmark } from "./benchmark-history";
it("retains cancelled experiment after the originating screen engine is discarded", async () => {
  const environment = {
    device: "unit-test",
    OS: "test",
    appBuild: "test",
    webBuildMode: "test",
    sourceRef: "test",
  };
  const engine = new BridgeBenchmark(() => {}, environment);
  engine.receive({
    channel: "chagok.bridge",
    version: 1,
    type: "WEB_READY",
    payload: {},
  });
  const previous = getBenchmarkHistory().length;
  const run = runRecordedBenchmark(engine, { count: 20, warmupCount: 0 });
  engine.reset("unmount");
  await run;
  const history = getBenchmarkHistory();
  expect(history.length).toBe(previous + 1);
  expect(history.at(-1)?.status).toBe("cancelled");
  expect(history.at(-1)?.samples[0].status).toBe("cancelled");
  expect(JSON.parse(JSON.stringify(history)).at(-1).reason).toBe("unmount");
});
