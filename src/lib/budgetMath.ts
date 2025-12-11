export type BudgetPeriod = "WEEK" | "FORTNIGHT" | "MONTH" | "YEAR";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const DAYS_PER_WEEK = 7;

/**
 * Exact fractional weeks between bounds (inclusive of start, exclusive of end),
 * based on milliseconds. This keeps scaling consistent for month/year ranges.
 */
export function weeksInBounds(bounds: { start: Date; end: Date }): number {
  const ms = bounds.end.getTime() - bounds.start.getTime();
  return ms / (MS_PER_DAY * DAYS_PER_WEEK);
}

/**
 * Convert a weekly amount to the given period using the date bounds.
 * WEEK: 1x, FORTNIGHT: 2x, MONTH/YEAR: exact weeksInBounds.
 */
export function weeklyToPeriod(
  weeklyAmount: number,
  period: BudgetPeriod,
  bounds: { start: Date; end: Date },
): number {
  if (!Number.isFinite(weeklyAmount)) return 0;
  switch (period) {
    case "WEEK":
      return weeklyAmount;
    case "FORTNIGHT":
      return weeklyAmount * 2;
    case "MONTH":
    case "YEAR":
      return weeklyAmount * weeksInBounds(bounds);
    default:
      return weeklyAmount;
  }
}
