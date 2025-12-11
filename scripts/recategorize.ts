import { PrismaClient, RuleMatchType } from "@prisma/client";
import { chooseCategoryFromRules } from "@/lib/rules";

/**
 * Re-apply rule-based categorisation to all transactions in the default household,
 * even if they already have a category. Useful for cleaning up misclassified
 * items after adding new rules (e.g., Google Play / Dropout / Bear & Cub).
 */
async function main() {
  const prisma = new PrismaClient();

  const household = await prisma.household.findFirst();
  if (!household) {
    console.error("No household found");
    return;
  }

  const rules = await prisma.rule.findMany({
    where: { householdId: household.id },
    orderBy: { priority: "asc" },
  });

  const txns = await prisma.transaction.findMany({
    where: { householdId: household.id },
    select: { id: true, description: true, categoryId: true },
  });

  let updated = 0;

  for (const txn of txns) {
    const nextCategory = chooseCategoryFromRules(txn.description, rules);
    if (nextCategory && nextCategory !== txn.categoryId) {
      await prisma.transaction.update({
        where: { id: txn.id },
        data: { categoryId: nextCategory },
      });
      updated++;
    }
  }

  console.log(`Re-categorised ${updated} transactions using ${rules.length} rules.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
