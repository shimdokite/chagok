import { createTRPCClient, httpLink } from "@trpc/client";
import type { AppRouter } from "@chagok/api";
import { Platform } from "react-native";
export const webOrigin =
  process.env.EXPO_PUBLIC_WEB_ORIGIN ||
  (Platform.OS === "android"
    ? "http://10.0.2.2:3000"
    : "http://127.0.0.1:3000");
export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpLink({
      url: `${webOrigin}/api/trpc`,
      fetch: (url, options) =>
        fetch(url, {
          ...options,
          signal: options?.signal ?? AbortSignal.timeout(5000),
        }),
    }),
  ],
});
