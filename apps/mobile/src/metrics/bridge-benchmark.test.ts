import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BridgeBenchmark } from "./bridge-benchmark";
import type { BridgeMessage } from "@chagok/contracts";
const environment = {
  device: "unit-test",
  OS: "test",
  appBuild: "test",
  webBuildMode: "test",
  sourceRef: "test",
};
let sent: BridgeMessage[];
let engine: BridgeBenchmark;
beforeEach(() => {
  vi.useFakeTimers();
  sent = [];
  engine = new BridgeBenchmark((m) => sent.push(m), environment);
});
afterEach(() => {
  engine.reset("unmount");
  vi.useRealTimers();
});
const pong = (id: string) => ({
  channel: "chagok.bridge",
  version: 1,
  type: "PONG",
  requestId: id,
  payload: {},
});
const ready = () =>
  engine.receive({
    channel: "chagok.bridge",
    version: 1,
    type: "WEB_READY",
    payload: {},
  });
describe("benchmark lifecycle", () => {
  it("does not send before WEB_READY", async () => {
    await expect(
      engine.runBridgeBenchmark({ count: 1, warmupCount: 0 }),
    ).rejects.toThrow("not-ready");
    expect(sent).toHaveLength(0);
  });
  it("matches only current ID and ignores duplicate responses", async () => {
    ready();
    const run = engine.runBridgeBenchmark({ count: 1, warmupCount: 0 });
    const id = (sent[0] as { requestId: string }).requestId;
    engine.receive(pong("wrong"));
    await vi.advanceTimersByTimeAsync(12);
    engine.receive(pong(id));
    engine.receive(pong(id));
    const result = await run;
    expect(result.samples).toHaveLength(1);
    expect(result.summary.success).toBe(1);
    expect(result.samples[0].durationMs).toBe(12);
  });
  it("records timeout and never counts a late PONG", async () => {
    ready();
    const run = engine.runBridgeBenchmark({ count: 1, warmupCount: 0 });
    const id = (sent[0] as { requestId: string }).requestId;
    await vi.advanceTimersByTimeAsync(3000);
    engine.receive(pong(id));
    const result = await run;
    expect(result.summary.timeout).toBe(1);
    expect(result.summary.success).toBe(0);
  });
  it("cancels on reload and clears pending timers", async () => {
    ready();
    const run = engine.runBridgeBenchmark({ count: 20, warmupCount: 0 });
    engine.reset("reload");
    const result = await run;
    expect(result.summary.cancelled).toBe(1);
    expect(engine.ready).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("rejects concurrent runs and waits 100ms AFTER each response", async () => {
    ready();
    const run = engine.runBridgeBenchmark({ count: 2, warmupCount: 0 });
    await expect(engine.runBridgeBenchmark()).rejects.toThrow(
      "already-running",
    );
    await vi.advanceTimersByTimeAsync(50);
    engine.receive(pong((sent[0] as { requestId: string }).requestId));
    await vi.advanceTimersByTimeAsync(99);
    expect(sent).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(sent).toHaveLength(2);
    engine.receive(pong((sent[1] as { requestId: string }).requestId));
    expect((await run).summary.success).toBe(2);
  });
  it("cancels interval sleep and isolates the next session", async () => {
    ready();
    const run = engine.runBridgeBenchmark({ count: 2, warmupCount: 0 });
    const old = (sent[0] as { requestId: string }).requestId;
    engine.receive(pong(old));
    await vi.advanceTimersByTimeAsync(0);
    engine.reset("close");
    await run;
    expect(vi.getTimerCount()).toBe(0);
    ready();
    const next = engine.runBridgeBenchmark({ count: 1, warmupCount: 0 });
    engine.receive(pong(old));
    await vi.advanceTimersByTimeAsync(3000);
    expect((await next).summary.timeout).toBe(1);
  });
  it("separates 3 warmups from 20 measured samples", async () => {
    engine = new BridgeBenchmark((m) => {
      if (m.type === "PING")
        queueMicrotask(() => engine.receive(pong(m.requestId)));
    }, environment);
    ready();
    const run = engine.runBridgeBenchmark();
    await vi.runAllTimersAsync();
    const result = await run;
    expect(result.warmups).toHaveLength(3);
    expect(result.samples).toHaveLength(20);
    expect(result.summary.attempts).toBe(20);
  });
  it("records send failure without leaving a timer", async () => {
    engine = new BridgeBenchmark(() => {
      throw new Error("unavailable");
    }, environment);
    ready();
    const result = await engine.runBridgeBenchmark({
      count: 1,
      warmupCount: 0,
    });
    expect(result.summary.failure).toBe(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("ignores malformed readiness and wrong-direction PING", () => {
    engine.receive("{");
    engine.receive({
      channel: "chagok.bridge",
      version: 2,
      type: "WEB_READY",
      payload: {},
    });
    expect(engine.ready).toBe(false);
    expect(engine.receive({ ...pong("id"), type: "PING" })).toBe(false);
  });
});

it("rejects a PONG past the monotonic deadline even before the timer callback", async () => {
  let clock = 0;
  engine = new BridgeBenchmark(
    (m) => sent.push(m),
    environment,
    () => clock,
  );
  ready();
  const run = engine.runBridgeBenchmark({ count: 1, warmupCount: 0 });
  clock = 4000;
  engine.receive(pong((sent[0] as { requestId: string }).requestId));
  const result = await run;
  expect(result.summary.success).toBe(0);
  expect(result.summary.timeout).toBe(1);
});
it("marks the whole experiment cancelled when closed between requests", async () => {
  ready();
  const run = engine.runBridgeBenchmark({ count: 20, warmupCount: 0 });
  engine.receive(pong((sent[0] as { requestId: string }).requestId));
  await vi.advanceTimersByTimeAsync(20);
  engine.reset("close");
  engine.reset("unmount");
  const result = await run;
  expect(result.status).toBe("cancelled");
  expect(result.reason).toBe("close");
  expect(result.requestedCount).toBe(20);
  expect(result.summary.attempts).toBe(1);
  expect(result.summary.success).toBe(1);
});
