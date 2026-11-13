import { initTRPC } from "@trpc/server";
const t = initTRPC.create();
export const appRouter = t.router({
  health: t.router({
    check: t.procedure.query(() => ({
      status: "ok" as const,
      service: "chagok" as const,
    })),
  }),
});
export type AppRouter = typeof appRouter;
