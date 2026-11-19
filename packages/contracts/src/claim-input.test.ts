import { describe, expect, it } from "vitest";
import { createClaimInput } from "./benefits";

const input = {
  requestId: "A2D745A9-044F-4D8E-B831-E838E44AA123",
  title: "  점심  ",
  category: " 식비 ",
  amount: 12000,
  usedOn: "2024-02-29",
};

describe("신청 입력 경계", () => {
  it.each(["점\u0000심", "점\ud800심", "점\udfff심"])(
    "저장할 수 없는 문자 %j 거부",
    (text) => {
      expect(
        createClaimInput.safeParse({ ...input, title: text }).success,
      ).toBe(false);
      expect(
        createClaimInput.safeParse({ ...input, category: text }).success,
      ).toBe(false);
    },
  );
  it("정상 이모지는 손실 없이 허용한다", () => {
    expect(createClaimInput.parse({ ...input, title: "점심 🍚" }).title).toBe(
      "점심 🍚",
    );
  });
  it("공백과 UUID 표기를 정규화한다", () => {
    expect(createClaimInput.parse(input)).toEqual({
      ...input,
      requestId: "a2d745a9-044f-4d8e-b831-e838e44aa123",
      title: "점심",
      category: "식비",
    });
  });
  it.each([0, -1, 0.5, 2147483648, NaN, Infinity, "12000"])(
    "금액 %s 거부",
    (amount) => {
      expect(createClaimInput.safeParse({ ...input, amount }).success).toBe(
        false,
      );
    },
  );
  it.each([
    "2026-02-29",
    "2026-04-31",
    "2026-13-01",
    "2026-1-01",
    "1999-12-31",
    "2100-01-01",
    "2026-11-01T00:00:00Z",
  ])("날짜 %s 거부", (usedOn) => {
    expect(createClaimInput.safeParse({ ...input, usedOn }).success).toBe(
      false,
    );
  });
  it.each([
    { title: " " },
    { title: "a".repeat(101) },
    { category: " " },
    { category: "a".repeat(51) },
    { requestId: "bad" },
    { userId: "forged" },
    { companyId: "forged" },
    { status: "APPROVED" },
  ])("입력 %j 거부", (change) => {
    expect(createClaimInput.safeParse({ ...input, ...change }).success).toBe(
      false,
    );
  });
  it.each([1, 2147483647])("정수 원 경계 %s 허용", (amount) => {
    expect(createClaimInput.safeParse({ ...input, amount }).success).toBe(true);
  });
});
