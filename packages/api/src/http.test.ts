import { expect, it } from "vitest";
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
