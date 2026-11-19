import { describe, expect, it } from "vitest";
import { bridgeBase, parseBridgeMessage } from "./bridge";

const input = {
  requestId: "123e4567-e89b-42d3-a456-426614174000",
  title: "식사",
  category: "식비",
  amount: 1000,
  usedOn: "2026-11-19",
};
const submit = {
  ...bridgeBase,
  type: "CLAIM_SUBMIT",
  connectionId: "load-1",
  requestId: "rpc-1",
  payload: input,
};
describe("claim bridge boundary", () => {
  it("accepts a correlated create without credentials", () => {
    expect(parseBridgeMessage(submit).success).toBe(true);
  });
  it.each([
    { ...submit, connectionId: "" },
    { ...submit, payload: { ...input, token: "secret" } },
    { ...submit, payload: { ...input, companyId: "other" } },
    { ...submit, payload: { ...input, amount: 0 } },
    { ...submit, payload: { ...input, usedOn: "2026-02-30" } },
  ])("rejects invalid or privileged input %#", (message) => {
    expect(parseBridgeMessage(message).success).toBe(false);
  });
  it("requires connection identity for FORM_READY", () => {
    expect(
      parseBridgeMessage({
        ...bridgeBase,
        type: "FORM_READY",
        connectionId: "load-1",
      }).success,
    ).toBe(true);
    expect(
      parseBridgeMessage({ ...bridgeBase, type: "FORM_READY" }).success,
    ).toBe(false);
  });
});
