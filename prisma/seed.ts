import { PrismaClient, CategoryType, PeriodType, RuleMatchType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { startOfWeek } from "date-fns";

const prisma = new PrismaClient();

const householdName = "Parris Family";

async function seedUsers(householdId: string) {
  const users = [
    { name: "Josh", email: "josh@example.com", password: "password123" },
    { name: "Kristy", email: "kristy@example.com", password: "password123" },
  ];

  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    const created = await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, passwordHash },
      create: {
        name: user.name,
        email: user.email,
        passwordHash,
      },
    });

    await prisma.householdMember.upsert({
      where: {
        householdId_userId: {
          householdId,
          userId: created.id,
        },
      },
      update: {},
      create: {
        householdId,
        userId: created.id,
      },
    });
  }
}

async function seedAccounts(householdId: string) {
  const accounts = [
    { bankName: "Bendigo Bank", nickname: "Joint Card & Bills" },
    { bankName: "Bendigo Bank", nickname: "Savings" },
  ];

  for (const account of accounts) {
    await prisma.account.upsert({
      where: {
        householdId_nickname: {
          nickname: account.nickname,
          householdId,
        },
      },
      update: { bankName: account.bankName },
      create: {
        bankName: account.bankName,
        nickname: account.nickname,
        householdId,
      },
    });
  }
}

type CategorySeed = {
  name: string;
  type: CategoryType;
  sortOrder: number;
  weekly?: number;
};

async function seedCategories(householdId: string) {
  // Weekly amounts now aligned to the last ~6 months of actuals from transactions.csv.
  // Income ≈ $2,811/wk, Expenses ≈ $2,788/wk (net ≈ +$23/wk).
  const categories: CategorySeed[] = [
    // Income (observed)
    { name: "Josh Work", type: CategoryType.INCOME, sortOrder: 1, weekly: 2411.13 },
    { name: "Kristy Work", type: CategoryType.INCOME, sortOrder: 2, weekly: 0 },
    { name: "Rental Income", type: CategoryType.INCOME, sortOrder: 3, weekly: 0 },
    { name: "Family Tax Benefit", type: CategoryType.INCOME, sortOrder: 4, weekly: 399.59 },

    // Expenses (observed)
    { name: "Netflix", type: CategoryType.EXPENSE, sortOrder: 10, weekly: 2.05 },
    { name: "ANMF", type: CategoryType.EXPENSE, sortOrder: 11, weekly: 0 },
    { name: "Spotify", type: CategoryType.EXPENSE, sortOrder: 12, weekly: 0 },
    { name: "Groceries", type: CategoryType.EXPENSE, sortOrder: 20, weekly: 243.08 },
    { name: "Loan repayments", type: CategoryType.EXPENSE, sortOrder: 21, weekly: 290.08 },
    { name: "Fuel", type: CategoryType.EXPENSE, sortOrder: 22, weekly: 56.73 },
    { name: "Medibank", type: CategoryType.EXPENSE, sortOrder: 23, weekly: 34.95 },
    { name: "Tithe", type: CategoryType.EXPENSE, sortOrder: 24, weekly: 0 },
    { name: "Rates", type: CategoryType.EXPENSE, sortOrder: 25, weekly: 94.16 },
    { name: "Internet", type: CategoryType.EXPENSE, sortOrder: 26, weekly: 22.83 },
    { name: "Gas", type: CategoryType.EXPENSE, sortOrder: 27, weekly: 0 },
    { name: "Electricity", type: CategoryType.EXPENSE, sortOrder: 28, weekly: 0 },
    { name: "Water", type: CategoryType.EXPENSE, sortOrder: 29, weekly: 0 },
    { name: "RACV insurance (house)", type: CategoryType.EXPENSE, sortOrder: 30, weekly: 25.24 },
    { name: "RACV car insurance", type: CategoryType.EXPENSE, sortOrder: 31, weekly: 162.23 },
    { name: "Car rego", type: CategoryType.EXPENSE, sortOrder: 32, weekly: 0.38 },
    { name: "OpenAI / ChatGPT", type: CategoryType.EXPENSE, sortOrder: 33, weekly: 7.02 },
    { name: "Apple / Microsoft", type: CategoryType.EXPENSE, sortOrder: 34, weekly: 10.58 },
    { name: "Google Play", type: CategoryType.EXPENSE, sortOrder: 35, weekly: 8.5 }, // apps/games
    { name: "Streaming (YouTube/Dropout)", type: CategoryType.EXPENSE, sortOrder: 36, weekly: 5.5 },
    { name: "Kids Activities (Bear & Cub)", type: CategoryType.EXPENSE, sortOrder: 37, weekly: 4.5 },
    // Annual NDIS plan: $16,207.20 over 52 weeks ≈ $311.68/week.
    { name: "NDIS Therapy (Sylvie)", type: CategoryType.EXPENSE, sortOrder: 38, weekly: 311.68 },
    { name: "Rental tax (Sinking)", type: CategoryType.EXPENSE, sortOrder: 39, weekly: 0 },
    { name: "Mobile Phone", type: CategoryType.EXPENSE, sortOrder: 40, weekly: 0 },
    { name: "Eating Out", type: CategoryType.EXPENSE, sortOrder: 41, weekly: 11.62 },
    { name: "Uncategorised", type: CategoryType.EXPENSE, sortOrder: 999, weekly: 1496.72 },
  ];

  const results: Record<string, string> = {};

  for (const cat of categories) {
    const created = await prisma.category.upsert({
      where: { householdId_name: { householdId, name: cat.name } },
      update: { type: cat.type, sortOrder: cat.sortOrder },
      create: { name: cat.name, type: cat.type, sortOrder: cat.sortOrder, householdId },
    });
    results[cat.name] = created.id;
  }

  return { categoryIds: results, categories };
}

async function seedBudget(
  householdId: string,
  categoryIds: Record<string, string>,
  categories: CategorySeed[],
) {
  const startsOn = startOfWeek(new Date(), { weekStartsOn: 0 });
  const existing = await prisma.budget.findFirst({
    where: { householdId, periodType: PeriodType.WEEK, startsOn },
  });

  const budget = existing
    ? existing
    : await prisma.budget.create({
        data: {
          householdId,
          periodType: PeriodType.WEEK,
          startsOn,
          currency: "AUD",
        },
      });

  for (const cat of categories) {
    if (typeof cat.weekly !== "number") continue;
    const categoryId = categoryIds[cat.name];
    if (!categoryId) continue;
    await prisma.budgetLine.upsert({
      where: { budgetId_categoryId: { budgetId: budget.id, categoryId } },
      update: { amount: cat.weekly },
      create: { budgetId: budget.id, categoryId, amount: cat.weekly },
    });
  }
}

async function seedRules(householdId: string, categoryIds: Record<string, string>) {
  const ruleDefs = [
    { pattern: "Woolworths", category: "Groceries", matchType: RuleMatchType.CONTAINS, priority: 5 },
    { pattern: "Coles", category: "Groceries", matchType: RuleMatchType.CONTAINS, priority: 6 },
    { pattern: "Big W", category: "Groceries", matchType: RuleMatchType.CONTAINS, priority: 7 },
    { pattern: "Aldi", category: "Groceries", matchType: RuleMatchType.CONTAINS, priority: 8 },
    { pattern: "IGA", category: "Groceries", matchType: RuleMatchType.CONTAINS, priority: 9 },
    { pattern: "Dropout", category: "Streaming (YouTube/Dropout)", matchType: RuleMatchType.CONTAINS, priority: 10 },
    { pattern: "YouTube", category: "Streaming (YouTube/Dropout)", matchType: RuleMatchType.CONTAINS, priority: 11 },
    { pattern: "Bear and Cub", category: "Kids Activities (Bear & Cub)", matchType: RuleMatchType.CONTAINS, priority: 12 },
    { pattern: "Bearcub", category: "Kids Activities (Bear & Cub)", matchType: RuleMatchType.CONTAINS, priority: 13 },
    { pattern: "Sylvie", category: "NDIS Therapy (Sylvie)", matchType: RuleMatchType.CONTAINS, priority: 14 },
    { pattern: "NDIS", category: "NDIS Therapy (Sylvie)", matchType: RuleMatchType.CONTAINS, priority: 14 },
    { pattern: "therapy", category: "NDIS Therapy (Sylvie)", matchType: RuleMatchType.CONTAINS, priority: 14 },
    { pattern: "Fuel", category: "Fuel", matchType: RuleMatchType.CONTAINS, priority: 15 },
    { pattern: "Ampol", category: "Fuel", matchType: RuleMatchType.CONTAINS, priority: 16 },
    { pattern: "Caltex", category: "Fuel", matchType: RuleMatchType.CONTAINS, priority: 17 },
    { pattern: "BP", category: "Fuel", matchType: RuleMatchType.CONTAINS, priority: 18 },
    { pattern: "7-Eleven", category: "Fuel", matchType: RuleMatchType.CONTAINS, priority: 19 },
    { pattern: "Shell", category: "Fuel", matchType: RuleMatchType.CONTAINS, priority: 20 },
    { pattern: "Medibank", category: "Medibank", matchType: RuleMatchType.CONTAINS, priority: 25 },
    { pattern: "Tithe", category: "Tithe", matchType: RuleMatchType.CONTAINS, priority: 26 },
    { pattern: "Rates", category: "Rates", matchType: RuleMatchType.CONTAINS, priority: 27 },
    { pattern: "Council", category: "Rates", matchType: RuleMatchType.CONTAINS, priority: 28 },
    { pattern: "Launtel", category: "Internet", matchType: RuleMatchType.CONTAINS, priority: 30 },
    { pattern: "Telstra", category: "Mobile Phone", matchType: RuleMatchType.CONTAINS, priority: 31 },
    { pattern: "Optus", category: "Mobile Phone", matchType: RuleMatchType.CONTAINS, priority: 32 },
    { pattern: "Vodafone", category: "Mobile Phone", matchType: RuleMatchType.CONTAINS, priority: 33 },
    { pattern: "RACV", category: "RACV car insurance", matchType: RuleMatchType.CONTAINS, priority: 40 },
    { pattern: "Insurance", category: "RACV insurance (house)", matchType: RuleMatchType.CONTAINS, priority: 41 },
    { pattern: "Reg", category: "Car rego", matchType: RuleMatchType.CONTAINS, priority: 45 },
    { pattern: "Netflix", category: "Netflix", matchType: RuleMatchType.CONTAINS, priority: 50 },
    { pattern: "Spotify", category: "Spotify", matchType: RuleMatchType.CONTAINS, priority: 51 },
    { pattern: "Apple", category: "Apple / Microsoft", matchType: RuleMatchType.CONTAINS, priority: 52 },
    { pattern: "Microsoft", category: "Apple / Microsoft", matchType: RuleMatchType.CONTAINS, priority: 53 },
    { pattern: "Google", category: "Google Play", matchType: RuleMatchType.CONTAINS, priority: 54 },
    { pattern: "Play", category: "Google Play", matchType: RuleMatchType.CONTAINS, priority: 55 },
    { pattern: "ChatGPT", category: "OpenAI / ChatGPT", matchType: RuleMatchType.CONTAINS, priority: 56 },
    { pattern: "OpenAI", category: "OpenAI / ChatGPT", matchType: RuleMatchType.CONTAINS, priority: 57 },
    { pattern: "Domino", category: "Eating Out", matchType: RuleMatchType.CONTAINS, priority: 60 },
    { pattern: "McDonald", category: "Eating Out", matchType: RuleMatchType.CONTAINS, priority: 61 },
    { pattern: "KFC", category: "Eating Out", matchType: RuleMatchType.CONTAINS, priority: 62 },
    { pattern: "Hungry Jack", category: "Eating Out", matchType: RuleMatchType.CONTAINS, priority: 63 },
    { pattern: "Subway", category: "Eating Out", matchType: RuleMatchType.CONTAINS, priority: 64 },
  ];

  for (const rule of ruleDefs) {
    const categoryId = categoryIds[rule.category];
    if (!categoryId) continue;
    await prisma.rule.create({
      data: {
        householdId,
        categoryId,
        pattern: rule.pattern,
        matchType: rule.matchType,
        priority: rule.priority,
      },
    });
  }
}

async function main() {
  let household = await prisma.household.findFirst({ where: { name: householdName } });
  if (!household) {
    household = await prisma.household.create({ data: { name: householdName } });
  }

  await seedUsers(household.id);
  await seedAccounts(household.id);
  const { categoryIds, categories } = await seedCategories(household.id);
  await seedBudget(household.id, categoryIds, categories);
  await seedRules(household.id, categoryIds);

  console.log("Seed complete");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
