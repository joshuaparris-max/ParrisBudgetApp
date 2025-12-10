import { RuleMatchType } from "@prisma/client";

export type RuleLike = {
  pattern: string;
  matchType: RuleMatchType;
  categoryId: string;
  priority: number;
};

export function chooseCategoryFromRules(description: string, rules: RuleLike[]) {
  const lower = description.toLowerCase();
  for (const rule of rules) {
    if (rule.matchType === RuleMatchType.CONTAINS && lower.includes(rule.pattern.toLowerCase())) {
      return rule.categoryId;
    }
    if (rule.matchType === RuleMatchType.STARTS_WITH && lower.startsWith(rule.pattern.toLowerCase())) {
      return rule.categoryId;
    }
    if (rule.matchType === RuleMatchType.REGEX) {
      try {
        const regex = new RegExp(rule.pattern, "i");
        if (regex.test(description)) {
          return rule.categoryId;
        }
      } catch (err) {
        // ignore invalid regex
      }
    }
  }
  return null;
}
