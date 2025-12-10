"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getHouseholdIdForUser } from "@/lib/households";
import { prisma } from "@/lib/prisma";
import { recomputeCurrentWeekLedger } from "@/lib/ledger";
import { chooseCategoryFromRules } from "@/lib/rules";

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

export async function autoCategoriseUncategorisedAction() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };
  const householdId = await getHouseholdIdForUser(session.user.id);
  if (!householdId) return { error: "Household missing" };

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

  return { success: true, updated };
}
