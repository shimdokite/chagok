import { createHash, randomBytes } from "node:crypto";
import { TRPCError } from "@trpc/server";

export interface AuthStore {
  createSession(
    sub: string,
    hash: string,
    expiresAt: Date,
  ): Promise<{ id: string; companyId?: string | null }>;
  findSession(
    hash: string,
  ): Promise<{
    userId: string;
    expiresAt: Date;
    companyId?: string | null;
  } | null>;
  deleteSession(hash: string): Promise<void>;
}

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

const unauthorized = () =>
  new TRPCError({
    code: "UNAUTHORIZED",
    message: "인증 정보를 확인할 수 없어요.",
  });

function requireToken(token?: string) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) throw unauthorized();
  return token;
}

export function createAuthService({
  store,
  verifyGoogle,
  now = Date.now,
}: {
  store: AuthStore;
  verifyGoogle: (idToken: string) => Promise<{ sub: string }>;
  now?: () => number;
}) {
  return {
    async signIn(idToken: string) {
      let identity: { sub: string };
      try {
        identity = await verifyGoogle(idToken);
      } catch {
        throw unauthorized();
      }
      if (!identity.sub) throw unauthorized();
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(now() + 7 * 24 * 60 * 60 * 1000);
      const user = await store.createSession(
        identity.sub,
        hashToken(token),
        expiresAt,
      );
      return { token, user, expiresAt: expiresAt.toISOString() };
    },

    async session(token?: string) {
      const session = await store.findSession(hashToken(requireToken(token)));
      if (!session || session.expiresAt.getTime() <= now())
        throw unauthorized();
      return {
        user: {
          id: session.userId,
          ...(session.companyId !== undefined
            ? { companyId: session.companyId }
            : {}),
        },
        expiresAt: session.expiresAt.toISOString(),
      };
    },

    async signOut(token?: string) {
      await store.deleteSession(hashToken(requireToken(token)));
      return { ok: true as const };
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
