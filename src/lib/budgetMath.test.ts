import { describe, it, expect } from "vitest";
import { weeksInBounds, weeklyToPeriod, BudgetPeriod } from "./budgetMath";

const days = (n: number) => n * 24 * 60 * 60 * 1000;

describe("budgetMath", () => {
  it("calculates fractional weeks between bounds", () => {
    const start = new Date("2025-01-01T00:00:00Z");
    const end = new Date(start.getTime() + days(7));
    expect(weeksInBounds({ start, end })).toBeCloseTo(1);

    const endHalf = new Date(start.getTime() + days(3.5));
    expect(weeksInBounds({ start, end: endHalf })).toBeCloseTo(0.5);
  });

  const check = (weekly: number, period: BudgetPeriod, daysCount: number, expected: number) => {
    const start = new Date("2025-01-01T00:00:00Z");
    const end = new Date(start.getTime() + days(daysCount));
    expect(weeklyToPeriod(weekly, period, { start, end })).toBeCloseTo(expected);
  };

  it("scales weekly to week/fortnight", () => {
    check(100, "WEEK", 7, 100);
    check(100, "FORTNIGHT", 14, 200);
  });

  it("scales weekly to month/year using exact weeksInBounds", () => {
    // 4 weeks window
    check(100, "MONTH", 28, 400);
    // 52 weeks window
    check(100, "YEAR", 364, 5200);
    // partial month (30 days ~ 4.2857 weeks)
    check(100, "MONTH", 30, 428.5714);
  });
});
