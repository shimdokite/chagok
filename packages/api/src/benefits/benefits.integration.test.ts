import { expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { getDb, prismaAuthStore } from "../auth/store";
import { createAuthService } from "../auth/service";
import { createBenefitsService } from "./service";
import { appRouter } from "../router";
import { assertLocalDatabase, linkSampleMember, seedBenefits } from "./seed";

it.skipIf(!process.env.CHAGOK_TEST_DATABASE_URL)(
  "DB 소속·월·페이지·실제 세션·seed 재실행을 검증한다",
  async () => {
    assertLocalDatabase(process.env.CHAGOK_TEST_DATABASE_URL);
    process.env.DATABASE_URL = process.env.CHAGOK_TEST_DATABASE_URL;
    const db = getDb();
    const prefix = `day03-${randomUUID()}`;
    const users: string[] = [];
    const service = createBenefitsService(db);
    const auth = createAuthService({
      store: prismaAuthStore(db),

      verifyGoogle: async (sub) => ({ sub: `${prefix}-${sub}` }),
    });
    try {
      await seedBenefits(db, "2026-11");
      const a = await auth.signIn("a");
      const b = await auth.signIn("b");
      const peer = await auth.signIn("peer");
      const unassigned = await auth.signIn("unassigned");
      users.push(a.user.id, b.user.id, peer.user.id, unassigned.user.id);

      const caller = (token?: string) =>
        appRouter.createCaller({
          token,

          getAuth: () => auth,

          getBenefits: () => service,
        });

      expect(await caller(a.token).benefits.home({ month: "2026-11" })).toEqual(
        { kind: "unassigned" },
      );
      await linkSampleMember(db, a.user.id, "sample-grove", "2026-11");
      await linkSampleMember(db, b.user.id, "sample-wave", "2026-11");
      await linkSampleMember(db, peer.user.id, "sample-grove", "2026-11");
      await seedBenefits(db, "2026-11");
      await linkSampleMember(db, a.user.id, "sample-grove", "2026-11");
      expect(await db.claim.count({ where: { userId: a.user.id } })).toBe(3);
      await expect(
        linkSampleMember(db, a.user.id, "sample-wave", "2026-11"),
      ).rejects.toThrow("refusing reassignment");
      const home = await caller(a.token).benefits.home({ month: "2026-11" });
      expect(home.kind).toBe("ready");
      if (home.kind !== "ready") throw new Error("Expected home");
      expect(home.amounts).toEqual({
        total: 100000,
        submitted: 15000,
        approved: 20000,
        available: 65000,
      });

      expect(home.recent.map((x) => x.status)).toEqual([
        "SUBMITTED",
        "APPROVED",
      ]);
      expect(
        (await caller(b.token).benefits.policy({ month: "2026-11" })).policy,
      ).toMatchObject({ allowance: 150000, categories: ["도서비", "교육비"] });
      expect(
        (await caller(a.token).benefits.home({ month: "2026-10" })).kind,
      ).toBe("noPolicy");
      expect(
        (await caller(unassigned.token).benefits.history({ month: "2026-11" }))
          .company,
      ).toBeNull();
      const rejected = await caller(a.token).benefits.history({
        month: "2026-11",
        status: "REJECTED",
      });

      expect(rejected.items).toHaveLength(1);
      expect(
        (await caller(a.token).benefits.detail({ id: rejected.items[0].id }))
          .claim.rejectionReason,
      ).toContain("영수증");
      for (const token of [b.token, peer.token, unassigned.token]) {
        await expect(
          caller(token).benefits.detail({ id: rejected.items[0].id }),
        ).rejects.toMatchObject({ code: "NOT_FOUND" });
      }
      for (const token of [undefined, "a".repeat(64)]) {
        await expect(
          caller(token).benefits.home({ month: "2026-11" }),
        ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
      }
      await expect(
        caller(a.token).benefits.home({ month: "2026-13" }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      await expect(
        caller(a.token).benefits.home({
          month: "2026-11",
          companyId: "forged",
        } as { month: string }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      await expect(
        caller(a.token).benefits.history({ month: "2026-11", limit: 51 }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });

      // Same submission instant: keyset pagination must neither repeat nor omit IDs.
      await db.claim.updateMany({
        where: { userId: a.user.id },
        data: { submittedAt: new Date("2026-11-13T00:00:00Z") },
      });
      const first = await caller(a.token).benefits.history({
        month: "2026-11",
        limit: 2,
      });
      const second = await caller(a.token).benefits.history({
        month: "2026-11",
        limit: 2,
        cursor: first.nextCursor ?? undefined,
      });

      expect(
        new Set([...first.items, ...second.items].map((x) => x.id)).size,
      ).toBe(3);
      expect(first.items).toHaveLength(2);
      expect(second.items).toHaveLength(1);
      expect(second.nextCursor).toBeNull();
      await db.claim.update({
        where: { id: first.items[0].id },
        data: { usedOn: "2026-10-31" },
      });

      expect(
        (await caller(a.token).benefits.history({ month: "2026-11" })).items,
      ).toHaveLength(2);
      expect(
        (await caller(a.token).benefits.history({ month: "2026-10" })).items,
      ).toHaveLength(1);
      // Seed must not undo an edited record.
      await linkSampleMember(db, a.user.id, "sample-grove", "2026-11");
      expect(
        (await db.claim.findUnique({ where: { id: first.items[0].id } }))
          ?.usedOn,
      ).toBe("2026-10-31");
      await expect(
        db.claim.create({
          data: {
            userId: a.user.id,
            companyId: "other-company",
            title: "bad",
            category: "식비",
            amount: 1,
            status: "SUBMITTED",
            usedOn: "2026-11-01",
          },
        }),
      ).rejects.toThrow();
      const companyB = await db.membership.findUniqueOrThrow({
        where: { userId: b.user.id },
      });
      await expect(
        db.membership.update({
          where: { userId: a.user.id },
          data: { companyId: companyB.companyId },
        }),
      ).rejects.toThrow();
      expect(
        (
          await db.claim.findUniqueOrThrow({
            where: { id: rejected.items[0].id },
          })
        ).companyId,
      ).toBe(home.company.id);
      await auth.signOut(a.token);
      await expect(
        caller(a.token).benefits.home({ month: "2026-11" }),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
      await db.session.updateMany({
        where: { userId: b.user.id },
        data: { expiresAt: new Date(0) },
      });
      await expect(
        caller(b.token).benefits.history({ month: "2026-11" }),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    } finally {
      await db.user.deleteMany({
        where: { id: { in: users }, googleSub: { startsWith: prefix } },
      });
      await db.$disconnect();
    }
  },
  30000,
);
