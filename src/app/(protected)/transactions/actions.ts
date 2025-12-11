"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getHouseholdIdForUser } from "@/lib/households";
import { prisma } from "@/lib/prisma";
import { recomputeCurrentWeekLedger } from "@/lib/ledger";
import { chooseCategoryFromRules } from "@/lib/rules";
import { RuleMatchType } from "@prisma/client";

const schema = z.object({
  transactionId: z.string(),
  categoryId: z.string().nullable().optional(),
});

export async function updateTransactionCategoryAction(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData | null,
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };
  if (!formData) return { error: "No form data" };

  const parsed = schema.safeParse({
    transactionId: formData.get("transactionId")?.toString(),
    categoryId: formData.get("categoryId")?.toString() || null,
  });
  if (!parsed.success) return { error: "Invalid input" };

  const householdId = await getHouseholdIdForUser(session.user.id);
  if (!householdId) return { error: "Household missing" };

  const txn = await prisma.transaction.findUnique({
    where: { id: parsed.data.transactionId },
    select: { householdId: true },
  });
  if (!txn || txn.householdId !== householdId) return { error: "Not allowed" };

  await prisma.transaction.update({
    where: { id: parsed.data.transactionId },
    data: { categoryId: parsed.data.categoryId },
  });

  await recomputeCurrentWeekLedger(householdId);
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  return { success: true };
}

const directUpdateSchema = z.object({
  transactionId: z.string(),
  categoryId: z.string().nullable(),
});

export async function updateTransactionCategoryDirect(input: {
  transactionId: string;
  categoryId: string | null;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const parsed = directUpdateSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  const householdId = await getHouseholdIdForUser(session.user.id);
  if (!householdId) return { error: "Household missing" };

  const txn = await prisma.transaction.findUnique({
    where: { id: parsed.data.transactionId },
    select: { id: true, householdId: true, categoryId: true, description: true, date: true },
  });
  if (!txn || txn.householdId !== householdId) return { error: "Not allowed" };

  await prisma.transaction.update({
    where: { id: parsed.data.transactionId },
    data: { categoryId: parsed.data.categoryId },
  });

  await recomputeCurrentWeekLedger(householdId);
  revalidatePath("/transactions");
  revalidatePath("/dashboard");

  return {
    success: true,
    previousCategoryId: txn.categoryId ?? null,
    newCategoryId: parsed.data.categoryId,
    description: txn.description,
  };
}

const deleteSchema = z.object({
  transactionId: z.string(),
});

export async function deleteTransactionAction(input: { transactionId: string }) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  const householdId = await getHouseholdIdForUser(session.user.id);
  if (!householdId) return { error: "Household missing" };

  const txn = await prisma.transaction.findUnique({
    where: { id: parsed.data.transactionId },
    select: { householdId: true },
  });
  if (!txn || txn.householdId !== householdId) return { error: "Not allowed" };

  await prisma.transaction.delete({ where: { id: parsed.data.transactionId } });

  await recomputeCurrentWeekLedger(householdId);
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  return { success: true };
}

const bulkUpdateSchema = z.object({
  transactionIds: z.array(z.string()).min(1),
  categoryId: z.string().nullable(),
});

export async function bulkUpdateTransactionCategoriesAction(input: {
  transactionIds: string[];
  categoryId: string | null;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };
  const parsed = bulkUpdateSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  const householdId = await getHouseholdIdForUser(session.user.id);
  if (!householdId) return { error: "Household missing" };

  const { transactionIds, categoryId } = parsed.data;
  await prisma.transaction.updateMany({
    where: { id: { in: transactionIds }, householdId },
    data: { categoryId },
  });

  await recomputeCurrentWeekLedger(householdId);
  revalidatePath("/transactions");
  revalidatePath("/dashboard");

  return { success: true };
}

const bulkDeleteSchema = z.object({
  transactionIds: z.array(z.string()).min(1),
});

export async function bulkDeleteTransactionsAction(input: { transactionIds: string[] }) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const parsed = bulkDeleteSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input" };

  const householdId = await getHouseholdIdForUser(session.user.id);
  if (!householdId) return { error: "Household missing" };

  const txns = await prisma.transaction.findMany({
    where: { id: { in: parsed.data.transactionIds }, householdId },
    select: { id: true },
  });
  if (txns.length !== parsed.data.transactionIds.length) return { error: "Not allowed" };

  await prisma.transaction.deleteMany({
    where: { id: { in: parsed.data.transactionIds }, householdId },
  });

  await recomputeCurrentWeekLedger(householdId);
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  return { success: true, deleted: txns.length };
}

const createRuleSchema = z.object({
  pattern: z.string().min(1),
  matchType: z.nativeEnum(RuleMatchType),
  categoryId: z.string(),
  priority: z.number().int().optional(),
});

export async function createRuleAction(input: {
  pattern: string;
  matchType?: RuleMatchType;
  categoryId: string;
  priority?: number;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };
  const householdId = await getHouseholdIdForUser(session.user.id);
  if (!householdId) return { error: "Household missing" };

  const parsed = createRuleSchema.safeParse({
    pattern: input.pattern.trim(),
    matchType: input.matchType ?? RuleMatchType.CONTAINS,
    categoryId: input.categoryId,
    priority: input.priority,
  });
  if (!parsed.success) return { error: "Invalid rule input" };

  const existing = await prisma.rule.findFirst({
    where: {
      householdId,
      pattern: parsed.data.pattern,
      categoryId: parsed.data.categoryId,
      matchType: parsed.data.matchType,
    },
  });
  if (existing) {
    return { success: true, duplicate: true, ruleId: existing.id };
  }

  const maxPriority = await prisma.rule.aggregate({
    where: { householdId },
    _max: { priority: true },
  });
  const priority =
    typeof parsed.data.priority === "number"
      ? parsed.data.priority
      : (maxPriority._max.priority ?? 0) + 1 || 100;

  const created = await prisma.rule.create({
    data: {
      householdId,
      categoryId: parsed.data.categoryId,
      pattern: parsed.data.pattern,
      matchType: parsed.data.matchType,
      priority,
    },
  });

  revalidatePath("/rules");
  return { success: true, ruleId: created.id };
}

export async function autoCategoriseUncategorisedAction() {
  const session = await auth();
  if (!session?.user?.id) return;
  const householdId = await getHouseholdIdForUser(session.user.id);
  if (!householdId) return;

  const [rules, uncategorised, uncatCategory] = await Promise.all([
    prisma.rule.findMany({ where: { householdId }, orderBy: { priority: "asc" } }),
    prisma.transaction.findMany({
      where: { householdId, categoryId: null },
      select: { id: true, description: true },
    }),
    prisma.category.findFirst({ where: { householdId, name: "Uncategorised" } }),
  ]);

  let updated = 0;
  for (const txn of uncategorised) {
    const categoryId = chooseCategoryFromRules(txn.description, rules);
    if (categoryId && categoryId !== uncatCategory?.id) {
      await prisma.transaction.update({
        where: { id: txn.id },
        data: { categoryId },
      });
      updated++;
    }
  }

  await recomputeCurrentWeekLedger(householdId);
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}
