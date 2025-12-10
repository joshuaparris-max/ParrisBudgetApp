import { describe, expect, it } from "vitest";
import { computeTransactionHash } from "./dedupe";

describe("dedupe hash", () => {
  it("is stable for same transaction", () => {
    const a = computeTransactionHash({
      householdId: "h1",
      accountId: "a1",
      date: new Date("2024-05-01"),
      amount: 12.34,
      description: "Coffee shop",
    });
    const b = computeTransactionHash({
      householdId: "h1",
      accountId: "a1",
      date: new Date("2024-05-01"),
      amount: 12.34,
      description: "Coffee shop",
    });
    expect(a).toBe(b);
  });

  it("differs for changed amount", () => {
    const a = computeTransactionHash({
      householdId: "h1",
      accountId: "a1",
      date: new Date("2024-05-01"),
      amount: 12.34,
      description: "Coffee shop",
    });
    const b = computeTransactionHash({
      householdId: "h1",
      accountId: "a1",
      date: new Date("2024-05-01"),
      amount: 15.0,
      description: "Coffee shop",
    });
    expect(a).not.toBe(b);
  });
});
