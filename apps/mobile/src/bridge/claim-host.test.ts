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

it("suppresses receipt completion after cancellation, reload and scope change", async () => {
  for (const end of ["cancel", "reset", "scope"]) {
    const output: BridgeMessage[] = [];
    let scope: string | null = "a";
    let finish!: (value: { kind: "cancelled" }) => void;
    const host = new ClaimHost({
      origin,

      access: () => ({ scope, mode: "live" }),

      send: (message) => output.push(message),

      load: async () => home,

      create: async () => ({ id: "saved" }),

      invalidate: async () => {},

      pickReceipt: () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    });
    host.announce();
    const init = output[0];
    if (init.type !== "FORM_INIT") throw new Error("init");
    const request = {
      ...bridgeBase,
      connectionId: init.connectionId,
      requestId: "pick",
      type: "RECEIPT_PICK",
      payload: { source: "library" },
    };
    const pending = host.receive(request, `${origin}/apply`);
    expect(finish).toBeTypeOf("function");
    if (end === "reset") host.reset();
    else if (end === "scope") scope = "b";
    else
      await host.receive(
        { ...request, type: "RECEIPT_CANCEL", payload: {} },
        `${origin}/apply`,
      );
    finish({ kind: "cancelled" });
    await pending;
    expect(output.filter((m) => m.type === "RECEIPT_RESULT")).toHaveLength(0);
  }
});

it("returns a receipt error for session expiry before or during selection", async () => {
  for (const during of [false, true]) {
    let valid = true;
    const output: BridgeMessage[] = [];
    const host = new ClaimHost({
      origin,

      access: () => ({
        scope: valid ? "a" : null,
        mode: valid ? "live" : "unavailable",
      }),

      send: (message) => output.push(message),

      load: async () => home,

      create: async () => ({ id: "saved" }),

      invalidate: async () => {},

      pickReceipt: async () => {
        valid = false;
        return { kind: "cancelled" };
      },
    });
    host.announce();
    const init = output[0];
    if (init.type !== "FORM_INIT") throw new Error("init");
    if (!during) valid = false;
    await host.receive(
      {
        ...bridgeBase,
        type: "RECEIPT_PICK",
        connectionId: init.connectionId,
        requestId: "expired",
        payload: { source: "library" },
      },
      `${origin}/apply`,
    );
    expect(output.at(-1)).toMatchObject({
      type: "RECEIPT_ERROR",
      requestId: "expired",
      payload: { code: "UNAUTHORIZED" },
    });
  }
});

it("correlates receipt ACK with origin, request, connection and scope, clears reset", async () => {
  const { ReceiptJournal } = await import("../receipts/metrics");
  let now = 0;
  let scope = "a";
  const journal = new ReceiptJournal(() => now);
  const output: BridgeMessage[] = [];
  const host = new ClaimHost({
    origin,

    access: () => ({ scope, mode: "live" }),

    send: (message) => output.push(message),

    load: async () => home,

    create: async () => ({ id: "saved" }),

    invalidate: async () => {},

    pickReceipt: async () => ({ kind: "cancelled" }),

    measureReceipt: (source) => journal.start(source),
  });
  host.announce();
  const init = output[0];
  if (init.type !== "FORM_INIT") throw new Error("init");
  const pick = {
    ...bridgeBase,
    type: "RECEIPT_PICK",
    connectionId: init.connectionId,
    requestId: "pick",
    payload: { source: "library" },
  };
  await host.receive(pick, `${origin}/apply`);
  const ack = { ...pick, type: "RECEIPT_ACK", payload: {} };
  await host.receive(pick, `${origin}/apply`);
  expect(journal.snapshot().started).toBe(1);
  now = 9;
  await host.receive(ack, "https://other.test/apply");
  await host.receive({ ...ack, requestId: "other" }, `${origin}/apply`);
  await host.receive({ ...ack, connectionId: "old" }, `${origin}/apply`);
  expect(journal.snapshot().samples).toHaveLength(0);
  await host.receive(ack, `${origin}/apply`);
  await host.receive(ack, `${origin}/apply`);
  expect(journal.snapshot().samples).toMatchObject([
    { delivery: "acked", bridgeAckMs: 9 },
  ]);
  await host.receive({ ...pick, requestId: "reset" }, `${origin}/apply`);
  host.reset();
  expect(journal.snapshot().samples.at(-1)?.delivery).toBe("aborted");
  host.announce();
  const next = output.at(-1);
  if (next?.type !== "FORM_INIT") throw new Error("init");
  await host.receive(
    { ...pick, connectionId: next.connectionId, requestId: "scope" },
    `${origin}/apply`,
  );
  scope = "b";
  await host.receive(
    { ...ack, connectionId: next.connectionId, requestId: "scope" },
    `${origin}/apply`,
  );
  expect(journal.snapshot().samples.at(-1)?.delivery).toBe("aborted");
});
