import { PeriodType } from "@prisma/client";
import { differenceInDays } from "date-fns";
import { prisma } from "./prisma";
import { getPeriodBounds, periodSeconds } from "./periods";
import { calculateRollover, toNumber } from "./rollover";

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
    budget: number;
    spend: number;
    carryIn: number;
    available: number;
    variance: number;
    status: "green" | "amber" | "red";
    pacing: "green" | "amber" | "red";
    paceDelta: number;
  };
  categories: DashboardCategory[];
  freshnessDays: number | null;
};

export async function getDashboardData(householdId: string, periodType: PeriodType) {
  const bounds = getPeriodBounds(periodType);
  const previousBounds = getPeriodBounds(periodType, new Date(bounds.start.getTime() - 86_400_000));

  const [budget, transactions, ledgerEntries, lastImport] = await Promise.all([
    prisma.budget.findFirst({
      where: { householdId, periodType },
      orderBy: { startsOn: "desc" },
      include: { lines: { include: { category: true } } },
    }),
    prisma.transaction.findMany({
      where: {
        householdId,
        date: { gte: bounds.start, lte: bounds.end },
      },
      select: { categoryId: true, amount: true, direction: true },
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
  ]);

  if (!budget) return null;

  const spendByCategory = new Map<string, number>();
  let totalSpendAll = 0;
  transactions.forEach((txn) => {
    const amount = toNumber(txn.amount);
    const value = txn.direction === "DEBIT" ? amount : -amount;
    const current = spendByCategory.get(txn.categoryId ?? "uncategorised") ?? 0;
    spendByCategory.set(txn.categoryId ?? "uncategorised", current + value);
    totalSpendAll += value;
  });

  const carryInByCategory = new Map<string, number>();
  ledgerEntries.forEach((entry) => {
    carryInByCategory.set(entry.categoryId, toNumber(entry.carryOut));
  });

  const categories: DashboardCategory[] = budget.lines.map((line) => {
    const spend = spendByCategory.get(line.categoryId) ?? 0;
    const carryIn = carryInByCategory.get(line.categoryId) ?? 0;
    const rollover = calculateRollover({
      budget: toNumber(line.amount),
      carryIn,
      actualSpend: spend,
    });

    const status: "green" | "amber" | "red" =
      rollover.available - spend >= 0 ? "green" : spend > rollover.available ? "red" : "amber";

    return {
      id: line.categoryId,
      name: line.category.name,
      budget: toNumber(line.amount),
      spend,
      carryIn,
      available: rollover.available,
      variance: rollover.variance,
      status,
    };
  });

  const totals = categories.reduce(
    (acc, item) => {
      acc.budget += item.budget;
      acc.spend += item.spend;
      acc.carryIn += item.carryIn;
      acc.available += item.available;
      acc.variance += item.variance;
      return acc;
    },
    { budget: 0, spend: 0, carryIn: 0, available: 0, variance: 0 },
  );

  // Use all spend (even uncategorised) for headline numbers.
  totals.spend = totalSpendAll;
  totals.variance = totals.budget - totalSpendAll;

  const remaining = totals.available - totals.spend;
  const status: "green" | "amber" | "red" = remaining >= 0 ? "green" : "red";

  const elapsedSeconds = Math.max(
    1,
    periodSeconds(bounds) - Math.max(0, (bounds.end.getTime() - Date.now()) / 1000),
  );
  const expectedSpendToDate = totals.available * (elapsedSeconds / periodSeconds(bounds));
  const paceDelta = expectedSpendToDate - totals.spend;
  const pacing: "green" | "amber" | "red" =
    remaining < 0 ? "red" : paceDelta >= 0 ? "green" : "amber";

  const freshnessDays = lastImport
    ? differenceInDays(new Date(), lastImport.uploadedAt)
    : null;

  const summary: DashboardSummary = {
    totals: {
      ...totals,
      status,
      pacing,
      paceDelta,
    },
    categories,
    freshnessDays,
  };

  return { summary, bounds };
}
