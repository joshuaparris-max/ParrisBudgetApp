import { describe, expect, it } from "vitest";
import { RuleMatchType } from "@prisma/client";
import { chooseCategoryFromRules } from "./rules";

describe("chooseCategoryFromRules", () => {
  it("returns first matching rule by priority order", () => {
    const cat = chooseCategoryFromRules("Woolworths Store 123", [
      { pattern: "Store", matchType: RuleMatchType.CONTAINS, categoryId: "c2", priority: 20 },
      { pattern: "Woolworths", matchType: RuleMatchType.CONTAINS, categoryId: "c1", priority: 10 },
    ]);
    expect(cat).toBe("c2"); // because rules are assumed sorted already
  });

  it("handles regex safely", () => {
    const cat = chooseCategoryFromRules("ABC123", [
      { pattern: "[0-9]+", matchType: RuleMatchType.REGEX, categoryId: "c3", priority: 1 },
    ]);
    expect(cat).toBe("c3");
  });
});
