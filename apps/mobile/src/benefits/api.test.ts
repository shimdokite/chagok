import { afterEach, expect, it, vi } from "vitest";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { bridgeBase, type BridgeMessage } from "@chagok/contracts";
import { ClaimHost } from "../bridge/claim-host";
import { benefitsClient } from "./api";

vi.mock("../auth/storage", () => ({
  storage: { get: async () => "test-session" },
}));
vi.mock("../lib/trpc", () => ({ webOrigin: "http://localhost:3000" }));

const input = {
  requestId: "123e4567-e89b-42d3-a456-426614174000",
  title: "식사",
  category: "식비",
  amount: 1000,
  usedOn: "2026-11-19",
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function pendingTransport() {
  let commit!: () => void;
  let started!: () => void;
  const sent = new Promise<void>((resolve) => {
    started = resolve;
  });
  vi.stubGlobal(
    "fetch",
    (_url: unknown, options: RequestInit) =>
      new Promise<Response>((resolve, reject) => {
        const signal = options.signal!;
        if (signal.aborted) {
          reject(signal.reason);
          return;
        }
        signal.addEventListener("abort", () => reject(signal.reason), {
          once: true,
        });
        commit = () =>
          resolve(Response.json({ result: { data: { id: "saved" } } }));
        started();
      }),
  );
  return {
    sent,

    commit: () => commit(),
  };
}

it("refreshes an active home after a sent claim commits beyond screen close", async () => {
  let balance = 65000;
  const cache = new QueryClient();
  const key = ["benefits", "home"];
  cache.setQueryData(key, balance);
  const observer = new QueryObserver(cache, {
    queryKey: key,

    queryFn: async () => balance,

    staleTime: 30000,
  });
  const unsubscribe = observer.subscribe(() => {});
  const output: BridgeMessage[] = [];
  const host = new ClaimHost({
    origin: "http://localhost:3000",

    access: () => ({ scope: "user-company", mode: "live" }),

    send: (message) => output.push(message),

    load: async () => ({ kind: "noPolicy", month: "2026-11" }),

    async create(value, signal) {
      const client = await benefitsClient(signal);
      return client.benefits.create.mutate(value);
    },

    invalidate: () => cache.invalidateQueries({ queryKey: ["benefits"] }),
  });
  const transport = pendingTransport();
  try {
    host.announce();
    const init = output[0];
    if (init.type !== "FORM_INIT") throw new Error("Expected init");
    const pending = host.receive(
      {
        ...bridgeBase,
        type: "CLAIM_SUBMIT",
        connectionId: init.connectionId,
        requestId: "rpc",
        payload: input,
      },
      "http://localhost:3000/apply",
    );
    await transport.sent;
    host.reset();
    // Let an aborted request refetch the old balance before the server commits.
    await new Promise((resolve) => setTimeout(resolve, 10));
    balance = 64000;
    transport.commit();
    await pending;
    await vi.waitFor(() => expect(cache.getQueryData(key)).toBe(64000));
    expect(output).toHaveLength(1);
  } finally {
    unsubscribe();
    cache.clear();
  }
});

it("does not send a claim when its screen closed before dispatch", async () => {
  const abort = new AbortController();
  const client = await benefitsClient(abort.signal);
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  abort.abort();
  await expect(client.benefits.create.mutate(input)).rejects.toThrow();
  expect(fetch).not.toHaveBeenCalled();
});

it("still aborts policy reads when the screen closes", async () => {
  const transport = pendingTransport();
  const abort = new AbortController();
  const client = await benefitsClient(abort.signal);
  const result = client.benefits.home
    .query({ month: "2026-11" })
    .catch((e) => e);
  await transport.sent;
  abort.abort();
  expect(await result).toBeInstanceOf(Error);
});

it("bounds a sent claim by the existing eight-second request timeout", async () => {
  const timeout = new AbortController();
  const clock = vi
    .spyOn(AbortSignal, "timeout")
    .mockReturnValue(timeout.signal);
  const transport = pendingTransport();
  const client = await benefitsClient(new AbortController().signal);
  const result = client.benefits.create.mutate(input).catch((e) => e);
  await transport.sent;
  expect(clock).toHaveBeenCalledWith(8000);
  timeout.abort(new DOMException("Timed out", "TimeoutError"));
  expect(await result).toBeInstanceOf(Error);
});
