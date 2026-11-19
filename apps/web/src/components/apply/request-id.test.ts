import { afterEach, expect, it, vi } from "vitest";
import { requestId } from "./request-id";

afterEach(() => vi.unstubAllGlobals());
it("creates distinct valid v4 UUIDs when randomUUID is absent on HTTP origins", () => {
  const getRandomValues = crypto.getRandomValues.bind(crypto);
  vi.stubGlobal("crypto", { getRandomValues });
  const a = requestId();
  const b = requestId();
  expect(a).toMatch(
    /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/,
  );
  expect(a).not.toBe(b);
});
