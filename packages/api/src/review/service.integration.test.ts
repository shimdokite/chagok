import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { getDb } from "../auth/store";
import { assertLocalDatabase } from "../benefits/seed";
import { createBenefitsService } from "../benefits/service";
import { createReviewService } from "./service";

const database = process.env.CHAGOK_TEST_DATABASE_URL;

describe.skipIf(!database)("담당자 검토 실제 DB", () => {
  const prefix = `day06-${randomUUID()}`;
  let db: ReturnType<typeof getDb>;
  let service: ReturnType<typeof createReviewService>;
  let companyId: string;
  let otherCompanyId: string;
  const users: string[] = [];

  async function claim(amount = 15000, userId = users[0]) {
    return db.claim.create({
      data: {
        userId,
        companyId,
        title: "검토 테스트",
        category: "도서비",
        amount,
        status: "SUBMITTED",
        usedOn: "2026-11-12",
      },
    });
  }

  beforeAll(async () => {
    assertLocalDatabase(database);
    process.env.DATABASE_URL = database;
    db = getDb();
    service = createReviewService(db);
    for (let i = 0; i < 5; i++) {
      users.push(
        (await db.user.create({ data: { googleSub: `${prefix}-${i}` } })).id,
      );
    }
    companyId = (
      await db.company.create({
        data: {
          slug: prefix,
          name: "검토 회사",
          isSample: true,
          policies: {
            create: {
              month: "2026-11",
              allowance: 100000,
              categories: ["도서비"],
              guidance: "테스트",
            },
          },
        },
      })
    ).id;
    otherCompanyId = (
      await db.company.create({
        data: { slug: `${prefix}-other`, name: "다른 회사" },
      })
    ).id;
    for (let i = 0; i < 4; i++) {
      await db.membership.create({
        data: {
          userId: users[i],
          companyId: i === 3 ? otherCompanyId : companyId,
          role: i === 0 ? "EMPLOYEE" : "REVIEWER",
        },
      });
    }
  });
  afterAll(async () => {
    if (!db) return;
    await db.user.deleteMany({ where: { id: { in: users } } });
    await db.company.deleteMany({
      where: { id: { in: [companyId, otherCompanyId].filter(Boolean) } },
    });
    await db.$disconnect();
  });

  it("직원과 미소속은 목록을 읽지 못하고 타사 상세는 숨긴다", async () => {
    const row = await claim();
    for (const userId of [users[0], users[4]]) {
      await expect(
        service.list(userId, { month: "2026-11" }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
    await expect(service.detail(users[3], row.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(
      service.decide(users[3], {
        id: row.id,
        decision: "APPROVED",
        expectedCompanyId: otherCompanyId,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("승인은 한도를 유지하고 동일 재시도는 처리자와 시각을 보존한다", async () => {
    const row = await claim();
    const benefits = createBenefitsService(db);
    const before = await benefits.home(users[0], "2026-11");
    const input = {
      id: row.id,
      decision: "APPROVED" as const,
      expectedCompanyId: companyId,
    };
    const result = await service.decide(users[1], input);
    const replay = await service.decide(users[2], input);
    expect(replay).toEqual(result);
    expect(result).toMatchObject({ status: "APPROVED", reviewedBy: users[1] });
    expect(result.reviewedAt).toBeTruthy();
    expect(await benefits.home(users[0], "2026-11")).toMatchObject({
      amounts: {
        available: before.kind === "ready" ? before.amounts.available : -1,
      },
    });
    await expect(
      service.decide(users[1], {
        ...input,
        decision: "REJECTED",
        reason: "증빙 부족",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
  it("반려 금액을 한 번 복원하고 직원 내역과 상세에서 사유를 읽는다", async () => {
    const row = await claim(9000);
    const benefits = createBenefitsService(db);
    const before = await benefits.home(users[0], "2026-11");
    const input = {
      id: row.id,
      decision: "REJECTED" as const,
      reason: "  증빙 보완  ",
      expectedCompanyId: companyId,
    };
    await service.decide(users[1], input);
    await service.decide(users[1], input);
    expect(await benefits.detail(users[0], row.id)).toMatchObject({
      claim: { status: "REJECTED", rejectionReason: "증빙 보완" },
    });
    expect(await benefits.home(users[0], "2026-11")).toMatchObject({
      amounts: {
        available:
          before.kind === "ready" ? before.amounts.available + 9000 : -1,
      },
    });
    await expect(
      service.decide(users[1], { ...input, reason: "다른 사유" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
  it("빈/긴 사유와 승인에 붙인 사유를 거절한다", async () => {
    const row = await claim();
    for (const reason of [" ", "a".repeat(501), "\u0000"]) {
      await expect(
        service.decide(users[1], {
          id: row.id,
          decision: "REJECTED",
          reason,
          expectedCompanyId: companyId,
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    }
    await expect(
      service.decide(users[1], {
        id: row.id,
        decision: "APPROVED",
        reason: "사유",
        expectedCompanyId: companyId,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(
      (await db.claim.findUniqueOrThrow({ where: { id: row.id } })).status,
    ).toBe("SUBMITTED");
  });
  it("자기 신청과 오래된 회사 선택, 권한 회수를 차단한다", async () => {
    const own = await claim(1000, users[1]);
    await expect(
      service.decide(users[1], {
        id: own.id,
        decision: "APPROVED",
        expectedCompanyId: companyId,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    const row = await claim();
    await expect(
      service.decide(users[1], {
        id: row.id,
        decision: "APPROVED",
        expectedCompanyId: otherCompanyId,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await db.membership.update({
      where: { userId: users[2] },
      data: { role: "EMPLOYEE" },
    });
    await expect(
      service.list(users[2], { month: "2026-11" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      service.decide(users[2], {
        id: row.id,
        decision: "APPROVED",
        expectedCompanyId: companyId,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await db.membership.update({
      where: { userId: users[2] },
      data: { role: "REVIEWER" },
    });
  });
  it("상반된 동시 결정은 정확히 하나만 성공한다", async () => {
    const row = await claim();
    const results = await Promise.allSettled([
      service.decide(users[1], {
        id: row.id,
        decision: "APPROVED",
        expectedCompanyId: companyId,
      }),
      service.decide(users[2], {
        id: row.id,
        decision: "REJECTED",
        reason: "보완",
        expectedCompanyId: companyId,
      }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.find((r) => r.status === "rejected")).toMatchObject({
      reason: { code: "CONFLICT" },
    });
  });
  it("월과 상태 필터, 안정 커서가 중복 없는 페이지를 제공한다", async () => {
    const first = await service.list(users[1], {
      month: "2026-11",
      status: "SUBMITTED",
      limit: 2,
    });
    const next = await service.list(users[1], {
      month: "2026-11",
      status: "SUBMITTED",
      limit: 2,
      cursor: first.nextCursor ?? undefined,
    });
    expect(first.items).toHaveLength(2);
    expect(first.items.every((r) => r.status === "SUBMITTED")).toBe(true);
    expect(next.items.some((r) => first.items.some((p) => p.id === r.id))).toBe(
      false,
    );
    expect((await service.list(users[1], { month: "2026-12" })).items).toEqual(
      [],
    );
    expect((await service.list(users[3], { month: "2026-11" })).items).toEqual(
      [],
    );
  });
  it("영수증 없는 기존 신청은 명시하고 다른 회사 조회는 차단한다", async () => {
    const row = await claim();
    expect(await service.detail(users[1], row.id)).toMatchObject({
      claim: { hasReceipt: false },
    });
    await expect(service.receipt(users[1], row.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(service.receipt(users[3], row.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
  it("반려와 새 신청의 경합에서도 한도가 음수가 되지 않는다", async () => {
    const user = await db.user.create({
      data: {
        googleSub: `${prefix}-race`,
        membership: { create: { companyId } },
      },
    });
    users.push(user.id);
    const old = await claim(90000, user.id);
    const outcomes = await Promise.allSettled([
      service.decide(users[1], {
        id: old.id,
        decision: "REJECTED",
        reason: "보완",
        expectedCompanyId: companyId,
      }),
      createBenefitsService(db).create(user.id, {
        requestId: randomUUID(),
        title: "새 신청",
        category: "도서비",
        amount: 20000,
        usedOn: "2026-11-27",
      }),
    ]);
    expect(outcomes[0].status).toBe("fulfilled");
    const home = await createBenefitsService(db).home(user.id, "2026-11");
    expect(home).toMatchObject({
      amounts: {
        available: outcomes[1].status === "fulfilled" ? 80000 : 100000,
      },
    });
  });

  it("권한 회수 트랜잭션 뒤 대기 중인 결정은 거부된다", async () => {
    const row = await claim();

    let locked: () => void = () => {};

    let release: () => void = () => {};

    const acquired = new Promise<void>((resolve) => {
      locked = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const revoke = db.$transaction(async (tx) => {
      await tx.membership.update({
        where: { userId: users[2] },
        data: { role: "EMPLOYEE" },
      });
      locked();
      await gate;
    });
    await acquired;
    const decision = service.decide(users[2], {
      id: row.id,
      decision: "APPROVED",
      expectedCompanyId: companyId,
    });
    const result = expect(decision).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    release();
    await revoke;
    await result;
    expect(
      (await db.claim.findUniqueOrThrow({ where: { id: row.id } })).status,
    ).toBe("SUBMITTED");
  });
});
