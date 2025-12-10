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

async function seedCategories(householdId: string) {
  const categories = [
    { name: "Income", type: CategoryType.INCOME, sortOrder: 1 },
    { name: "Groceries", type: CategoryType.EXPENSE, sortOrder: 10 },
    { name: "Fuel", type: CategoryType.EXPENSE, sortOrder: 20 },
    { name: "Eating Out", type: CategoryType.EXPENSE, sortOrder: 30 },
    { name: "Insurance", type: CategoryType.EXPENSE, sortOrder: 40 },
    { name: "Internet", type: CategoryType.EXPENSE, sortOrder: 50 },
    { name: "Tithe", type: CategoryType.EXPENSE, sortOrder: 60 },
    { name: "Savings", type: CategoryType.EXPENSE, sortOrder: 70 },
    { name: "Uncategorised", type: CategoryType.EXPENSE, sortOrder: 999 },
  ];

  const results: Record<string, string> = {};

  for (const cat of categories) {
    const created = await prisma.category.upsert({
      where: { householdId_name: { householdId, name: cat.name } },
      update: { type: cat.type, sortOrder: cat.sortOrder },
      create: { ...cat, householdId },
    });
    results[cat.name] = created.id;
  }

  return results;
}

async function seedBudget(householdId: string, categoryIds: Record<string, string>) {
  const startsOn = startOfWeek(new Date(), { weekStartsOn: 1 });
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

  const lines = [
    { category: "Income", amount: 2000 },
    { category: "Groceries", amount: 250 },
    { category: "Fuel", amount: 80 },
    { category: "Eating Out", amount: 60 },
    { category: "Insurance", amount: 120 },
    { category: "Internet", amount: 80 },
    { category: "Tithe", amount: 50 },
    { category: "Savings", amount: 100 },
    { category: "Uncategorised", amount: 0 },
  ];

  for (const line of lines) {
    const categoryId = categoryIds[line.category];
    if (!categoryId) continue;
    await prisma.budgetLine.upsert({
      where: { budgetId_categoryId: { budgetId: budget.id, categoryId } },
      update: { amount: line.amount },
      create: {
        budgetId: budget.id,
        categoryId,
        amount: line.amount,
      },
    });
  }
}

async function seedRules(householdId: string, categoryIds: Record<string, string>) {
  const ruleDefs = [
    { pattern: "Woolworths", category: "Groceries", matchType: RuleMatchType.CONTAINS, priority: 10 },
    { pattern: "Coles", category: "Groceries", matchType: RuleMatchType.CONTAINS, priority: 10 },
    { pattern: "Ampol", category: "Fuel", matchType: RuleMatchType.CONTAINS, priority: 20 },
    { pattern: "McDonalds", category: "Eating Out", matchType: RuleMatchType.CONTAINS, priority: 30 },
    { pattern: "Medibank", category: "Insurance", matchType: RuleMatchType.CONTAINS, priority: 40 },
    { pattern: "Launtel", category: "Internet", matchType: RuleMatchType.CONTAINS, priority: 50 },
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
  const categoryIds = await seedCategories(household.id);
  await seedBudget(household.id, categoryIds);
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
