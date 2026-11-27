import { expect, it } from "vitest";
import { BenefitsCache, benefitKey } from "./cache";
import type { AuthState } from "../auth/session";

const state: AuthState = {
  status: "authenticated",
  session: {
    user: { id: "alice", companyId: "grove" },
    expiresAt: "2099-01-01T00:00:00Z",
  },
};
const session = {
  user: { id: "alice", companyId: "grove" },
  expiresAt: "2099-01-01T00:00:00Z",
};
it("30초 재방문은 재사용하고 수동 invalidate는 새로 조회한다", async () => {
  const cache = new BenefitsCache(state);
  let calls = 0;
  const options = {
    queryKey: benefitKey(state, "home", "2026-11"),

    queryFn: async () => ++calls,
  };
  expect(await cache.client.fetchQuery(options)).toBe(1);
  expect(await cache.client.fetchQuery(options)).toBe(1);
  await cache.client.invalidateQueries({ queryKey: options.queryKey });
  expect(await cache.client.fetchQuery(options)).toBe(2);
  cache.dispose();
});
it("사용자·회사·월·필터 캐시 키를 분리한다", () => {
  const base = benefitKey(state, "history", "2026-11", "SUBMITTED");
  const otherUser = {
    ...state,
    session: { ...session, user: { id: "bob", companyId: "grove" } },
  };
  const otherCompany = {
    ...state,
    session: { ...session, user: { id: "alice", companyId: "wave" } },
  };
  expect(benefitKey(otherUser, "history", "2026-11", "SUBMITTED")).not.toEqual(
    base,
  );
  expect(
    benefitKey(otherCompany, "history", "2026-11", "SUBMITTED"),
  ).not.toEqual(base);
  expect(benefitKey(state, "history", "2026-10", "SUBMITTED")).not.toEqual(
    base,
  );
  expect(benefitKey(state, "history", "2026-11", "APPROVED")).not.toEqual(base);
});
it.each<AuthState>([
  { status: "signedOut" },
  { status: "busy", retry: "signOut" },
  { status: "error" },
  { status: "demo" },
  {
    status: "authenticated",
    session: { user: { id: "bob" }, expiresAt: "2099-01-01T00:00:00Z" },
  },
])("인증 경계 %j에서 취소 무시 늦은 응답도 복구하지 않는다", async (next) => {
  const cache = new BenefitsCache(state);

  let complete: (value: string) => void = () => {};

  const promise = cache.client
    .fetchQuery({
      queryKey: benefitKey(state, "home", "2026-11"),

      queryFn: ({ signal }) => {
        expect(signal.aborted).toBe(false);
        return new Promise<string>((resolve) => {
          complete = resolve;
        });
      },
    })
    .catch(() => "cancelled");
  cache.observe(next);
  complete("alice private data");
  await promise;
  expect(cache.client.getQueryCache().getAll()).toHaveLength(0);
});
it("정상 foreground 확인 중에는 캐시를 유지하고 만료 시 지운다", () => {
  const cache = new BenefitsCache(state);
  cache.client.setQueryData(["home"], "private");
  cache.observe({ status: "busy", session: state.session });
  expect(cache.client.getQueryData(["home"])).toBe("private");
  cache.observe({
    ...state,
    session: { ...session, expiresAt: "2000-01-01T00:00:00Z" },
  });
  expect(cache.client.getQueryData(["home"])).toBeUndefined();
});

it("페이지 응답에서 소속 해제·변경이 발견되면 기존 캐시를 지우고 세션을 다시 확인한다", async () => {
  const { requireCompanyScope } = await import("./cache");
  for (const company of [null, { id: "wave" }]) {
    const cache = new BenefitsCache(state);
    cache.client.setQueryData(benefitKey(state, "history", "2026-11"), {
      pages: [{ company: { id: "grove" }, items: ["old-claim"] }],
    });
    let refreshes = 0;
    expect(() =>
      requireCompanyScope(state, { company }, () => {
        cache.dispose();
        refreshes++;
      }),
    ).toThrow("소속");
    expect(cache.client.getQueryCache().getAll()).toHaveLength(0);
    expect(refreshes).toBe(1);
  }
});

it("외부 검토 후 갱신은 30초 캐시도 무효화하고 새 상태를 읽는다", async () => {
  const cache = new BenefitsCache(state);
  let status = "SUBMITTED";
  const options = {
    queryKey: benefitKey(state, "detail", "claim"),

    queryFn: async () => status,
  };
  expect(await cache.client.fetchQuery(options)).toBe("SUBMITTED");
  status = "REJECTED";
  await cache.refresh();
  expect(await cache.client.fetchQuery(options)).toBe("REJECTED");
  cache.dispose();
});
