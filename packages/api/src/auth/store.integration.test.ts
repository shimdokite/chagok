import { expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { getDb, prismaAuthStore } from "./store";
import { createAuthService } from "./service";

// Opt-in: never connect to or clear an unspecified database.
it.skipIf(!process.env.CHAGOK_TEST_DATABASE_URL)(
  "PostgreSQL enforces one user under concurrent login and revokes sessions",
  async () => {
    const url = new URL(process.env.CHAGOK_TEST_DATABASE_URL!);
    if (
      !["localhost", "127.0.0.1"].includes(url.hostname) ||
      url.pathname !== "/chagok"
    )
      throw new Error("Dedicated local chagok DB required");
    process.env.DATABASE_URL = url.toString();
    const db = getDb();
    const sub = `integration-${randomUUID()}`;
    const service = createAuthService({
      store: prismaAuthStore(db),

      verifyGoogle: async () => ({ sub }),
    });
    try {
      const results = await Promise.all(
        Array.from({ length: 5 }, () =>
          service.signIn("test-boundary-credential"),
        ),
      );
      expect(new Set(results.map((r) => r.user.id)).size).toBe(1);
      expect(await db.user.count({ where: { googleSub: sub } })).toBe(1);
      const userId = results[0].user.id;
      const rows = await db.session.findMany({ where: { userId } });
      expect(rows).toHaveLength(5);
      for (const row of rows)
        expect(results.some((r) => r.token === row.tokenHash)).toBe(false);
      expect((await service.session(results[0].token)).user.id).toBe(userId);
      await service.signOut(results[0].token);
      await expect(service.session(results[0].token)).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
      expect((await service.session(results[1].token)).user.id).toBe(userId);
      await db.session.updateMany({
        where: { userId },
        data: { expiresAt: new Date(0) },
      });
      await expect(service.session(results[1].token)).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    } finally {
      await db.user.deleteMany({ where: { googleSub: sub } });
      await db.$disconnect();
    }
  },
);
