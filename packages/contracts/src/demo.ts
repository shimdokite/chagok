export type ClaimStatus = "SUBMITTED" | "APPROVED" | "REJECTED";
export function balance(
  requests: readonly { amount: number; status: ClaimStatus }[],
  total: number,
) {
  const used = requests.reduce(
    (sum, item) => sum + (item.status === "REJECTED" ? 0 : item.amount),
    0,
  );
  return { total, used, available: total - used };
}
export const demo = {
  company: "그로브",
  name: "도연",
  month: "2026년 11월",
  total: 100000,
  requests: [
    {
      id: "demo-3",
      category: "도서비",
      title: "업무 역량을 위한 도서",
      amount: 15000,
      date: "11.12",
      status: "SUBMITTED",
    },
    {
      id: "demo-2",
      category: "식비",
      title: "팀 점심 식사",
      amount: 20000,
      date: "11.10",
      status: "APPROVED",
    },
    {
      id: "demo-1",
      category: "운동비",
      title: "운동 이용권",
      amount: 30000,
      date: "11.08",
      status: "REJECTED",
    },
  ],
} as const;
export const demoBalance = balance(demo.requests, demo.total);
export const won = (amount: number) => amount.toLocaleString("ko-KR");
