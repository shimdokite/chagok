import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import type { AuthService } from "./auth/service";
type Context = { token?: string; getAuth: () => AuthService };
const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      message:
        error.code === "INTERNAL_SERVER_ERROR"
          ? "서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요."
          : shape.message,
      data: { ...shape.data, stack: undefined },
    };
  },
});
const sessionProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.token || !/^[a-f0-9]{64}$/.test(ctx.token))
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "로그인이 필요해요.",
    });
  return next();
});
export const appRouter = t.router({
  auth: t.router({
    signIn: t.procedure
      .input(z.object({ idToken: z.string().min(1).max(8192) }).strict())
      .mutation(({ ctx, input }) => ctx.getAuth().signIn(input.idToken)),
    session: sessionProcedure.query(({ ctx }) =>
      ctx.getAuth().session(ctx.token),
    ),
    signOut: sessionProcedure.mutation(({ ctx }) =>
      ctx.getAuth().signOut(ctx.token),
    ),
  }),
  health: t.router({
    check: t.procedure.query(() => ({
      status: "ok" as const,
      service: "chagok" as const,
    })),
  }),
});
export type AppRouter = typeof appRouter;
