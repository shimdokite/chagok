import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { WebView } from "react-native-webview";
import { injectionFor, type FormContext } from "@chagok/contracts";
import { useSession } from "../auth/SessionProvider";
import { benefitsClient } from "../benefits/api";
import { requireCompanyScope, sessionScope } from "../benefits/cache";
import { webOrigin } from "../lib/trpc";
import { startReceiptMeasurement } from "../receipts/metrics-native";
import { pickAndUploadReceipt } from "../receipts/native";
import { claimAccess, ClaimHost } from "./claim-host";

export function useClaimHost(webview: React.RefObject<WebView<object> | null>) {
  const { controller } = useSession();
  const cache = useQueryClient();
  const [host] = useState(
    () =>
      new ClaimHost({
        origin: webOrigin,

        access() {
          return claimAccess(controller.snapshot());
        },

        send(message) {
          webview.current?.injectJavaScript(injectionFor(message));
        },

        async load(month, signal): Promise<FormContext> {
          const state = controller.snapshot();
          const client = await benefitsClient(signal);
          const home = await client.benefits.home.query({ month }, { signal });
          signal.throwIfAborted();
          requireCompanyScope(state, home, () => {
            void controller.restore("retry");
          });
          if (home.kind !== "ready") return { kind: home.kind, month };
          return {
            kind: "ready",
            month,
            companyName: home.company.name,
            categories: home.policy.categories,
            available: home.amounts.available,
          };
        },

        async create(input, signal) {
          const expectedCompanyId =
            controller.snapshot().session?.user.companyId;
          if (!expectedCompanyId) throw { data: { code: "FORBIDDEN" } };
          try {
            const client = await benefitsClient(signal);
            return await client.benefits.create.mutate({
              ...input,
              expectedCompanyId,
            });
          } catch (error) {
            const code = (error as { data?: { code?: string } })?.data?.code;
            if (code === "UNAUTHORIZED" || code === "FORBIDDEN")
              void controller.restore("retry");
            throw error;
          }
        },

        measureReceipt: startReceiptMeasurement,

        async pickReceipt(source, signal, trace) {
          const companyId = controller.snapshot().session?.user.companyId;
          if (!companyId) throw { code: "FORBIDDEN" };
          try {
            return await pickAndUploadReceipt(source, companyId, signal, trace);
          } catch (error) {
            const code = (error as { code?: string })?.code;
            if (code === "UNAUTHORIZED" || code === "FORBIDDEN")
              void controller.restore("retry");
            throw error;
          }
        },

        invalidate: () => cache.invalidateQueries({ queryKey: ["benefits"] }),
      }),
  );
  useEffect(() => {
    let scope = sessionScope(controller.snapshot());
    const unsubscribe = controller.subscribe(() => {
      const next = sessionScope(controller.snapshot());
      if (next === scope) return;
      scope = next;
      host.reset();
      host.announce();
    });
    return () => {
      unsubscribe();
      host.reset();
    };
  }, [controller, host]);
  return host;
}
