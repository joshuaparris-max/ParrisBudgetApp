import { describe, expect, it } from "vitest";
import { calculateRollover } from "./rollover";

describe("rollover math", () => {
  it("computes available, variance, carryOut", () => {
    const result = calculateRollover({ budget: 100, carryIn: 20, actualSpend: 80 });
    expect(result.available).toBe(120);
    expect(result.variance).toBe(20);
    expect(result.carryOut).toBe(40);
  });

  it("reduces carry when overspending", () => {
    const result = calculateRollover({ budget: 100, carryIn: 50, actualSpend: 170 });
    expect(result.carryOut).toBe(-20);
  });
});
