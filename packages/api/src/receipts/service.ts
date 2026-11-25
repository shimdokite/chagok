import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { validateImage } from "./image";
import type { ReceiptStorage } from "./storage";

export const RECEIPT_TTL_MS = 24 * 60 * 60 * 1000;

export async function linkReceipt(
  tx: Prisma.TransactionClient,
  id: string,
  userId: string,
  companyId: string,
) {
  const [receipt] = await tx.$queryRaw<
    { state: string; userId: string; companyId: string; createdAt: Date }[]
  >`
    SELECT "state", "userId", "companyId", "createdAt" FROM "Attachment" WHERE "id" = ${id} FOR UPDATE
  `;
  if (
    !receipt ||
    receipt.state !== "READY" ||
    receipt.userId !== userId ||
    receipt.companyId !== companyId ||
    receipt.createdAt.getTime() <= Date.now() - RECEIPT_TTL_MS
  )
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "영수증을 다시 첨부해 주세요.",
    });
  await tx.attachment.update({ where: { id }, data: { state: "LINKED" } });
}

export function createReceiptService(
  db: PrismaClient,
  storage: ReceiptStorage,
) {
  return {
    async upload(
      userId: string,
      expectedCompanyId: string,
      bytes: Buffer,
      mimeType: string | null,
    ) {
      const metadata = await validateImage(bytes, mimeType);
      const id = randomUUID();
      const row = await db.$transaction(async (tx) => {
        const [member] = await tx.$queryRaw<{ companyId: string }[]>`
          SELECT "companyId" FROM "Membership" WHERE "userId" = ${userId} FOR UPDATE
        `;
        if (!member || member.companyId !== expectedCompanyId)
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "회사 소속을 다시 확인해 주세요.",
          });
        return tx.attachment.create({
          data: {
            id,
            userId,
            companyId: member.companyId,
            storageLocation: storage.location,
            ...metadata,
          },
        });
      });
      // Persist the ledger BEFORE the object write; even a lost write reply is cleanable.
      await db.$transaction(
        async (tx) => {
          const [locked] = await tx.$queryRaw<{ state: string }[]>`
          SELECT "state" FROM "Attachment" WHERE "id" = ${id} FOR UPDATE
        `;
          if (locked?.state !== "PENDING")
            throw new TRPCError({ code: "CONFLICT" });
          await storage.put(id, bytes, metadata.mimeType);
          await tx.attachment.update({
            where: { id },
            data: { state: "READY" },
          });
        },
        { timeout: 30_000 },
      );
      return { attachmentId: row.id, ...metadata };
    },

    async cleanup(now = new Date(), ids?: string[]) {
      const cutoff = new Date(now.getTime() - RECEIPT_TTL_MS);
      const expired = await db.attachment.findMany({
        where: {
          storageLocation: storage.location,
          id: ids ? { in: ids } : undefined,
          OR: [
            { state: { in: ["PENDING", "READY"] }, createdAt: { lte: cutoff } },
            { state: "DELETING" },
          ],
        },
        select: { id: true },
        take: 100,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      });
      let deleted = 0;
      let failed = 0;
      for (const { id } of expired) {
        // UPDATE acquires the same row lock as linkReceipt and rechecks the state.
        const claimed = await db.attachment.updateMany({
          where: {
            id,
            storageLocation: storage.location,
            OR: [
              {
                state: { in: ["PENDING", "READY"] },
                createdAt: { lte: cutoff },
              },
              { state: "DELETING" },
            ],
          },
          data: { state: "DELETING" },
        });
        if (!claimed.count) continue;
        try {
          await storage.remove(id);
          await db.attachment.deleteMany({ where: { id, state: "DELETING" } });
          deleted++;
        } catch {
          failed++;
        }
      }
      return { deleted, failed };
    },
  };
}
