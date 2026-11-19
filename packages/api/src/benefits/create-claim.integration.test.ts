import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { getDb, prismaAuthStore } from "../auth/store";
import { createAuthService, type AuthService } from "../auth/service";
import { appRouter } from "../router";
import { createBenefitsService } from "./service";
import { assertLocalDatabase } from "./seed";

describe.skipIf(!process.env.CHAGOK_TEST_DATABASE_URL)(
  "신청 생성 실제 DB",
  () => {
    let db: PrismaClient;
    let auth: AuthService;
    let a: { token: string; user: { id: string } };
    let b: { token: string; user: { id: string } };
    let unassigned: { token: string; user: { id: string } };
    let companies: string[];
    let prefix: string;

    function caller(token?: string) {
      return appRouter.createCaller({
        token,

        getAuth: () => auth,

        getBenefits: () => createBenefitsService(db),
      });
    }

    function input(change = {}) {
      return {
        requestId: randomUUID(),
        title: "점심",
        category: "식비",
        amount: 10000,
        usedOn: "2026-11-19",
        ...change,
      };
    }

    beforeAll(() => {
      assertLocalDatabase(process.env.CHAGOK_TEST_DATABASE_URL);
      process.env.DATABASE_URL = process.env.CHAGOK_TEST_DATABASE_URL;
      db = getDb();
    });
    beforeEach(async () => {
      prefix = `day04-${randomUUID()}`;
      companies = [];
      auth = createAuthService({
        store: prismaAuthStore(db),

        verifyGoogle: async (sub) => ({ sub: `${prefix}-${sub}` }),
      });
      a = await auth.signIn("a");
      b = await auth.signIn("b");
      unassigned = await auth.signIn("unassigned");
      for (const member of [a, b]) {
        const company = await db.company.create({
          data: {
            slug: `${prefix}-${member.user.id}`,
            name: "신청 테스트 회사",
            isSample: true,
            policies: {
              create: {
                month: "2026-11",
                allowance: 100000,
                categories: ["식비"],
                guidance: "테스트",
              },
            },
            memberships: { create: { userId: member.user.id } },
          },
        });
        companies.push(company.id);
      }
    });
    afterEach(async () => {
      await db.user.deleteMany({
        where: { googleSub: { startsWith: prefix } },
      });
      await db.company.deleteMany({ where: { id: { in: companies } } });
    });
    it("rejects company changes after opening the form inside the write lock", async () => {
      await db.membership.update({
        where: { userId: a.user.id },
        data: { companyId: companies[1] },
      });
      await expect(
        caller(a.token).benefits.create(
          input({ expectedCompanyId: companies[0] }),
        ),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(await db.claim.count({ where: { userId: a.user.id } })).toBe(0);
      await expect(
        caller(a.token).benefits.create(
          input({ expectedCompanyId: companies[1] }),
        ),
      ).resolves.toHaveProperty("id");
    });
    afterAll(async () => {
      await db?.$disconnect();
    });

    it("서버 소속과 SUBMITTED로 저장하고 기존 조회에서 확인한다", async () => {
      const result = await caller(a.token).benefits.create(input());
      expect(
        await db.claim.findUniqueOrThrow({ where: { id: result.id } }),
      ).toMatchObject({
        userId: a.user.id,
        companyId: companies[0],
        status: "SUBMITTED",
        amount: 10000,
      });
      expect(
        await caller(a.token).benefits.home({ month: "2026-11" }),
      ).toMatchObject({ amounts: { available: 90000 } });
      expect(
        (
          await caller(a.token).benefits.history({ month: "2026-11" })
        ).items.map((item) => item.id),
      ).toEqual([result.id]);
      expect(
        (await caller(a.token).benefits.detail({ id: result.id })).claim.id,
      ).toBe(result.id);
      await expect(
        caller(b.token).benefits.detail({ id: result.id }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
    it("무세션, 위조, 만료, 로그아웃 및 무소속은 저장하지 않는다", async () => {
      for (const token of [undefined, "invalid", "a".repeat(64)]) {
        await expect(
          caller(token).benefits.create(input()),
        ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
      }
      await expect(
        caller(unassigned.token).benefits.create(input()),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await db.session.updateMany({
        where: { userId: a.user.id },
        data: { expiresAt: new Date(0) },
      });
      await expect(
        caller(a.token).benefits.create(input()),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
      await auth.signOut(b.token);
      await expect(
        caller(b.token).benefits.create(input()),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
      expect(
        await db.claim.count({ where: { companyId: { in: companies } } }),
      ).toBe(0);
    });
    it("회사/사용자/상태 위조와 잘못된 입력은 저장하지 않는다", async () => {
      for (const change of [
        { companyId: companies[1] },
        { userId: b.user.id },
        { status: "APPROVED" },
        { amount: 0 },
        { usedOn: "2026-02-30" },
      ]) {
        await expect(
          caller(a.token).benefits.create(input(change)),
        ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      }
      expect(await db.claim.count({ where: { userId: a.user.id } })).toBe(0);
    });
    it("저장 불가능한 문자는 BAD_REQUEST이며 정상 이모지는 재전송할 수 있다", async () => {
      for (const title of ["점\u0000심", "점\ud800심", "점\udfff심"]) {
        await expect(
          caller(a.token).benefits.create(input({ title })),
        ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      }
      expect(await db.claim.count({ where: { userId: a.user.id } })).toBe(0);
      const request = input({ title: "점심 🍚" });
      const first = await caller(a.token).benefits.create(request);
      expect(await caller(a.token).benefits.create(request)).toEqual(first);
    });
    it("다른 회사 정책은 사용하지 않고 없는 월/미지원 항목을 거부한다", async () => {
      await db.benefitPolicy.create({
        data: {
          companyId: companies[1],
          month: "2026-12",
          allowance: 100000,
          categories: ["식비"],
          guidance: "다른 회사",
        },
      });
      await expect(
        caller(a.token).benefits.create(input({ usedOn: "2026-12-01" })),
      ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
      await expect(
        caller(a.token).benefits.create(input({ category: "도서비" })),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(await db.claim.count({ where: { userId: a.user.id } })).toBe(0);
    });
    it("대기/승인만 차감하고 사용월 경계와 정확한 잔액을 적용한다", async () => {
      await db.claim.createMany({
        data: [
          { status: "SUBMITTED" as const, amount: 15000, usedOn: "2026-11-01" },
          { status: "APPROVED" as const, amount: 20000, usedOn: "2026-11-30" },
          {
            status: "REJECTED" as const,
            rejectionReason: "지원 대상 아님",
            amount: 90000,
            usedOn: "2026-11-19",
          },
          { status: "APPROVED" as const, amount: 100000, usedOn: "2026-10-31" },
          {
            status: "SUBMITTED" as const,
            amount: 100000,
            usedOn: "2026-12-01",
          },
        ].map((claim) => ({
          ...claim,
          userId: a.user.id,
          companyId: companies[0],
          title: "기존 신청",
          category: "식비",
        })),
      });
      const request = input({ amount: 65001 });
      await expect(
        caller(a.token).benefits.create(request),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(await db.claim.count({ where: { userId: a.user.id } })).toBe(5);
      await caller(a.token).benefits.create({ ...request, amount: 65000 });
      expect(
        await caller(a.token).benefits.home({ month: "2026-11" }),
      ).toMatchObject({ amounts: { available: 0 } });
      await expect(
        caller(a.token).benefits.create(input({ amount: 1 })),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });
    it("한도가 0원이면 양수 신청을 거부한다", async () => {
      await db.benefitPolicy.updateMany({
        where: { companyId: companies[0] },
        data: { allowance: 0 },
      });
      await expect(
        caller(a.token).benefits.create(input({ amount: 1 })),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(await db.claim.count({ where: { userId: a.user.id } })).toBe(0);
    });
    it("연말 사용일은 제출일과 무관하게 해당 월 정책을 쓴다", async () => {
      await db.benefitPolicy.create({
        data: {
          companyId: companies[0],
          month: "2025-12",
          allowance: 1,
          categories: ["식비"],
          guidance: "월 경계",
        },
      });
      await caller(a.token).benefits.create(
        input({ usedOn: "2025-12-31", amount: 1 }),
      );
      expect(
        await caller(a.token).benefits.home({ month: "2025-12" }),
      ).toMatchObject({ amounts: { available: 0 } });
      expect(
        await caller(a.token).benefits.home({ month: "2026-11" }),
      ).toMatchObject({ amounts: { available: 100000 } });
    });
    it("같은 키/정규화 입력은 정책 변경 및 잔액 소진 후에도 기존 id를 반환한다", async () => {
      const request = input({ amount: 100000 });
      const first = await caller(a.token).benefits.create(request);
      await db.benefitPolicy.updateMany({
        where: { companyId: companies[0] },
        data: { allowance: 0, categories: [] },
      });
      expect(
        await caller(a.token).benefits.create({
          ...request,
          title: " 점심 ",
          requestId: request.requestId.toUpperCase(),
        }),
      ).toEqual(first);
      expect(await db.claim.count({ where: { userId: a.user.id } })).toBe(1);
    });
    it("같은 키의 다른 내용은 거부하고 기존 신청을 보존한다", async () => {
      const request = input();
      const first = await caller(a.token).benefits.create(request);
      for (const change of [
        { title: "저녁" },
        { category: "도서비" },
        { usedOn: "2026-11-20" },
        { amount: 1 },
      ]) {
        await expect(
          caller(a.token).benefits.create({ ...request, ...change }),
        ).rejects.toMatchObject({ code: "CONFLICT" });
      }
      expect(
        await db.claim.findUniqueOrThrow({ where: { id: first.id } }),
      ).toMatchObject(request);
      expect(await db.claim.count({ where: { userId: a.user.id } })).toBe(1);
    });
    it("동일 키의 동시 재전송 8개는 한 건만 저장한다", async () => {
      const request = input();
      const results = await Promise.all(
        Array.from({ length: 8 }, () =>
          caller(a.token).benefits.create(request),
        ),
      );
      expect(new Set(results.map((result) => result.id)).size).toBe(1);
      expect(await db.claim.count({ where: { userId: a.user.id } })).toBe(1);
    });
    it("서로 다른 키의 동시 요청 8개도 월 한도를 넘지 않는다", async () => {
      const results = await Promise.allSettled(
        Array.from({ length: 8 }, () =>
          caller(a.token).benefits.create(input({ amount: 30000 })),
        ),
      );
      expect(
        results.filter((result) => result.status === "fulfilled"),
      ).toHaveLength(3);
      const failed = results.filter((result) => result.status === "rejected");
      expect(failed).toHaveLength(5);
      for (const result of failed)
        expect(result.reason).toMatchObject({ code: "BAD_REQUEST" });
      expect(
        await db.claim.aggregate({
          where: { userId: a.user.id },
          _sum: { amount: true },
          _count: true,
        }),
      ).toMatchObject({ _sum: { amount: 90000 }, _count: 3 });
    });
    it("다른 사용자 같은 키는 별도로 저장하고 같은 회사 동료의 한도도 분리한다", async () => {
      await db.membership.update({
        where: { userId: b.user.id },
        data: { companyId: companies[0] },
      });
      const request = input({ amount: 100000 });
      const first = await caller(a.token).benefits.create(request);
      const second = await caller(b.token).benefits.create(request);
      expect(first.id).not.toBe(second.id);
      expect(await db.claim.count({ where: { companyId: companies[0] } })).toBe(
        2,
      );
    });
    it("DB unique 제약도 동일 사용자 요청 키 중복을 차단한다", async () => {
      const request = input();
      await caller(a.token).benefits.create(request);
      await expect(
        db.claim.create({
          data: {
            ...request,
            userId: a.user.id,
            companyId: companies[0],
            status: "SUBMITTED",
          },
        }),
      ).rejects.toMatchObject({ code: "P2002" });
      expect(await db.claim.count({ where: { userId: a.user.id } })).toBe(1);
    });
  },
);
