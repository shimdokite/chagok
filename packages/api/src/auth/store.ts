import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { AuthStore } from "./service";

const globalDb = globalThis as unknown as { chagokDb?: PrismaClient };

export function getDb() {
  if (!process.env.DATABASE_URL) throw new Error("Database is not configured");
  return (globalDb.chagokDb ??= new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 5000,
    }),
  }));
}

export function prismaAuthStore(db: PrismaClient): AuthStore {
  return {
    async createSession(sub, tokenHash, expiresAt) {
      return db.$transaction(async (tx) => {
        // Database-native upsert on the unique subject also handles concurrent logins.
        const user = await tx.user.upsert({
          where: { googleSub: sub },
          create: { googleSub: sub },
          update: { googleSub: sub },
        });
        await tx.session.create({
          data: { tokenHash, expiresAt, userId: user.id },
        });
        const member = await tx.membership.findUnique({
          where: { userId: user.id },
        });
        return { id: user.id, companyId: member?.companyId ?? null };
      });
    },

    async findSession(tokenHash) {
      const session = await db.session.findUnique({
        where: { tokenHash },
        select: {
          userId: true,
          expiresAt: true,
          user: { select: { membership: { select: { companyId: true } } } },
        },
      });
      if (!session) return null;
      return {
        userId: session.userId,
        expiresAt: session.expiresAt,
        companyId: session.user.membership?.companyId ?? null,
      };
    },

    async deleteSession(tokenHash) {
      await db.session.deleteMany({ where: { tokenHash } });
    },
  };
}
