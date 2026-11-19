import { createTRPCClient, httpLink, TRPCClientError } from "@trpc/client";
import type { AppRouter } from "@chagok/api";
import { storage } from "../auth/storage";
import { webOrigin } from "../lib/trpc";

export async function benefitsClient(signal: AbortSignal) {
  const token = await storage.get();
  signal.throwIfAborted();
  return createTRPCClient<AppRouter>({
    links: [
      httpLink({
        url: `${webOrigin}/api/trpc`,
        headers: token ? { Authorization: `Bearer ${token}` } : {},

        fetch: (url, options) => {
          signal.throwIfAborted();
          const timeout = AbortSignal.timeout(8000);
          // Sent writes can commit after closing the screen. Wait for their
          // result so cache invalidation happens after settlement, not on close.
          return fetch(url, {
            ...options,
            signal:
              options?.method === "POST"
                ? timeout
                : AbortSignal.any([signal, timeout]),
          });
        },
      }),
    ],
  });
}

export function needsSessionRefresh(
  error: unknown,
  missingRecordChecked = false,
) {
  if (!(error instanceof TRPCClientError)) return false;
  const code = error.data?.code;
  return (
    code === "UNAUTHORIZED" || (code === "NOT_FOUND" && !missingRecordChecked)
  );
}
