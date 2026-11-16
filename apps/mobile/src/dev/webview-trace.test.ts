import { describe, expect, it } from "vitest";
import { WebViewTrace } from "./webview-trace";

describe("WebView diagnostic evidence", () => {
  it("keeps distinct failure causes with revision and elapsed time", () => {
    let clock = 100;
    const trace = new WebViewTrace(true, () => clock);
    trace.record("load-start", 1);
    clock = 15100;
    trace.record("ready-timeout", 1);
    trace.record("http-error", 2, { status: 503 });
    trace.record("content-process-terminated", 3);
    expect(trace.snapshot().events).toEqual([
      { seq: 1, ms: 0, revision: 1, kind: "load-start" },
      { seq: 2, ms: 15000, revision: 1, kind: "ready-timeout" },
      { seq: 3, ms: 15000, revision: 2, kind: "http-error", status: 503 },
      { seq: 4, ms: 15000, revision: 3, kind: "content-process-terminated" },
    ]);
  });
  it("never copies URL, payload or native error descriptions into evidence", () => {
    const trace = new WebViewTrace(true);
    trace.record("load-error", 0, {
      code: -1009,
      url: "https://private.test/?token=secret",
      description: "private",
      data: "id-token",
    } as { code: number });
    const serialized = JSON.stringify(trace.snapshot());
    expect(serialized).toContain('"code":-1009');
    expect(serialized).not.toMatch(/secret|private|id-token|description|url/);
  });
  it("bounds history and reports truncation instead of presenting a partial run as complete", () => {
    const trace = new WebViewTrace(true);
    for (let n = 0; n < 201; n++) trace.record("load-start", n);
    const result = trace.snapshot();
    expect(result.events.length).toBeLessThanOrEqual(200);
    expect(result.dropped).toBe(201 - result.events.length);
    expect(result.events.at(-1)?.revision).toBe(200);
    expect(result.events[0].seq).toBe(result.dropped + 1);
  });
  it("collects no events when disabled in release", () => {
    const trace = new WebViewTrace(false);
    trace.record("ready-timeout", 0);
    expect(trace.snapshot().events).toEqual([]);
  });
});
