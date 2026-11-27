import type { Prisma, PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import {
  historyInput,
  monthBounds,
  reviewDecisionInput,
  type HistoryInput,
  type ReviewList,
  type ReviewDetail,
} from "@chagok/contracts/benefits";

const select = {
  id: true,
  userId: true,
  title: true,
  category: true,
  amount: true,
  status: true,
  usedOn: true,
  submittedAt: true,
  rejectionReason: true,
  attachmentId: true,
  reviewedBy: true,
  reviewedAt: true,
} as const;
type Row = Prisma.ClaimGetPayload<{ select: typeof select }>;

function serialize(row: Row, actor: string) {
  const { userId, attachmentId, ...claim } = row;
  return {
    ...claim,
    applicantLabel: `직원 ${userId.slice(0, 8)}`,
    isOwn: userId === actor,
    hasReceipt: !!attachmentId,
    submittedAt: row.submittedAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
  };
}

async function reviewer(tx: Prisma.TransactionClient, userId: string) {
  const member = await tx.membership.findUnique({
    where: { userId },
    select: {
      role: true,
      company: { select: { id: true, name: true, isSample: true } },
    },
  });
  if (member?.role !== "REVIEWER")
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "복지 담당자 권한이 필요해요.",
    });
  return member.company;
}

export function createReviewService(db: PrismaClient) {
  return {
    list(userId: string, raw: HistoryInput): Promise<ReviewList> {
      const input = historyInput.parse(raw);
      return db.$transaction(
        async (tx) => {
          const company = await reviewer(tx, userId);
          const { start, end } = monthBounds(input.month);
          const where = {
            companyId: company.id,
            usedOn: { gte: start, lt: end },
          };
          const cursor = input.cursor;
          const rows = await tx.claim.findMany({
            where: {
              ...where,
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
            select,
            orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
            take: input.limit + 1,
          });
          const items = rows
            .slice(0, input.limit)
            .map((row) => serialize(row, userId));
          const last = items.at(-1);
          return {
            company,
            items,
            pendingCount: await tx.claim.count({
              where: { ...where, status: "SUBMITTED" },
            }),
            nextCursor:
              rows.length > input.limit && last
                ? { id: last.id, submittedAt: last.submittedAt }
                : null,
          };
        },
        { isolationLevel: "RepeatableRead" },
      );
    },

    detail(userId: string, id: string): Promise<ReviewDetail> {
      return db.$transaction(
        async (tx) => {
          const company = await reviewer(tx, userId);
          const claim = await tx.claim.findFirst({
            where: { id, companyId: company.id },
            select,
          });
          if (!claim)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "신청 내역을 찾을 수 없어요.",
            });
          return { company, claim: serialize(claim, userId) };
        },
        { isolationLevel: "RepeatableRead" },
      );
    },

    receipt(userId: string, id: string) {
      return db.$transaction(
        async (tx) => {
          const company = await reviewer(tx, userId);
          const claim = await tx.claim.findFirst({
            where: { id, companyId: company.id },
            select: { attachment: true, userId: true },
          });
          const attachment = claim?.attachment;
          if (
            !attachment ||
            attachment.state !== "LINKED" ||
            attachment.companyId !== company.id ||
            attachment.userId !== claim.userId
          )
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "영수증을 찾을 수 없어요.",
            });
          return attachment;
        },
        { isolationLevel: "RepeatableRead" },
      );
    },

    async decide(userId: string, raw: unknown) {
      const parsed = reviewDecisionInput.safeParse(raw);
      if (!parsed.success)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "신청과 반려 사유를 확인해 주세요.",
        });
      const input = parsed.data;
      return db.$transaction(
        async (tx) => {
          // Stable order also permits two reviewers to review each other's claims.
          const target = await tx.claim.findUnique({
            where: { id: input.id },
            select: { userId: true },
          });
          const targetId = target?.userId ?? userId;
          await tx.$queryRaw`SELECT "userId" FROM "Membership" WHERE "userId" IN (${userId}, ${targetId}) ORDER BY "userId" FOR UPDATE`;
          const company = await reviewer(tx, userId);
          if (company.id !== input.expectedCompanyId)
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "회사 소속이 변경됐어요. 다시 확인해 주세요.",
            });
          const claim = await tx.claim.findFirst({
            where: { id: input.id, companyId: company.id },
            select,
          });
          if (!claim)
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "신청 내역을 찾을 수 없어요.",
            });
          if (claim.userId === userId)
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "본인 신청은 다른 담당자가 검토해야 해요.",
            });
          const reason = input.decision === "REJECTED" ? input.reason : null;
          if (claim.status !== "SUBMITTED") {
            if (
              claim.status === input.decision &&
              claim.rejectionReason === reason
            )
              return serialize(claim, userId);
            throw new TRPCError({
              code: "CONFLICT",
              message: "이미 처리된 신청이에요. 최신 내용을 확인해 주세요.",
            });
          }
          const updated = await tx.claim.updateMany({
            where: { id: claim.id, companyId: company.id, status: "SUBMITTED" },
            data: {
              status: input.decision,
              rejectionReason: reason,
              reviewedBy: userId,
              reviewedAt: new Date(),
            },
          });
          if (updated.count !== 1)
            throw new TRPCError({
              code: "CONFLICT",
              message: "이미 처리된 신청이에요.",
            });
          return serialize(
            await tx.claim.findUniqueOrThrow({
              where: { id: claim.id },
              select,
            }),
            userId,
          );
        },
        { isolationLevel: "ReadCommitted" },
      );
    },
  };
}

export type ReviewService = ReturnType<typeof createReviewService>;
