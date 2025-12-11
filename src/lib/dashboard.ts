import { PeriodType } from "@prisma/client";
import { differenceInCalendarDays, differenceInDays } from "date-fns";
import { prisma } from "./prisma";
import { getPeriodBounds, periodSeconds } from "./periods";
import { calculateRollover, toNumber } from "./rollover";
import { weeklyToPeriod } from "./budgetMath";

export type DashboardCategory = {
  id: string;
  name: string;
  budget: number;
  spend: number;
  carryIn: number;
  available: number;
  variance: number;
  status: "green" | "amber" | "red";
};

export type DashboardSummary = {
  totals: {
    budget: number; // expense budget for the period
    spend: number; // actual expense spend for the period
    incomeBudget: number;
    expenseBudget: number;
    netPlanned: number;
    status: "green" | "amber" | "red";
    pacing: "green" | "amber" | "red";
    paceDelta: number;
  };
  categories: DashboardCategory[];
  freshnessDays: number | null;
  lastDataAt: Date | null;
};

export async function getDashboardData(householdId: string, periodType: PeriodType) {
  const bounds = getPeriodBounds(periodType);
  const previousBounds = getPeriodBounds(periodType, new Date(bounds.start.getTime() - 86_400_000));

  // Prefer a budget matching the requested period. If missing (e.g. only weekly is set up),
  // fall back to the latest weekly budget and scale amounts to the requested period length.
  // Budget rows are stored weekly; we always scale using weeklyToPeriod.
  const budget = await prisma.budget.findFirst({
    where: { householdId, periodType: PeriodType.WEEK },
    orderBy: { startsOn: "desc" },
    include: { lines: { include: { category: true } } },
  });

  if (!budget) return null;

  const [transactions, ledgerEntries, lastImport, lastTxn] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        householdId,
        date: { gte: bounds.start, lte: bounds.end },
      },
      select: {
        categoryId: true,
        amount: true,
        direction: true,
        category: { select: { type: true } },
      },
    }),
    prisma.rolloverLedger.findMany({
      where: {
        householdId,
        periodStart: previousBounds.start,
        periodType,
      },
    }),
    prisma.import.findFirst({
      where: { householdId, status: "PARSED" },
      orderBy: { uploadedAt: "desc" },
    }),
    prisma.transaction.findFirst({
      where: { householdId },
      orderBy: { date: "desc" },
      select: { date: true },
    }),
  ]);

  const spendByCategory = new Map<string, number>();
  let totalSpendAll = 0;
  transactions.forEach((txn) => {
    // Only count expense spend; skip income categories.
    if (txn.category?.type === "INCOME") return;
    const amount = toNumber(txn.amount);
    const value = txn.direction === "DEBIT" ? amount : -amount;
    const key = txn.categoryId ?? "uncategorised";
    const current = spendByCategory.get(key) ?? 0;
    spendByCategory.set(key, current + value);
    totalSpendAll += value;
  });

  const carryInByCategory = new Map<string, number>();
  ledgerEntries.forEach((entry) => {
    carryInByCategory.set(entry.categoryId, toNumber(entry.carryOut));
  });

  const categories: DashboardCategory[] = budget.lines.map((line) => {
    const weeklyBudget = toNumber(line.amount);
    const scaledBudget = weeklyToPeriod(weeklyBudget, periodType as any, bounds);
    const spend = spendByCategory.get(line.categoryId) ?? 0;
    const carryIn = carryInByCategory.get(line.categoryId) ?? 0;
    const rollover = calculateRollover({
      budget: scaledBudget,
      carryIn,
      actualSpend: spend,
    });

    const status: "green" | "amber" | "red" =
      rollover.available - spend >= 0 ? "green" : spend > rollover.available ? "red" : "amber";

    return {
      id: line.categoryId,
      name: line.category.name,
      budget: scaledBudget,
      spend,
      carryIn,
      available: rollover.available,
      variance: rollover.variance,
      status,
    };
  });

  const expenseCategories = categories.filter((c) => {
    const cat = budget.lines.find((l) => l.categoryId === c.id)?.category;
    return cat?.type === "EXPENSE";
  });
  const incomeCategories = categories.filter((c) => {
    const cat = budget.lines.find((l) => l.categoryId === c.id)?.category;
    return cat?.type === "INCOME";
  });

  const expenseBudget = expenseCategories.reduce((acc, c) => acc + c.budget, 0);
  const incomeBudget = incomeCategories.reduce((acc, c) => acc + c.budget, 0);

  // Use all spend (even uncategorised) for expense spend headline.
  const totalExpenseSpend = totalSpendAll;

  // Rollover applied only at category-level availability, not the global budget.
  const remaining = expenseBudget - totalExpenseSpend;
  const status: "green" | "amber" | "red" = remaining >= 0 ? "green" : "red";

  const elapsedSeconds = Math.max(
    1,
    periodSeconds(bounds) - Math.max(0, (bounds.end.getTime() - Date.now()) / 1000),
  );
  const expectedSpendToDate = expenseBudget * (elapsedSeconds / periodSeconds(bounds));
  const paceDelta = expectedSpendToDate - totalExpenseSpend;
  const pacing: "green" | "amber" | "red" =
    remaining < 0 ? "red" : paceDelta >= 0 ? "green" : "amber";

  const lastDataAt = (() => {
    const importDate = lastImport?.uploadedAt ?? null;
    const txnDate = lastTxn?.date ?? null;
    if (importDate && txnDate) return importDate > txnDate ? importDate : txnDate;
    return importDate ?? txnDate ?? null;
  })();
  const freshnessDays = lastDataAt ? differenceInCalendarDays(new Date(), lastDataAt) : null;

  const summary: DashboardSummary = {
    totals: {
      budget: expenseBudget,
      spend: totalExpenseSpend,
      incomeBudget,
      expenseBudget,
      netPlanned: incomeBudget - expenseBudget,
      status,
      pacing,
      paceDelta,
    },
    categories,
    freshnessDays,
    lastDataAt,
  };

  return { summary, bounds };
}
