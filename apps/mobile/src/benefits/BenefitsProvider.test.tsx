import { expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { QueryObserver } from "@tanstack/react-query";
import { BenefitsCache } from "./cache";
import { BenefitsProvider } from "./BenefitsProvider";
import type { AuthState } from "../auth/session";

const host = vi.hoisted(() => ({
  cache: undefined as BenefitsCache | undefined,
  active: undefined as ((state: string) => void) | undefined,
  effect: undefined as (() => void) | undefined,
  state: {
    status: "authenticated",
    session: {
      user: { id: "a", companyId: "c" },
      expiresAt: "2099-01-01T00:00:00Z",
    },
  } as AuthState,
}));
vi.mock("react", async (original) => ({
  ...(await original<object>()),

  useState: (initialize: () => BenefitsCache) => {
    host.cache = initialize();
    return [host.cache];
  },

  useEffect: (callback: () => () => void) => {
    host.effect = callback();
  },
}));
vi.mock("react-native", () => ({
  AppState: {
    addEventListener: (_name: string, callback: (state: string) => void) => {
      host.active = callback;
      return {
        remove: () => {
          host.active = undefined;
        },
      };
    },
  },
}));
vi.mock("../auth/SessionProvider", () => ({
  useSession: () => ({
    state: host.state,
    controller: {
      snapshot: () => host.state,

      subscribe: () => () => {},
    },
  }),
}));

it("앱 활성화는 활성 쿼리를 갱신하고 구독 해제 뒤 재조회하지 않는다", async () => {
  const element = BenefitsProvider({ children: null });
  const Scope = element.type as (props: { children: ReactNode }) => ReactNode;
  Scope({ children: null });
  if (!host.cache) throw new Error("Provider did not initialize cache");
  const client = host.cache.client;
  let status = "SUBMITTED";
  const observer = new QueryObserver(client, {
    queryKey: ["benefits", "detail"],

    queryFn: async () => status,
  });
  const unsubscribe = observer.subscribe(() => {});
  try {
    await observer.refetch();
    expect(observer.getCurrentResult().data).toBe("SUBMITTED");
    status = "APPROVED";
    host.active?.("background");
    expect(observer.getCurrentResult().data).toBe("SUBMITTED");
    host.active?.("active");
    await vi.waitFor(() =>
      expect(observer.getCurrentResult().data).toBe("APPROVED"),
    );
    host.effect?.();
    expect(host.active).toBeUndefined();
    expect(client.getQueryCache().getAll()).toHaveLength(0);
  } finally {
    unsubscribe();
    observer.destroy();
    host.cache?.dispose();
  }
});
