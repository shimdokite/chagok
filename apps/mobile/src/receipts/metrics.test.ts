import { afterEach, expect, it, vi } from "vitest";
import { ReceiptJournal } from "./metrics";

afterEach(() => vi.useRealTimers());

it("separates stages and measures ACK on the same clock without identifiers", async () => {
  let now = 10;
  const journal = new ReceiptJournal(() => now);
  const trace = journal.start("library")!;
  await trace.measure("pickerMs", async () => {
    now = 110;
  });
  await trace.measure("prepareMs", () => {
    now = 115;
  });
  await trace.measure("uploadMs", async () => {
    now = 135;
  });
  trace.metadata({ mimeType: "image/png", byteSize: 123 });
  trace.sent("uploaded");
  now = 142;
  trace.ack();
  trace.ack();
  expect(journal.snapshot().samples).toEqual([
    {
      source: "library",
      outcome: "uploaded",
      delivery: "acked",
      pickerMs: 100,
      prepareMs: 5,
      uploadMs: 20,
      bridgeAckMs: 7,
      mimeType: "image/png",
      byteSize: 123,
    },
  ]);
});

it("records failed stages, missing ACK and abort without inventing completed durations", async () => {
  vi.useFakeTimers();
  let now = 0;
  const journal = new ReceiptJournal(() => now);
  const trace = journal.start("camera")!;
  await expect(
    trace.measure("pickerMs", async () => {
      now = 30;
      throw new Error("private path");
    }),
  ).rejects.toThrow();
  trace.sent("error");
  vi.advanceTimersByTime(3000);
  trace.ack();
  const aborted = journal.start("library")!;
  let finish!: () => void;
  const pending = aborted.measure(
    "pickerMs",
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  aborted.abort();
  now = 900;
  finish();
  await pending;
  expect(journal.snapshot().samples).toEqual([
    { source: "camera", outcome: "error", delivery: "timeout", pickerMs: 30 },
    { source: "library", outcome: "interrupted", delivery: "aborted" },
  ]);
  expect(JSON.stringify(journal.snapshot())).not.toContain("private path");
});

it("bounds outstanding and saved samples and reports persistence failure", () => {
  const journal = new ReceiptJournal(
    () => 0,
    () => {
      throw new Error("disk");
    },
  );
  const traces = Array.from({ length: 100 }, () => journal.start("library")!);
  expect(journal.start("library")).toBeUndefined();
  traces.forEach((trace) => trace.abort());
  const result = journal.snapshot();
  expect(result.samples).toHaveLength(100);
  expect(result.dropped).toBe(1);
  expect(result.saveFailed).toBe(true);
  result.samples.length = 0;
  expect(journal.snapshot().samples).toHaveLength(100);
});

it("rejects an ACK at or past the deadline even when its timeout callback is delayed", () => {
  vi.useFakeTimers();
  let now = 0;
  const journal = new ReceiptJournal(() => now);
  const trace = journal.start("library")!;
  trace.sent("uploaded");
  now = 3000;
  trace.ack();
  expect(journal.snapshot().samples).toEqual([
    { source: "library", outcome: "uploaded", delivery: "timeout" },
  ]);
});
