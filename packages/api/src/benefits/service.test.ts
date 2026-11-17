import { describe, expect, it } from "vitest";
import {
  monthSchema,
  monthBounds,
  currentMonth,
} from "@chagok/contracts/benefits";
import { summarizeAmounts } from "./service";

describe("월별 복지 계산", () => {
  it("대기와 승인만 한 번 차감하고 반려는 제외한다", () => {
    expect(
      summarizeAmounts(100000, [
        { status: "SUBMITTED", amount: 15000 },
        { status: "APPROVED", amount: 20000 },
        { status: "REJECTED", amount: 30000 },
      ]),
    ).toEqual({
      total: 100000,
      submitted: 15000,
      approved: 20000,
      available: 65000,
    });
  });
  it("0원 한도와 초과 사용을 왜곡하지 않는다", () => {
    expect(summarizeAmounts(0, []).available).toBe(0);
    expect(
      summarizeAmounts(100, [{ status: "APPROVED", amount: 200 }]).available,
    ).toBe(-100);
  });
  it("KST 자정에서 월이 바뀌고 12월의 다음 달은 다음 해다", () => {
    expect(currentMonth(new Date("2026-10-31T14:59:59Z"))).toBe("2026-10");
    expect(currentMonth(new Date("2026-10-31T15:00:00Z"))).toBe("2026-11");
    expect(monthBounds("2026-12")).toEqual({
      start: "2026-12-01",
      end: "2027-01-01",
    });
  });
  it.each(["2026-00", "2026-13", "26-11", "2026-1", "foo", "2026-11-01"])(
    "불완전한 월 %s 거부",
    (month) => {
      expect(monthSchema.safeParse(month).success).toBe(false);
    },
  );
});
