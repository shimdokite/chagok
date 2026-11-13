import { describe, it, expect } from "vitest";
import { parseBridgeMessage, isAllowedApplyUrl, injectionFor } from "./bridge";
const base = { channel: "chagok.bridge", version: 1, payload: {} };
describe("untrusted bridge input", () => {
  it.each(["WEB_READY", "CLOSE_WEBVIEW", "PING", "PONG"])(
    "accepts %s",
    (type) => {
      expect(
        parseBridgeMessage(
          JSON.stringify({
            ...base,
            type,
            ...(["PING", "PONG"].includes(type) ? { requestId: "r1" } : {}),
          }),
        ).success,
      ).toBe(true);
    },
  );
  it.each([
    "{",
    null,
    [],
    { ...base, type: "PONG", requestId: "" },
    { ...base, type: "PONG", requestId: "x".repeat(129) },
    { ...base, type: "PING", requestId: 1 },
    { ...base, type: "FORM_READY" },
    { ...base, type: "WEB_READY", version: 2 },
    { ...base, type: "CLOSE_WEBVIEW", channel: "other" },
    { ...base, type: "WEB_READY", payload: { amount: 1 } },
    { ...base, type: "WEB_READY", payload: [] },
    { ...base, type: "WEB_READY", requestId: "extra" },
  ])("rejects invalid input %# without throwing", (input) =>
    expect(parseBridgeMessage(input).success).toBe(false),
  );
  it("limits navigation to exact origin and apply path", () => {
    for (const url of [
      "https://evil.test/apply",
      "http://localhost:3000/apply/other",
      "javascript:alert(1)",
      "http://localhost:3000/apply?redirect=x",
      "http://u:p@localhost:3000/apply",
    ])
      expect(isAllowedApplyUrl(url, "http://localhost:3000")).toBe(false);
    expect(
      isAllowedApplyUrl("http://localhost:3000/apply", "http://localhost:3000"),
    ).toBe(true);
  });
  it("serializes hostile requestId as data in injection", () => {
    const message = {
      ...base,
      version: 1 as const,
      channel: "chagok.bridge" as const,
      type: "PING" as const,
      requestId: '";throw new Error("bad");//\u2028',
    };
    let received: unknown;
    new Function("window", injectionFor(message))({
      __CHAGOK_BRIDGE__: {
        receive: (value: unknown) => {
          received = value;
        },
      },
    });
    expect(received).toEqual(message);
  });
});
