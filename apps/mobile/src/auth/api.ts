import { createTRPCClient, httpLink } from "@trpc/client";
import type { AppRouter } from "@chagok/api";
import { webOrigin } from "../lib/trpc";
function client(token?: string) {
  return createTRPCClient<AppRouter>({
    links: [
      httpLink({
        url: `${webOrigin}/api/trpc`,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        fetch: (url, options) =>
          fetch(url, { ...options, signal: AbortSignal.timeout(8000) }),
      }),
    ],
  });
}
export const authApi = {
  signIn: (idToken: string) => client().auth.signIn.mutate({ idToken }),
  session: (token: string) => client(token).auth.session.query(),
  signOut: (token: string) => client(token).auth.signOut.mutate(),
};
