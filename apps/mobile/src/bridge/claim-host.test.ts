import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { bridgeBase, type BridgeMessage } from "@chagok/contracts";
import { claimAccess, ClaimHost } from "./claim-host";

const origin = "http://localhost:3000";
const input = {
  requestId: "123e4567-e89b-42d3-a456-426614174000",
  title: "식사",
  category: "식비",
  amount: 1000,
  usedOn: "2026-11-19",
};
const home = {
  kind: "ready" as const,
  month: "2026-11",
  companyName: "가상 회사",
  categories: ["식비"],
  available: 65000,
};

function setup(create = async () => ({ id: "saved" })) {
  const output: BridgeMessage[] = [];
  let scope: string | null = "user-company-session";
  const cache = new QueryClient();
  cache.setQueryData(["benefits", "home"], 65000);
  cache.setQueryData(["benefits", "history"], []);
  const host = new ClaimHost({
    origin,

    access: () => ({ scope, mode: scope ? "live" : "unavailable" }),

    send: (message) => output.push(message),

    load: async () => home,

    create,

    invalidate: () => cache.invalidateQueries({ queryKey: ["benefits"] }),
  });
  host.receive({ ...bridgeBase, type: "WEB_READY" }, `${origin}/apply`);
  const init = output[0];
  if (init.type !== "FORM_INIT") throw new Error("Expected init");
  const request = {
    ...bridgeBase,
    type: "CLAIM_SUBMIT",
    connectionId: init.connectionId,
    requestId: "rpc",
    payload: input,
  };
  return {
    host,
    output,
    cache,
    request,

    changeScope: () => {
      scope = null;
    },
  };
}

describe("authenticated claim host", () => {
  it("saves and invalidates both home and history", async () => {
    const s = setup();
    await s.host.receive(s.request, `${origin}/apply`);
    expect(s.output.at(-1)).toMatchObject({
      type: "CLAIM_RESULT",
      payload: { id: "saved" },
    });
    expect(s.cache.getQueryState(["benefits", "home"])?.isInvalidated).toBe(
      true,
    );
    expect(s.cache.getQueryState(["benefits", "history"])?.isInvalidated).toBe(
      true,
    );
  });
  it("does not turn a refresh failure into a create failure", async () => {
    const s = setup();
    s.cache.invalidateQueries = async () => {
      throw new Error("offline");
    };
    await s.host.receive(s.request, `${origin}/apply`);
    expect(s.output.at(-1)?.type).toBe("CLAIM_RESULT");
  });
  it.each([
    "https://other.test/apply",
    `${origin}/apply?token=x`,
    `${origin}/other`,
  ])("refuses untrusted URL %s", async (url) => {
    const s = setup();
    await s.host.receive(s.request, url);
    expect(s.output).toHaveLength(1);
    expect(s.cache.getQueryState(["benefits", "home"])?.isInvalidated).toBe(
      false,
    );
  });
  it("refuses old connection after reload", async () => {
    const s = setup();
    s.host.reset();
    await s.host.receive(s.request, `${origin}/apply`);
    expect(s.output).toHaveLength(1);
  });
  it("refuses submission after session changes", async () => {
    const s = setup();
    s.changeScope();
    await s.host.receive(s.request, `${origin}/apply`);
    expect(s.output.at(-1)).toMatchObject({
      type: "FORM_ERROR",
      payload: { code: "UNAUTHORIZED" },
    });
  });
  it("drops late success after close but invalidates a committed write", async () => {
    let finish!: (value: { id: string }) => void;
    const s = setup(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const pending = s.host.receive(s.request, `${origin}/apply`);
    s.host.reset();
    finish({ id: "late" });
    await pending;
    expect(s.output).toHaveLength(1);
    expect(s.cache.getQueryState(["benefits", "home"])?.isInvalidated).toBe(
      true,
    );
  });
});

it("preserves the same usable identity during foreground session validation", () => {
  const session = {
    user: { id: "a", companyId: "company-a" },
    expiresAt: "2099-01-01T00:00:00Z",
  };
  expect(claimAccess({ status: "busy", session })).toEqual(
    claimAccess({ status: "authenticated", session }),
  );
  expect(claimAccess({ status: "busy" }).mode).toBe("unavailable");
});
it("invalidates possibly committed writes even after a transport failure", async () => {
  const s = setup(async () => {
    throw new Error("response lost");
  });
  await s.host.receive(s.request, `${origin}/apply`);
  expect(s.cache.getQueryState(["benefits", "home"])?.isInvalidated).toBe(true);
  expect(s.cache.getQueryState(["benefits", "history"])?.isInvalidated).toBe(
    true,
  );
  expect(s.output.at(-1)).toMatchObject({
    type: "FORM_ERROR",
    payload: { code: "UNKNOWN" },
  });
});
