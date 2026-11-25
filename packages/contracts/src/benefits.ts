import { z } from "zod";

export const monthSchema = z.string().regex(/^(20\d{2})-(0[1-9]|1[0-2])$/);
export const claimStatusSchema = z.enum(["SUBMITTED", "APPROVED", "REJECTED"]);
export type ClaimStatus = z.infer<typeof claimStatusSchema>;
export const statusLabels: Record<ClaimStatus, string> = {
  SUBMITTED: "검토 중",
  APPROVED: "승인 완료",
  REJECTED: "반려",
};
export type Company = { id: string; name: string; isSample: boolean };
export type Policy = {
  month: string;
  allowance: number;
  categories: string[];
  guidance: string;
};
export type ClaimItem = {
  id: string;
  title: string;
  category: string;
  amount: number;
  status: ClaimStatus;
  usedOn: string;
  submittedAt: string;
  rejectionReason: string | null;
};
export type Amounts = {
  total: number;
  submitted: number;
  approved: number;
  available: number;
};
export type HomeData =
  | { kind: "unassigned" }
  | { kind: "noPolicy"; company: Company; month: string }
  | {
      kind: "ready";
      company: Company;
      policy: Policy;
      amounts: Amounts;
      recent: ClaimItem[];
    };
export type HistoryData = {
  company: Company | null;
  items: ClaimItem[];
  nextCursor: { submittedAt: string; id: string } | null;
};
export type PolicyData = { company: Company | null; policy: Policy | null };
export const historyInput = z
  .object({
    month: monthSchema,
    status: claimStatusSchema.optional(),
    cursor: z
      .object({ submittedAt: z.iso.datetime(), id: z.string().min(1).max(100) })
      .strict()
      .optional(),
    limit: z.number().int().min(1).max(50).default(20),
  })
  .strict();
export type HistoryInput = z.input<typeof historyInput>;
// PostgreSQL text rejects NUL; lone surrogates cannot round-trip through UTF-8.
const claimText = z
  .string()
  .trim()
  .min(1)
  .regex(/^[^\u0000\uD800-\uDFFF]*$/u);
export const createClaimInput = z
  .object({
    requestId: z.uuid().toLowerCase(),
    expectedCompanyId: z.string().min(1).max(100).optional(),
    attachmentId: z.uuid().optional(),
    title: claimText.max(100),
    category: claimText.max(50),
    amount: z.number().int().min(1).max(2147483647),
    usedOn: z.iso.date().regex(/^20\d{2}-/),
  })
  .strict();
export type CreateClaimInput = z.infer<typeof createClaimInput>;

export function currentMonth(now = new Date()) {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 7);
}

export function shiftMonth(month: string, offset: number) {
  const [year, number] = monthSchema.parse(month).split("-").map(Number);
  return new Date(Date.UTC(year, number - 1 + offset, 1))
    .toISOString()
    .slice(0, 7);
}

export function monthBounds(month: string) {
  return {
    start: `${monthSchema.parse(month)}-01`,
    end: `${shiftMonth(month, 1)}-01`,
  };
}
