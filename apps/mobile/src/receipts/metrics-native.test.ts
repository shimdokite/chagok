import { afterEach, expect, it, vi } from "vitest";

const disk = vi.hoisted(() => ({
  writes: [] as { path: string; body: string }[],
}));
vi.mock("expo-file-system", () => ({
  Paths: { document: "app-document" },
  File: class {
    constructor(
      private directory: string,
      private name: string,
    ) {}

    write(body: string) {
      disk.writes.push({ path: `${this.directory}/${this.name}`, body });
    }
  },
}));
vi.mock("react-native", () => ({ Platform: { OS: "ios", Version: "27.2" } }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  disk.writes.length = 0;
});

it("writes numeric measurement reports locally in development only", async () => {
  vi.stubGlobal("__DEV__", false);
  const disabled = await import("./metrics-native");
  expect(disabled.startReceiptMeasurement("library")).toBeUndefined();
  expect(disk.writes).toHaveLength(0);
  vi.stubGlobal("__DEV__", true);
  const trace = disabled.startReceiptMeasurement("camera")!;
  trace.abort();
  expect(disk.writes).toHaveLength(1);
  expect(disk.writes[0].path).toMatch(/^app-document\/receipt-ui-.*\.json$/);
  expect(JSON.parse(disk.writes[0].body)).toMatchObject({
    os: "ios 27.2",
    samples: [{ source: "camera", delivery: "aborted" }],
  });
});
