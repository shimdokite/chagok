import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { configuredReceiptStorage } from "./storage";

const origin = "https://fixture.supabase.co";
const id = randomUUID();
const bytes = Buffer.from([2, 3, 4]);
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubEnv("RECEIPT_STORAGE", "supabase");
  vi.stubEnv("SUPABASE_URL", origin);
  vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_fixture");
  vi.stubGlobal("fetch", fetchMock.mockReset());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it("checks a private bucket before uploading original bytes without overwriting", async () => {
  fetchMock.mockResolvedValueOnce(
    Response.json({ id: "receipts", public: false }),
  );
  fetchMock.mockResolvedValueOnce(Response.json({ Key: `receipts/${id}` }));
  const store = configuredReceiptStorage();
  expect(store.location).toBe(origin + "/receipts");
  await store.put(id, bytes, "image/png");
  expect(fetchMock.mock.calls[0][0]).toBe(
    origin + "/storage/v1/bucket/receipts",
  );
  const [url, options] = fetchMock.mock.calls[1];
  expect(url).toBe(origin + "/storage/v1/object/receipts/" + id);
  expect(options).toMatchObject({
    method: "POST",
    redirect: "error",
    cache: "no-store",
  });
  expect(new Headers(options?.headers).get("apikey")).toBe("sb_secret_fixture");
  expect(new Headers(options?.headers).get("content-type")).toBe("image/png");
  expect(new Headers(options?.headers).get("x-upsert")).toBe("false");
  expect(Buffer.from(await new Response(options?.body).arrayBuffer())).toEqual(
    bytes,
  );
});

it("refuses a public bucket before writing bytes", async () => {
  fetchMock.mockResolvedValueOnce(
    Response.json({ id: "receipts", public: true }),
  );
  await expect(
    configuredReceiptStorage().put(id, bytes, "image/png"),
  ).rejects.toThrow();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("deletes only the specified key and accepts an already absent object", async () => {
  fetchMock.mockResolvedValueOnce(Response.json([]));
  await configuredReceiptStorage().remove(id);
  expect(fetchMock.mock.calls[0]).toEqual([
    origin + "/storage/v1/object/receipts",
    expect.objectContaining({
      method: "DELETE",
      body: JSON.stringify({ prefixes: [id] }),
    }),
  ]);
});

it("keeps storage errors retryable and rejects invalid keys before a request", async () => {
  const store = configuredReceiptStorage();
  await expect(store.remove("invalid")).rejects.toThrow();
  expect(fetchMock).not.toHaveBeenCalled();
  fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));
  await expect(store.remove(id)).rejects.toThrow();
});

it.each([
  ["SUPABASE_URL", "https://example.org"],
  ["SUPABASE_URL", "http://fixture.supabase.co"],
  ["SUPABASE_SECRET_KEY", ""],
  ["SUPABASE_SECRET_KEY", "sb_publishable_fixture"],
  ["RECEIPT_STORAGE", "unknown"],
])(
  "rejects incomplete or invalid %s without falling back to local files",
  (name, value) => {
    vi.stubEnv(name, value);
    vi.stubEnv("RECEIPT_LOCAL_DIR", "/tmp/fallback");
    expect(() => configuredReceiptStorage()).toThrow();
  },
);
