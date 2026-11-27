import { useEffect, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { useSession } from "../auth/SessionProvider";
import { BenefitsCache, sessionScope } from "./cache";

export function BenefitsProvider({ children }: { children: ReactNode }) {
  const { state } = useSession();
  return <Scope key={sessionScope(state)}>{children}</Scope>;
}

function Scope({ children }: { children: ReactNode }) {
  const { state, controller } = useSession();
  const [cache] = useState(() => new BenefitsCache(state));
  useEffect(() => {
    const unsubscribe = controller.subscribe(() =>
      cache.observe(controller.snapshot()),
    );
    cache.observe(controller.snapshot());
    const appState = AppState.addEventListener("change", (status) => {
      if (
        status === "active" &&
        controller.snapshot().status === "authenticated"
      )
        void cache.refresh();
    });
    return () => {
      appState.remove();
      unsubscribe();
      cache.dispose();
    };
  }, [cache, controller]);
  return (
    <QueryClientProvider client={cache.client}>{children}</QueryClientProvider>
  );
}
