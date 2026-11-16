import { expect, it, vi } from "vitest";
import { GET } from "../../../apps/web/src/app/api/trpc/[trpc]/route";
it("returns actual health data and allows the local RN Web preview origin", async () => {
  const response = await GET(
    new Request("http://localhost:3000/api/trpc/health.check", {
      headers: { Origin: "http://localhost:8081" },
    }),
  );
  expect(await response.json()).toEqual({
    result: { data: { status: "ok", service: "chagok" } },
  });
  expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
    "http://localhost:8081",
  );
});
it("does not allow arbitrary sites or credentials", async () => {
  const response = await GET(
    new Request("http://localhost:3000/api/trpc/health.check", {
      headers: { Origin: "https://evil.test" },
    }),
  );
  expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  expect(response.headers.get("Access-Control-Allow-Credentials")).toBeNull();
});
it.each(["http://localhost:8082", "http://127.0.0.1:8082"])(
  "allows the separate development preview at %s",
  async (origin) => {
    const response = await GET(
      new Request("http://localhost:3000/api/trpc/health.check", {
        headers: { Origin: origin },
      }),
    );
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(origin);
  },
);
it("does not expose preview CORS in production", async () => {
  vi.stubEnv("NODE_ENV", "production");
  try {
    const response = await GET(
      new Request("http://localhost:3000/api/trpc/health.check", {
        headers: { Origin: "http://localhost:8082" },
      }),
    );
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  } finally {
    vi.unstubAllEnvs();
  }
});
it("requires a session on the real HTTP route and never returns stack traces", async () => {
  const response = await GET(
    new Request("http://localhost:3000/api/trpc/auth.session"),
  );
  const body = await response.json();
  expect(response.status).toBe(401);
  expect(body.error.data.stack).toBeUndefined();
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(JSON.stringify(body)).not.toContain("Database is not configured");
});
