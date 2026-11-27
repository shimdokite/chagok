import { afterEach, expect, it, vi } from "vitest";
import {
  QueryClient,
  QueryObserver,
  type QueryObserverOptions,
} from "@tanstack/react-query";
import { SessionController, type Session } from "../auth/session";
import { BenefitsCache } from "./cache";
import { useDetail } from "./queries";

// Capture the real hook's options without a native renderer, then drive them
// with a real QueryObserver and SessionController. Native layout is not modeled.
const host = vi.hoisted(() => ({
  ref: { current: false },
  onFocus: undefined as (() => void) | undefined,
  client: undefined as unknown as QueryClient,
  controller: undefined as unknown as SessionController,
}));
vi.mock("react", async (original) => ({
  ...(await original<object>()),

  useRef: () => host.ref,

  useCallback: (callback: unknown) => callback,
}));
vi.mock("expo-router", () => ({
  useFocusEffect: (callback: () => void) => {
    host.onFocus = callback;
  },
}));
vi.mock("@tanstack/react-query", async (original) => ({
  ...(await original<object>()),

  useQuery: (options: unknown) => options,

  useQueryClient: () => host.client,
}));
vi.mock("../auth/SessionProvider", () => ({
  useSession: () => ({
    state: host.controller.snapshot(),
    controller: host.controller,
  }),
}));
vi.mock("../auth/storage", () => ({
  storage: { get: async () => "a".repeat(64) },
}));
vi.mock("../lib/trpc", () => ({ webOrigin: "http://localhost:3000" }));

const session: Session = {
  user: { id: "alice", companyId: "grove" },
  expiresAt: "2099-01-01T00:00:00Z",
};
const cleanup: (() => void)[] = [];

async function setup(code: "NOT_FOUND" | "UNAUTHORIZED" = "NOT_FOUND") {
  vi.useFakeTimers();
  host.ref = { current: false };
  let requests = 0;
  let sessionChecks = 0;
  const controller = new SessionController({
    storage: {
      get: async () => "a".repeat(64),

      set: async () => {},

      remove: async () => {},
    },
    api: {
      session: async () => {
        sessionChecks++;
        await new Promise((resolve) => setTimeout(resolve, 5));
        if (code === "UNAUTHORIZED") throw { code };
        return session;
      },

      signIn: async () => ({ ...session, token: "a".repeat(64) }),

      signOut: async () => {},
    },
    google: {
      signIn: async () => ({ type: "cancelled" }),

      signOut: async () => {},
    },

    now: () => Date.now(),

    wallNow: () => Date.now(),

    onMeasurement: () => {},
  });
  controller.state = { status: "authenticated", session };
  host.controller = controller;
  const cache = new BenefitsCache(controller.snapshot());
  host.client = cache.client;
  vi.stubGlobal("fetch", async () => {
    requests++;
    await new Promise((resolve) => setTimeout(resolve, 5));
    return new Response(
      JSON.stringify({
        error: {
          message: "Unavailable",
          code: code === "NOT_FOUND" ? -32004 : -32001,
          data: { code, httpStatus: code === "NOT_FOUND" ? 404 : 401 },
        },
      }),
      { status: code === "NOT_FOUND" ? 404 : 401 },
    );
  });

  function options() {
    return useDetail("missing") as unknown as QueryObserverOptions;
  }

  const observer = new QueryObserver(cache.client, options());
  cleanup.push(() => {
    observer.destroy();
    cache.dispose();
  });
  cleanup.push(
    controller.subscribe(() => {
      cache.observe(controller.snapshot());
      observer.setOptions(options());
    }),
  );
  cleanup.push(observer.subscribe(() => {}));
  await vi.advanceTimersByTimeAsync(100);
  return {
    controller,
    observer,

    setError: (next: "NOT_FOUND" | "UNAUTHORIZED") => {
      code = next;
    },

    counts: () => ({ requests, sessionChecks }),
  };
}

afterEach(() => {
  cleanup
    .splice(0)
    .reverse()
    .forEach((dispose) => dispose());
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("없는 상세는 세션을 한 번 확인한 뒤 오류를 유지하고 반복 조회하지 않는다", async () => {
  const run = await setup();
  expect(run.controller.snapshot().status).toBe("authenticated");
  expect(run.observer.getCurrentResult().status).toBe("error");
  expect(run.counts()).toEqual({ requests: 2, sessionChecks: 1 });
  await vi.advanceTimersByTimeAsync(100);
  expect(run.counts()).toEqual({ requests: 2, sessionChecks: 1 });
  const retry = run.observer.refetch();
  await vi.advanceTimersByTimeAsync(10);
  await retry;
  expect(run.counts()).toEqual({ requests: 3, sessionChecks: 1 });
});

it("상세 인증 거부는 실제 만료 복구를 거쳐 로그인 상태를 해제한다", async () => {
  const run = await setup("UNAUTHORIZED");
  expect(run.controller.snapshot().status).toBe("signedOut");
  expect(run.counts()).toEqual({ requests: 1, sessionChecks: 1 });
});

it("없는 상세를 확인한 뒤 세션이 만료돼도 인증 복구를 생략하지 않는다", async () => {
  const run = await setup();
  run.setError("UNAUTHORIZED");
  const retry = run.observer.refetch();
  await vi.advanceTimersByTimeAsync(100);
  await retry;
  expect(run.controller.snapshot().status).toBe("signedOut");
  expect(run.counts()).toEqual({ requests: 3, sessionChecks: 2 });
});

it("화면 포커스가 활성 상세를 실제로 재조회한다", async () => {
  const run = await setup();
  const before = run.counts().requests;
  host.onFocus?.();
  await vi.advanceTimersByTimeAsync(20);
  expect(run.counts().requests).toBe(before + 1);
  expect(run.counts().sessionChecks).toBe(1);
});
