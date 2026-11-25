import { expect, it, vi } from "vitest";
import { selectReceipt } from "./picker";
import { uploadReceipt } from "./upload";

function ports() {
  return {
    permission: vi.fn(async () => ({ granted: true, canAskAgain: true })),

    launch: vi.fn(async () => ({ canceled: true, assets: null })),
  };
}

it("library cancellation needs no camera permission and returns no file", async () => {
  const p = ports();
  expect(
    await selectReceipt("library", new AbortController().signal, p),
  ).toBeNull();
  expect(p.permission).not.toHaveBeenCalled();
});
it.each([true, false])(
  "distinguishes denied permission canAskAgain=%s",
  async (canAskAgain) => {
    const p = ports();
    p.permission.mockResolvedValue({ granted: false, canAskAgain });
    await expect(
      selectReceipt("camera", new AbortController().signal, p),
    ).rejects.toMatchObject({
      code: canAskAgain ? "PERMISSION_DENIED" : "PERMISSION_SETTINGS",
    });
    expect(p.launch).not.toHaveBeenCalled();
  },
);
it("discards a picker result after cancellation", async () => {
  const p = ports();
  const controller = new AbortController();
  p.launch.mockImplementation(async () => {
    controller.abort();
    return { canceled: true, assets: null };
  });
  await expect(
    selectReceipt("library", controller.signal, p),
  ).rejects.toBeDefined();
});
it("sends raw bytes with native auth and verifies response metadata", async () => {
  const receipt = {
    attachmentId: "123e4567-e89b-42d3-a456-426614174001",
    mimeType: "image/png" as const,
    byteSize: 3,
  };
  const call = vi.fn(async (_url: string, _options: RequestInit) =>
    Response.json(receipt),
  );
  expect(
    await uploadReceipt(
      new Uint8Array([1, 2, 3]),
      receipt,
      "company",
      new AbortController().signal,
      {
        origin: "http://localhost:3000",

        token: async () => "a".repeat(64),

        fetch: call,
      },
    ),
  ).toEqual(receipt);
  expect(call.mock.calls[0][1]).toMatchObject({
    method: "POST",
    headers: {
      Authorization: `Bearer ${"a".repeat(64)}`,
      "Content-Type": "image/png",
      "X-Chagok-Company": "company",
    },
  });
});
it("rejects mismatched upload responses and expired auth", async () => {
  for (const response of [
    Response.json({ attachmentId: "not-an-id" }),
    Response.json({ code: "UNAUTHORIZED" }, { status: 401 }),
  ]) {
    await expect(
      uploadReceipt(
        "abc",
        { mimeType: "image/png", byteSize: 3 },
        "company",
        new AbortController().signal,
        {
          origin: "http://localhost",

          token: async () => "a".repeat(64),

          fetch: async () => response,
        },
      ),
    ).rejects.toBeDefined();
  }
});

it.each([
  [401, "UNAUTHORIZED"],
  [403, "FORBIDDEN"],
  [413, "TOO_LARGE"],
  [500, "UPLOAD_FAILED"],
  [503, "UPLOAD_FAILED"],
])("maps HTTP %s without trusting an error body", async (status, code) => {
  await expect(
    uploadReceipt(
      "abc",
      { mimeType: "image/png", byteSize: 3 },
      "company",
      new AbortController().signal,
      {
        origin: "http://localhost",

        token: async () => "a".repeat(64),

        fetch: async () => new Response("untrusted upstream error", { status }),
      },
    ),
  ).rejects.toEqual({ code });
});

it("does not upload when the saved token is missing", async () => {
  const fetch = vi.fn();
  await expect(
    uploadReceipt(
      "abc",
      { mimeType: "image/png", byteSize: 3 },
      "company",
      new AbortController().signal,
      {
        origin: "http://localhost",

        token: async () => null,

        fetch,
      },
    ),
  ).rejects.toEqual({ code: "UNAUTHORIZED" });
  expect(fetch).not.toHaveBeenCalled();
});
