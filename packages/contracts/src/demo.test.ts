import { expect, it } from "vitest";
import { demo, balance } from "./demo";
it("reserves submitted and approved amounts, excluding rejected claims", () => {
  expect(balance(demo.requests, 100000)).toEqual({
    total: 100000,
    used: 35000,
    available: 65000,
  });
  expect(
    balance([{ amount: 30000, status: "REJECTED" }], 100000).available,
  ).toBe(100000);
});
