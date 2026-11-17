import { expect, it } from "vitest";
import { assertLocalDatabase } from "./seed";

it.each([
  "postgresql://x@example.com/chagok",
  "postgresql://x@127.0.0.1/production",
  undefined,
])("seed는 지정 로컬 DB 외 %s 거부", (url) => {
  expect(() => assertLocalDatabase(url)).toThrow();
});
it("로컬 chagok DB만 허용한다", () => {
  expect(() =>
    assertLocalDatabase("postgresql://x@127.0.0.1:55432/chagok"),
  ).not.toThrow();
});
