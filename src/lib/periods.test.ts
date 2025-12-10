import { describe, expect, it } from "vitest";
import { getPeriodBounds, getPreviousPeriod } from "./periods";
import { PeriodType } from "@prisma/client";

describe("period bounds", () => {
  it("gets weekly bounds starting Monday", () => {
    const ref = new Date("2024-05-15"); // Wednesday
    const bounds = getPeriodBounds(PeriodType.WEEK, ref, { weekStartsOn: 1 });
    expect(bounds.start.getDay()).toBe(1);
  });

  it("gets previous period", () => {
    const ref = new Date("2024-05-15");
    const current = getPeriodBounds(PeriodType.MONTH, ref);
    const prev = getPreviousPeriod(current);
    expect(prev.end.getMonth()).toBe(current.start.getMonth() - 1);
  });
});
