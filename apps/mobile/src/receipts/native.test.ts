import { expect, it, vi } from "vitest";
import { ReceiptJournal } from "./metrics";

const ports = vi.hoisted(() => ({ now: 0, cancelled: false }));
vi.mock("expo-image-picker", () => ({
  requestCameraPermissionsAsync: async () => ({
    granted: true,
    canAskAgain: true,
  }),

  launchImageLibraryAsync: async () => {
    ports.now += 100;
    return {
      canceled: ports.cancelled,
      assets: [{ uri: "private-file", mimeType: "image/png" }],
    };
  },
}));
vi.mock("expo-file-system", () => ({
  File: class {
    constructor() {
      ports.now += 5;
    }

    size = 123;
    type = "image/png";
  },
}));
vi.mock("expo/fetch", () => ({ fetch: () => {} }));
vi.mock("../auth/storage", () => ({ storage: { get: async () => "secret" } }));
vi.mock("../lib/trpc", () => ({ webOrigin: "http://localhost:3000" }));
vi.mock("./upload", () => ({
  uploadReceipt: async () => {
    ports.now += 20;
    return {
      attachmentId: "00000000-0000-4000-8000-000000000001",
      mimeType: "image/png",
      byteSize: 123,
    };
  },
}));

it("instruments native stages without exposing token or file path; cancel skips upload", async () => {
  const { pickAndUploadReceipt } = await import("./native");
  const journal = new ReceiptJournal(() => ports.now);
  for (const cancelled of [false, true]) {
    ports.cancelled = cancelled;
    const trace = journal.start("library")!;
    const result = await pickAndUploadReceipt(
      "library",
      "private-company",
      new AbortController().signal,
      trace,
    );
    trace.sent(result.kind);
    trace.ack();
  }
  expect(journal.snapshot().samples).toMatchObject([
    {
      outcome: "uploaded",
      pickerMs: 100,
      prepareMs: 5,
      uploadMs: 20,
      mimeType: "image/png",
      byteSize: 123,
    },
    { outcome: "cancelled", pickerMs: 100 },
  ]);
  expect(journal.snapshot().samples[1]).not.toHaveProperty("uploadMs");
  expect(JSON.stringify(journal.snapshot())).not.toMatch(/private|secret/);
});
