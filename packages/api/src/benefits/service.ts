import type { Prisma, PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import {
  monthBounds,
  type Amounts,
  type ClaimItem,
  type ClaimStatus,
  type HomeData,
  type HistoryData,
  type HistoryInput,
  type PolicyData,
} from "@chagok/contracts/benefits";

export function summarizeAmounts(
  total: number,
  claims: readonly { status: ClaimStatus; amount: number }[],
): Amounts {
  let submitted = 0;
  let approved = 0;
  for (const claim of claims) {
    if (claim.status === "SUBMITTED") submitted += claim.amount;
    if (claim.status === "APPROVED") approved += claim.amount;
  }
  return {
    total,
    submitted,
    approved,
    available: total - submitted - approved,
  };
}

const companySelect = { id: true, name: true, isSample: true } as const;
const claimSelect = {
  id: true,
  title: true,
  category: true,
  amount: true,
  status: true,
  usedOn: true,
  submittedAt: true,
  rejectionReason: true,
} as const;
const policySelect = {
  month: true,
  allowance: true,
  categories: true,
  guidance: true,
} as const;
const orderBy = [{ submittedAt: "desc" }, { id: "desc" }] as const;
type ClaimRow = Prisma.ClaimGetPayload<{ select: typeof claimSelect }>;

function serializeClaim(claim: ClaimRow): ClaimItem {
  return { ...claim, submittedAt: claim.submittedAt.toISOString() };
}

function monthWhere(userId: string, companyId: string, month: string) {
  const { start, end } = monthBounds(month);
  return { userId, companyId, usedOn: { gte: start, lt: end } };
}

function membership(tx: Prisma.TransactionClient, userId: string) {
  return tx.membership.findUnique({
    where: { userId },
    select: { company: { select: companySelect } },
  });
}

function policyFor(
  tx: Prisma.TransactionClient,
  companyId: string,
  month: string,
) {
  return tx.benefitPolicy.findUnique({
    where: { companyId_month: { companyId, month } },
    select: policySelect,
  });
}

export function createBenefitsService(db: PrismaClient) {
  return {
    home(userId: string, month: string): Promise<HomeData> {
      return db.$transaction(
        async (tx) => {
          const member = await membership(tx, userId);
          if (!member) return { kind: "unassigned" };
          const { company } = member;
          const policy = await policyFor(tx, company.id, month);
          if (!policy) return { kind: "noPolicy", company, month };
          const where = monthWhere(userId, company.id, month);
          const groups = await tx.claim.groupBy({
            by: ["status"],
            where,
            _sum: { amount: true },
          });
          const amounts = summarizeAmounts(
            policy.allowance,
            groups.map((group) => ({
              status: group.status,
              amount: group._sum.amount ?? 0,
            })),
          );
          const recent = await tx.claim.findMany({
            where,
            orderBy: [...orderBy],
            take: 2,
            select: claimSelect,
          });
          return {
            kind: "ready",
            company,
            policy,
            amounts,
            recent: recent.map(serializeClaim),
          };
        },
        { isolationLevel: "RepeatableRead" },
      );
    },

    history(userId: string, input: HistoryInput): Promise<HistoryData> {
      return db.$transaction(
        async (tx) => {
          const member = await membership(tx, userId);
          if (!member) return { company: null, items: [], nextCursor: null };
          const cursor = input.cursor;
          const rows = await tx.claim.findMany({
            where: {
              ...monthWhere(userId, member.company.id, input.month),
              status: input.status,
              ...(cursor
                ? {
                    OR: [
                      { submittedAt: { lt: new Date(cursor.submittedAt) } },
                      {
                        submittedAt: new Date(cursor.submittedAt),
                        id: { lt: cursor.id },
                      },
                    ],
                  }
                : {}),
            },
            select: claimSelect,
            orderBy: [...orderBy],
            take: (input.limit ?? 20) + 1,
          });
          const items = rows.slice(0, input.limit ?? 20).map(serializeClaim);
          const last = items.at(-1);
          const nextCursor =
            rows.length > items.length && last
              ? { submittedAt: last.submittedAt, id: last.id }
              : null;
          return { company: member.company, items, nextCursor };
        },
        { isolationLevel: "RepeatableRead" },
      );
    },

    detail(userId: string, id: string) {
      return db.$transaction(
        async (tx) => {
          const member = await membership(tx, userId);
          const claim =
            member &&
            (await tx.claim.findFirst({
              where: { id, userId, companyId: member.company.id },
              select: claimSelect,
            }));
          if (!claim || !member)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "신청 내역을 찾을 수 없어요.",
            });
          return { company: member.company, claim: serializeClaim(claim) };
        },
        { isolationLevel: "RepeatableRead" },
      );
    },

    policy(userId: string, month: string): Promise<PolicyData> {
      return db.$transaction(
        async (tx) => {
          const member = await membership(tx, userId);
          if (!member) return { company: null, policy: null };
          return {
            company: member.company,
            policy: await policyFor(tx, member.company.id, month),
          };
        },
        { isolationLevel: "RepeatableRead" },
      );
    },
  };
}

export type BenefitsService = ReturnType<typeof createBenefitsService>;
