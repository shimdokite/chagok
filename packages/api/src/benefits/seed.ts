import type { PrismaClient } from "@prisma/client";
import { monthSchema } from "@chagok/contracts/benefits";

export function assertLocalDatabase(value: string | undefined) {
  if (!value) throw new Error("DATABASE_URL required");
  const url = new URL(value);
  if (
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    url.pathname !== "/chagok"
  ) {
    throw new Error("Seed requires the dedicated local chagok database");
  }
}

const samples = [
  {
    slug: "sample-grove",
    name: "그로브",
    allowance: 100000,
    categories: ["식비", "도서비", "운동비"],
  },
  {
    slug: "sample-wave",
    name: "웨이브",
    allowance: 150000,
    categories: ["도서비", "교육비"],
  },
];

export async function seedBenefits(db: PrismaClient, month: string) {
  monthSchema.parse(month);
  for (const sample of samples) {
    const company = await db.company.upsert({
      where: { slug: sample.slug },
      create: { slug: sample.slug, name: sample.name, isSample: true },
      update: {},
    });
    if (!company.isSample)
      throw new Error("Sample slug belongs to a real company");
    await db.benefitPolicy.upsert({
      where: { companyId_month: { companyId: company.id, month } },
      create: {
        companyId: company.id,
        month,
        allowance: sample.allowance,
        categories: sample.categories,
        guidance:
          "사용일 기준 월 한도예요. 검토 중·승인 완료 금액을 차감하며 반려 금액은 차감하지 않아요. 신청 생성과 영수증 첨부는 준비 중이에요.",
      },
      update: {},
    });
    const user = await db.user.upsert({
      where: { googleSub: `local-fixture:${sample.slug}` },
      create: { googleSub: `local-fixture:${sample.slug}` },
      update: {},
    });
    await linkSampleMember(db, user.id, sample.slug, month);
  }
}

export async function linkSampleMember(
  db: PrismaClient,
  userId: string,
  slug: string,
  month: string,
) {
  monthSchema.parse(month);
  const sample = samples.find((item) => item.slug === slug);
  if (!sample) throw new Error("Unknown sample company");
  return db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    const company = await tx.company.findUnique({ where: { slug } });
    if (!user || !company?.isSample)
      throw new Error("Existing user and seeded sample company required");
    const existing = await tx.membership.findUnique({ where: { userId } });
    if (existing && existing.companyId !== company.id)
      throw new Error(
        "Existing membership is preserved; refusing reassignment",
      );
    await tx.membership.upsert({
      where: { userId },
      create: { userId, companyId: company.id },
      update: {},
    });
    const entries = [
      {
        key: "submitted",
        amount: 15000,
        status: "SUBMITTED" as const,
        day: "12",
        title: "업무 역량을 위한 도서",
        category: "도서비",
        rejectionReason: null,
      },
      {
        key: "approved",
        amount: 20000,
        status: "APPROVED" as const,
        day: "10",
        title: "복지 이용",
        category: sample.categories[0],
        rejectionReason: null,
      },
      {
        key: "rejected",
        amount: 30000,
        status: "REJECTED" as const,
        day: "08",
        title: "증빙 확인이 필요한 신청",
        category: sample.categories.at(-1) ?? "도서비",
        rejectionReason:
          "결제 내역을 확인할 수 없어요. 사용일과 금액이 보이는 영수증을 준비해 주세요.",
      },
    ];
    for (const entry of entries) {
      const id = `sample:${userId}:${month}:${entry.key}`;
      const { key: _key, day, ...fields } = entry;
      await tx.claim.upsert({
        where: { id },
        create: {
          id,
          userId,
          companyId: company.id,
          ...fields,
          usedOn: `${month}-${day}`,
          submittedAt: new Date(`${month}-${day}T03:00:00Z`),
        },
        update: {},
      });
    }
  });
}
