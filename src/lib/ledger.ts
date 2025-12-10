import { PeriodType } from "@prisma/client";
import { startOfWeek, endOfWeek, addDays } from "date-fns";
import { prisma } from "./prisma";
import { calculateRollover, toNumber } from "./rollover";

// Recompute the current week's rollover ledger for the household.
export async function recomputeCurrentWeekLedger(householdId: string) {
  const start = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday start
  const end = endOfWeek(start, { weekStartsOn: 1 });

  const [budget, transactions, previousLedger] = await Promise.all([
    prisma.budget.findFirst({
      where: { householdId, periodType: PeriodType.WEEK },
      orderBy: { startsOn: "desc" },
      include: { lines: true },
    }),
    prisma.transaction.findMany({
      where: { householdId, date: { gte: start, lte: end } },
      select: { categoryId: true, amount: true, direction: true },
    }),
    prisma.rolloverLedger.findMany({
      where: { householdId, periodType: PeriodType.WEEK, periodStart: addDays(start, -7) },
    }),
  ]);

  if (!budget) return;

  const spendByCategory = new Map<string, number>();
  transactions.forEach((txn) => {
    const amt = toNumber(txn.amount);
    const net = txn.direction === "DEBIT" ? amt : -amt;
    const key = txn.categoryId ?? "uncategorised";
    spendByCategory.set(key, (spendByCategory.get(key) ?? 0) + net);
  });

  const previousMap = new Map<string, number>();
  previousLedger.forEach((entry) => {
    previousMap.set(entry.categoryId, toNumber(entry.carryOut));
  });

  for (const line of budget.lines) {
    const spend = spendByCategory.get(line.categoryId) ?? 0;
    const carryIn = previousMap.get(line.categoryId) ?? 0;
    const rollover = calculateRollover({
      budget: toNumber(line.amount),
      carryIn,
      actualSpend: spend,
    });

    await prisma.rolloverLedger.upsert({
      where: {
        householdId_categoryId_periodStart_periodType: {
          householdId,
          categoryId: line.categoryId,
          periodStart: start,
          periodType: PeriodType.WEEK,
        },
      },
      update: {
        carryIn,
        carryOut: rollover.carryOut,
      },
      create: {
        householdId,
        categoryId: line.categoryId,
        periodStart: start,
        periodType: PeriodType.WEEK,
        carryIn,
        carryOut: rollover.carryOut,
      },
    });
  }
}

export async function recomputeLedgerHistory(householdId: string) {
  const earliestTxn = await prisma.transaction.findFirst({
    where: { householdId },
    orderBy: { date: "asc" },
    select: { date: true },
  });
  if (!earliestTxn) return;

  let cursor = startOfWeek(earliestTxn.date, { weekStartsOn: 1 });
  const now = startOfWeek(new Date(), { weekStartsOn: 1 });

  while (cursor <= now) {
    const end = endOfWeek(cursor, { weekStartsOn: 1 });
    const [budget, transactions, prevLedger] = await Promise.all([
      prisma.budget.findFirst({
        where: { householdId, periodType: PeriodType.WEEK },
        orderBy: { startsOn: "desc" },
        include: { lines: true },
      }),
      prisma.transaction.findMany({
        where: { householdId, date: { gte: cursor, lte: end } },
        select: { categoryId: true, amount: true, direction: true },
      }),
      prisma.rolloverLedger.findMany({
        where: { householdId, periodType: PeriodType.WEEK, periodStart: addDays(cursor, -7) },
      }),
    ]);
    if (!budget) break;

    const spendByCategory = new Map<string, number>();
    transactions.forEach((txn) => {
      const amt = toNumber(txn.amount);
      const net = txn.direction === "DEBIT" ? amt : -amt;
      const key = txn.categoryId ?? "uncategorised";
      spendByCategory.set(key, (spendByCategory.get(key) ?? 0) + net);
    });
    const prevMap = new Map<string, number>();
    prevLedger.forEach((entry) => {
      prevMap.set(entry.categoryId, toNumber(entry.carryOut));
    });

    for (const line of budget.lines) {
      const spend = spendByCategory.get(line.categoryId) ?? 0;
      const carryIn = prevMap.get(line.categoryId) ?? 0;
      const rollover = calculateRollover({
        budget: toNumber(line.amount),
        carryIn,
        actualSpend: spend,
      });

      await prisma.rolloverLedger.upsert({
        where: {
          householdId_categoryId_periodStart_periodType: {
            householdId,
            categoryId: line.categoryId,
            periodStart: cursor,
            periodType: PeriodType.WEEK,
          },
        },
        update: {
          carryIn,
          carryOut: rollover.carryOut,
        },
        create: {
          householdId,
          categoryId: line.categoryId,
          periodStart: cursor,
          periodType: PeriodType.WEEK,
          carryIn,
          carryOut: rollover.carryOut,
        },
      });
    }

    cursor = addDays(cursor, 7);
  }
}
