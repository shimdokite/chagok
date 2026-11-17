import { demo } from "@chagok/contracts/demo";
import type {
  HomeData,
  HistoryInput,
  HistoryData,
  ClaimItem,
  PolicyData,
} from "@chagok/contracts/benefits";

const company = { id: "demo-grove", name: demo.company, isSample: true };
const policy = {
  month: "2026-11",
  allowance: demo.total,
  categories: ["식비", "도서비", "운동비"],
  guidance:
    "익명 데모예요. 실제 계정이나 회사의 신청이 아니에요. 검토 중·승인 완료 금액을 차감하고 반려는 차감하지 않아요.",
};
const claims: ClaimItem[] = demo.requests.map((claim) => ({
  ...claim,
  usedOn: `2026-${claim.date.replace(".", "-")}`,
  submittedAt: `2026-${claim.date.replace(".", "-")}T03:00:00.000Z`,
  rejectionReason:
    claim.status === "REJECTED"
      ? "사용일과 금액이 보이는 영수증을 준비해 주세요."
      : null,
}));

export function demoHome(month: string): HomeData {
  if (month !== policy.month) return { kind: "noPolicy", company, month };
  return {
    kind: "ready",
    company,
    policy,
    amounts: {
      total: 100000,
      submitted: 15000,
      approved: 20000,
      available: 65000,
    },
    recent: claims.slice(0, 2),
  };
}

export function demoHistory(input: HistoryInput): HistoryData {
  const items = claims.filter(
    (claim) =>
      claim.usedOn.startsWith(input.month) &&
      (!input.status || claim.status === input.status),
  );
  return { company, items, nextCursor: null };
}

export function demoDetail(id: string) {
  const claim = claims.find((item) => item.id === id);
  if (!claim) throw new Error("신청 내역을 찾을 수 없어요.");
  return { company, claim };
}

export function demoPolicy(month: string): PolicyData {
  return { company, policy: month === policy.month ? policy : null };
}
