import { getDb } from "../src/auth/store.ts";
import {
  assertLocalDatabase,
  linkSampleMember,
  seedBenefits,
} from "../src/benefits/seed.ts";
import { currentMonth, monthSchema } from "../../contracts/src/benefits.ts";

assertLocalDatabase(process.env.DATABASE_URL);
const [month = currentMonth(), userId, companySlug] = process.argv.slice(2);
monthSchema.parse(month);
if (Boolean(userId) !== Boolean(companySlug))
  throw new Error("Provide both userId and company slug");
const db = getDb();
try {
  await seedBenefits(db, month);
  if (userId && companySlug)
    await linkSampleMember(db, userId, companySlug, month);
  console.log(
    `Sample benefits ready for ${month}. Existing records preserved. Membership link: ${Boolean(userId)}.`,
  );
} finally {
  await db.$disconnect();
}
