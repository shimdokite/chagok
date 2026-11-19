import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { monthBounds, type CreateClaimInput } from "@chagok/contracts/benefits";

export function createClaim(
  db: PrismaClient,
  userId: string,
  input: CreateClaimInput,
) {
  return db.$transaction(
    async (tx) => {
      // All claim creation locks the same employee before reading the balance.
      // ReadCommitted makes queries after the lock see the previous commit.
      const [member] = await tx.$queryRaw<{ companyId: string }[]>`
        SELECT "companyId" FROM "Membership"
        WHERE "userId" = ${userId} FOR UPDATE
      `;
      if (!member)
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "회사 소속을 확인해 주세요.",
        });

      if (
        input.expectedCompanyId &&
        input.expectedCompanyId !== member.companyId
      )
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "회사 소속이 변경됐어요. 다시 확인해 주세요.",
        });

      const existing = await tx.claim.findUnique({
        where: { userId_requestId: { userId, requestId: input.requestId } },
      });
      if (existing) {
        if (
          existing.companyId !== member.companyId ||
          existing.title !== input.title ||
          existing.category !== input.category ||
          existing.amount !== input.amount ||
          existing.usedOn !== input.usedOn
        )
          throw new TRPCError({
            code: "CONFLICT",
            message: "이미 사용한 요청 번호예요. 신청 내용을 확인해 주세요.",
          });
        return { id: existing.id };
      }

      const month = input.usedOn.slice(0, 7);
      const policy = await tx.benefitPolicy.findUnique({
        where: { companyId_month: { companyId: member.companyId, month } },
      });
      if (!policy)
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "사용일에 해당하는 회사 정책이 없어요.",
        });
      if (!policy.categories.includes(input.category))
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "지원하지 않는 복지 항목이에요.",
        });

      const { start, end } = monthBounds(month);
      const usage = await tx.claim.aggregate({
        where: {
          userId,
          companyId: member.companyId,
          usedOn: { gte: start, lt: end },
          status: { in: ["SUBMITTED", "APPROVED"] },
        },
        _sum: { amount: true },
      });
      if (input.amount > policy.allowance - (usage._sum.amount ?? 0))
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "신청 금액이 남은 한도를 초과해요.",
        });

      return tx.claim.create({
        data: {
          requestId: input.requestId,
          title: input.title,
          category: input.category,
          amount: input.amount,
          usedOn: input.usedOn,
          userId,
          companyId: member.companyId,
          status: "SUBMITTED",
        },
        select: { id: true },
      });
    },
    { isolationLevel: "ReadCommitted" },
  );
}
