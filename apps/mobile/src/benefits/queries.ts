import { useCallback, useRef } from "react";
import { useFocusEffect } from "expo-router";
import {
  useQuery,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useSession } from "../auth/SessionProvider";
import { benefitKey, requireCompanyScope } from "./cache";
import { benefitsClient, needsSessionRefresh } from "./api";
import { demoHome, demoHistory, demoDetail, demoPolicy } from "./demo";
import type { HistoryInput, HistoryData } from "@chagok/contracts/benefits";

function useBenefitAccess() {
  const { state, controller } = useSession();
  const queryClient = useQueryClient();
  const missingRecordChecked = useRef(false);
  const isDemo = state.status === "demo";
  const enabled = isDemo || state.status === "authenticated";
  useFocusEffect(
    useCallback(() => {
      if (!isDemo && enabled)
        void queryClient.invalidateQueries({ queryKey: ["benefits"] });
    }, [isDemo, enabled, queryClient]),
  );

  async function read<
    T extends { company: { id: string } | null } | { kind: "unassigned" },
  >(
    signal: AbortSignal,
    load: (client: Awaited<ReturnType<typeof benefitsClient>>) => Promise<T>,
  ) {
    try {
      const result = await load(await benefitsClient(signal));
      signal.throwIfAborted();
      requireCompanyScope(state, result, () => {
        void queryClient.cancelQueries();
        queryClient.clear();
        void controller.restore("retry");
      });
      missingRecordChecked.current = false;
      return result;
    } catch (error) {
      // Re-enabling an errored query after restore can fetch it again.
      // Recheck missing records once; authentication failures always recover.
      if (needsSessionRefresh(error, missingRecordChecked.current)) {
        missingRecordChecked.current = true;
        void controller.restore("retry");
      }
      throw error;
    }
  }

  return { state, isDemo, enabled, read };
}

export function useHome(month: string) {
  const access = useBenefitAccess();
  return useQuery({
    queryKey: benefitKey(access.state, "home", month),
    enabled: access.enabled,

    queryFn: ({ signal }) =>
      access.isDemo
        ? demoHome(month)
        : access.read(signal, (client) =>
            client.benefits.home.query({ month }, { signal }),
          ),
  });
}

export function useHistory(input: Omit<HistoryInput, "cursor">) {
  const access = useBenefitAccess();
  return useInfiniteQuery({
    queryKey: benefitKey(
      access.state,
      "history",
      input.month,
      input.status ?? "ALL",
    ),
    enabled: access.enabled,
    initialPageParam: undefined as HistoryInput["cursor"],

    queryFn: ({ signal, pageParam }): Promise<HistoryData> | HistoryData =>
      access.isDemo
        ? demoHistory(input)
        : access.read(signal, (client) =>
            client.benefits.history.query(
              { ...input, cursor: pageParam },
              { signal },
            ),
          ),

    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useDetail(id: string) {
  const access = useBenefitAccess();
  return useQuery({
    queryKey: benefitKey(access.state, "detail", id),
    enabled: access.enabled,

    queryFn: ({ signal }) =>
      access.isDemo
        ? demoDetail(id)
        : access.read(signal, (client) =>
            client.benefits.detail.query({ id }, { signal }),
          ),
  });
}

export function usePolicy(month: string) {
  const access = useBenefitAccess();
  return useQuery({
    queryKey: benefitKey(access.state, "policy", month),
    enabled: access.enabled,

    queryFn: ({ signal }) =>
      access.isDemo
        ? demoPolicy(month)
        : access.read(signal, (client) =>
            client.benefits.policy.query({ month }, { signal }),
          ),
  });
}
