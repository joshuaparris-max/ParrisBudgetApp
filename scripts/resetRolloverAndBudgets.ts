/**
 * One-off helper to clean rollover ledger and zero stray budgets.
 *
 * Usage:
 *   export DATABASE_URL="postgresql://postgres:PW@...supabase.../postgres?sslmode=require"
 *   npx tsx scripts/resetRolloverAndBudgets.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const household = await prisma.household.findFirst();
  if (!household) {
    console.log("No household found; nothing to reset.");
    return;
  }

  const deleted = await prisma.rolloverLedger.deleteMany({
    where: { householdId: household.id },
  });
  console.log(`Cleared rollover entries: ${deleted.count}`);

  // Optional: zero any budget lines whose category is "Uncategorised".
  const uncategorised = await prisma.category.findFirst({
    where: { householdId: household.id, name: "Uncategorised" },
  });
  if (uncategorised) {
    const updated = await prisma.budgetLine.updateMany({
      where: { categoryId: uncategorised.id },
      data: { amount: 0 },
    });
    console.log(`Zeroed uncategorised budget lines: ${updated.count}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
