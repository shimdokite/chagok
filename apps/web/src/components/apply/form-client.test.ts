import { afterEach, describe, expect, it, vi } from "vitest";
import { bridgeBase, type BridgeMessage } from "@chagok/contracts";
import { FormClient } from "./form-client";

const clients: FormClient[] = [];
const draft = {
  title: "점심",
  category: "식비",
  amount: 1000,
  usedOn: "2026-11-19",
};
const context = {
  kind: "ready" as const,
  month: "2026-11",
  companyName: "가상 회사",
  categories: ["식비"],
  available: 65000,
};

function setup() {
  const messages: BridgeMessage[] = [];
  const client = new FormClient((message) => messages.push(message), "2026-11");
  clients.push(client);
  client.receive({
    ...bridgeBase,
    type: "FORM_INIT",
    connectionId: "load",
    payload: { mode: "live" },
  });
  const load = messages.at(-1);
  if (!load || load.type !== "FORM_LOAD") throw new Error("Expected load");
  client.receive({ ...load, type: "FORM_CONTEXT", payload: context });
  return { client, messages };
}

afterEach(() => {
  clients.splice(0).forEach((c) => c.dispose());
  vi.useRealTimers();
});
describe("claim form state", () => {
  it("enables only after a correlated policy response", () => {
    const s = setup();
    expect(s.client.snapshot().phase).toBe("ready");
    expect(s.client.snapshot().context).toEqual(context);
  });
  it("does not issue a create for invalid, excess or unsupported input", () => {
    const s = setup();
    for (const change of [
      { amount: 0 },
      { amount: 65001 },
      { category: "없는 항목" },
      { title: " " },
      { usedOn: "2026-02-30" },
    ]) {
      s.client.submit({ ...draft, ...change });
    }
    expect(s.messages.filter((m) => m.type === "CLAIM_SUBMIT")).toHaveLength(0);
  });
  it("ignores double submit and retries an ambiguous result with the same UUID and data", () => {
    vi.useFakeTimers();
    const s = setup();
    s.client.submit(draft);
    s.client.submit(draft);
    const first = s.messages.at(-1);
    if (first?.type !== "CLAIM_SUBMIT") throw new Error("Expected submission");
    expect(s.messages.filter((m) => m.type === "CLAIM_SUBMIT")).toHaveLength(1);
    vi.advanceTimersByTime(12000);
    expect(s.client.snapshot().phase).toBe("uncertain");
    s.client.retry();
    const second = s.messages.at(-1);
    expect(second).toMatchObject({
      type: "CLAIM_SUBMIT",
      payload: first.payload,
    });
    if (second?.type !== "CLAIM_SUBMIT") throw new Error("Expected retry");
    s.client.receive({
      ...second,
      type: "CLAIM_RESULT",
      payload: { id: "saved" },
    });
    expect(s.client.snapshot()).toMatchObject({
      phase: "success",
      savedId: "saved",
    });
    s.client.submit(draft);
    expect(s.messages.filter((m) => m.type === "CLAIM_SUBMIT")).toHaveLength(2);
  });
  it("allows correction only on a definitive server rejection", () => {
    const s = setup();
    s.client.submit(draft);
    const request = s.messages.at(-1);
    if (request?.type !== "CLAIM_SUBMIT")
      throw new Error("Expected submission");
    s.client.receive({
      ...request,
      type: "FORM_ERROR",
      payload: { code: "BAD_REQUEST" },
    });
    expect(s.client.snapshot().phase).toBe("loading");
    const load = s.messages.at(-1);
    if (load?.type !== "FORM_LOAD") throw new Error("Expected refresh");
    s.client.receive({
      ...load,
      type: "FORM_CONTEXT",
      payload: { ...context, available: 5000 },
    });
    expect(s.client.snapshot().context).toMatchObject({ available: 5000 });
    s.client.submit({ ...draft, amount: 2000 });
    const next = s.messages.at(-1);
    if (next?.type !== "CLAIM_SUBMIT")
      throw new Error("Expected new submission");
    expect(next.payload.requestId).not.toBe(request.payload.requestId);
  });
  it("ignores stale response after another connection and cleans timers on close", () => {
    vi.useFakeTimers();
    const s = setup();
    s.client.submit(draft);
    const request = s.messages.at(-1);
    s.client.receive({
      ...bridgeBase,
      type: "FORM_INIT",
      connectionId: "new",
      payload: { mode: "unavailable" },
    });
    s.client.receive({
      ...request,
      type: "CLAIM_RESULT",
      payload: { id: "old" },
    });
    expect(s.client.snapshot().mode).toBe("unavailable");
    expect(s.client.snapshot().savedId).toBeUndefined();
    s.client.dispose();
    expect(vi.getTimerCount()).toBe(0);
  });
});

it("does not allow another create after authentication rejection", () => {
  const s = setup();
  s.client.submit(draft);
  const request = s.messages.at(-1);
  s.client.receive({
    ...request,
    type: "FORM_ERROR",
    payload: { code: "UNAUTHORIZED" },
  });
  s.client.submit(draft);
  expect(s.messages.filter((m) => m.type === "CLAIM_SUBMIT")).toHaveLength(1);
});
it("times out an old host that never initializes the form", () => {
  vi.useFakeTimers();
  const client = new FormClient(() => {}, "2026-11");
  clients.push(client);
  client.start();
  vi.advanceTimersByTime(12000);
  expect(client.snapshot().phase).toBe("error");
});
it("blocks a resumed uncertain document until history is checked", () => {
  const s = setup();
  s.client.submit(draft);
  s.client.dispose();
  s.client.start();
  s.client.receive({
    ...bridgeBase,
    type: "FORM_INIT",
    connectionId: "new-page",
    payload: { mode: "live" },
  });
  s.client.submit(draft);
  expect(s.client.snapshot().phase).toBe("interrupted");
  expect(s.messages.filter((m) => m.type === "CLAIM_SUBMIT")).toHaveLength(1);
});
