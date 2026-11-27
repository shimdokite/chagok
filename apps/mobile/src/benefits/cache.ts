import { QueryClient } from "@tanstack/react-query";
import type { AuthState } from "../auth/session";

export function sessionScope(state: AuthState) {
  const session = state.session;
  const usable = state.status === "authenticated" || state.status === "busy";
  if (!usable || !session || Date.parse(session.expiresAt) <= Date.now())
    return state.status;
  return `${session.user.id}:${session.user.companyId ?? "unassigned"}:${session.expiresAt}`;
}

export function benefitKey(
  state: AuthState,
  resource: string,
  ...filters: unknown[]
) {
  return [
    "benefits",
    state.session?.user.id ?? "demo",
    state.session?.user.companyId ?? "unassigned",
    resource,
    ...filters,
  ] as const;
}

export class BenefitsCache {
  readonly client = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30000,
        gcTime: 5 * 60000,
        retry: false,
        refetchOnWindowFocus: false,
        networkMode: "always",
      },
    },
  });
  private scope: string;

  constructor(state: AuthState) {
    this.scope = sessionScope(state);
  }

  observe(state: AuthState) {
    if (sessionScope(state) !== this.scope) this.dispose();
  }

  refresh() {
    return this.client.invalidateQueries({ queryKey: ["benefits"] });
  }

  dispose() {
    void this.client.cancelQueries();
    this.client.clear();
  }
}

export function requireCompanyScope(
  state: AuthState,
  data: { company: { id: string } | null } | { kind: "unassigned" },
  reset: () => void,
) {
  const actual = "company" in data ? (data.company?.id ?? null) : null;
  const expected = state.session?.user.companyId ?? null;
  if (actual === expected) return;
  reset();
  throw new Error("소속이 변경됐어요. 로그인 정보를 다시 확인하고 있어요.");
}
