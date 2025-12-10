"use server";

import { auth } from "@/lib/auth";
import { getHouseholdIdForUser } from "@/lib/households";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateBudgetLineAction(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData | null,
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };
  if (!formData) return { error: "No form data" };
  const lineId = formData.get("lineId")?.toString();
  const amount = Number(formData.get("amount"));
  if (!lineId || Number.isNaN(amount)) return { error: "Invalid input" };

  const householdId = await getHouseholdIdForUser(session.user.id);
  if (!householdId) return { error: "Household missing" };

  const line = await prisma.budgetLine.findUnique({
    where: { id: lineId },
    include: { budget: true },
  });
  if (!line || line.budget.householdId !== householdId) {
    return { error: "Not allowed" };
  }

  await prisma.budgetLine.update({
    where: { id: lineId },
    data: { amount },
  });

  revalidatePath("/budget");
  revalidatePath("/dashboard");
  return { success: true };
}
