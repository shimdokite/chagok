import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import { SessionController } from "./session";
import { storage } from "./storage";
import { google, googleConfigured } from "./google";
import { authApi } from "./api";
import { recordRestore } from "./metrics";

const Context = createContext<SessionController | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [controller] = useState(
    () =>
      new SessionController({
        storage,
        google,
        api: authApi,

        now: () => performance.now(),

        wallNow: Date.now,
        onMeasurement: recordRestore,
      }),
  );
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.snapshot,
    controller.snapshot,
  );
  useEffect(() => {
    void controller.restore("startup");
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void controller.restore("foreground");
    });
    return () => sub.remove();
  }, [controller]);
  useEffect(() => {
    if (state.status !== "authenticated" || !state.session) return;
    const remaining = Math.max(
      0,
      Date.parse(state.session.expiresAt) - Date.now(),
    );
    const timer = setTimeout(() => controller.expire(), remaining);
    return () => clearTimeout(timer);
  }, [controller, state]);
  return <Context.Provider value={controller}>{children}</Context.Provider>;
}

export function useSession() {
  const controller = useContext(Context);
  if (!controller) throw new Error("SessionProvider missing");
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.snapshot,
    controller.snapshot,
  );
  return { controller, state, googleConfigured };
}
