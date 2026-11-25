import { afterEach, expect, it, vi } from "vitest";
import type { RefObject } from "react";
import type { WebView } from "react-native-webview";
import type { SessionController } from "../auth/session";

// Drive only this hook's subscription and cleanup. This is not a native UI
// renderer: session transitions, ClaimHost and FormClient remain real.
const harness = vi.hoisted(() => ({
  controller: null as SessionController | null,
  cleanups: [] as (() => void)[],
  pick: vi.fn(),
}));
vi.mock("react", () => ({
  useState: (initialize: () => unknown) => [initialize()],

  useEffect: (effect: () => () => void) => harness.cleanups.push(effect()),
}));
vi.mock("../auth/SessionProvider", () => ({
  useSession: () => ({ controller: harness.controller }),
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: async () => {} }),
}));
vi.mock("../lib/trpc", () => ({ webOrigin: "http://localhost:3000" }));
vi.mock("../benefits/api", () => ({
  benefitsClient: async () => ({
    benefits: {
      home: {
        query: async () => ({
          kind: "ready",
          company: { id: "company-a", name: "Test company" },
          policy: { categories: ["식비"] },
          amounts: { available: 1000 },
        }),
      },
    },
  }),
}));
vi.mock("../receipts/native", () => ({
  pickAndUploadReceipt: (...args: unknown[]) => harness.pick(...args),
}));
vi.mock("../receipts/metrics-native", () => ({
  startReceiptMeasurement: () => undefined,
}));

import { SessionController as Controller } from "../auth/session";
import type { BridgeMessage } from "@chagok/contracts";
import { FormClient } from "../../../web/src/components/apply/form-client";
import { useClaimHost } from "./useClaimHost";

afterEach(() => {
  harness.cleanups.splice(0).forEach((cleanup) => cleanup());
  harness.pick.mockReset();
});

it.each(["expired", "company", "same"])(
  "handles a real controller restore during upload: %s",
  async (change) => {
    const session = {
      user: { id: "test-user", companyId: "company-a" },
      expiresAt: "2099-01-01T00:00:00Z",
    };
    let current = session;
    const storage = {
      get: async () => "synthetic-token",

      set: async () => {},

      remove: vi.fn(async () => {}),
    };
    const controller = new Controller({
      storage,
      api: {
        signIn: async () => ({ ...session, token: "synthetic-token" }),

        session: async () => current,

        signOut: async () => {},
      },
      google: {
        signIn: async () => ({ type: "cancelled" }),

        signOut: async () => {},
      },

      now: () => performance.now(),

      wallNow: Date.now,

      onMeasurement: () => {},
    });
    await controller.restore("startup");
    harness.controller = controller;
    const sent: BridgeMessage[] = [];
    const requests: BridgeMessage[] = [];
    const client = new FormClient((message) => requests.push(message), "2026-11");
    const ref = {
      current: {
        injectJavaScript(script: string) {
          // Capture through the same public receiver invoked by injectionFor.
          const window = {
            __CHAGOK_BRIDGE__: {
              receive(message: BridgeMessage) {
                sent.push(message);
                client.receive(message);
              },
            },
          };
          Function("window", script)(window);
        },
      },
    } as unknown as RefObject<WebView<object> | null>;
    const host = useClaimHost(ref);
    host.announce();
    const init = sent.at(-1);
    if (init?.type !== "FORM_INIT") throw new Error("Expected init");
    client.receive({
      ...requests.at(-1),
      type: "FORM_CONTEXT",
      payload: {
        kind: "ready",
        month: "2026-11",
        companyName: "Test company",
        categories: ["식비"],
        available: 1000,
      },
    });
    client.pickReceipt("library");
    const receipt = {
      attachmentId: "123e4567-e89b-42d3-a456-426614174001",
      mimeType: "image/png",
      byteSize: 100,
    };
    client.receive({
      ...requests.at(-1),
      type: "RECEIPT_RESULT",
      payload: { kind: "uploaded", receipt },
    });
    expect(client.snapshot().receipt).toEqual(receipt);
    let finish!: (value: { kind: "cancelled" }) => void;
    let signal!: AbortSignal;
    harness.pick.mockImplementation((_source, _company, abort) => {
      signal = abort;
      return new Promise((resolve) => {
        finish = resolve;
      });
    });
    client.pickReceipt("library");
    const pending = host.receive(requests.at(-1), "http://localhost:3000/apply");
    expect(signal.aborted).toBe(false);
    if (change === "expired")
      current = { ...session, expiresAt: "2000-01-01T00:00:00Z" };
    if (change === "company")
      current = { ...session, user: { ...session.user, companyId: "company-b" } };
    await controller.restore("foreground");
    expect(signal.aborted).toBe(change !== "same");
    finish({ kind: "cancelled" });
    await pending;
    const results = sent.filter((message) => message.type === "RECEIPT_RESULT");
    expect(results).toHaveLength(change === "same" ? 1 : 0);
    if (change !== "same") {
      expect(sent.at(-1)).toMatchObject({
        type: "FORM_INIT",
        payload: { mode: change === "expired" ? "unavailable" : "live" },
      });
      expect(client.snapshot().receipt).toBeUndefined();
    } else {
      expect(client.snapshot().receipt).toEqual(receipt);
      expect(client.snapshot().receiptBusy).toBe(false);
    }
    expect(storage.remove).toHaveBeenCalledTimes(change === "expired" ? 1 : 0);
    client.dispose();
  },
);
