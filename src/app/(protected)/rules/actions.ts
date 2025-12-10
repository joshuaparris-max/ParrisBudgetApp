"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getHouseholdIdForUser } from "@/lib/households";
import { prisma } from "@/lib/prisma";
import { RuleMatchType } from "@prisma/client";

const upsertSchema = z.object({
  id: z.string().optional(),
  pattern: z.string().min(1),
  categoryId: z.string().min(1),
  matchType: z.nativeEnum(RuleMatchType),
  priority: z.coerce.number().int(),
});

export async function upsertRuleAction(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData | null,
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };
  if (!formData) return { error: "No form data" };

  const parsed = upsertSchema.safeParse({
    id: formData.get("id")?.toString(),
    pattern: formData.get("pattern")?.toString(),
    categoryId: formData.get("categoryId")?.toString(),
    matchType: formData.get("matchType")?.toString(),
    priority: formData.get("priority")?.toString(),
  });
  if (!parsed.success) return { error: "Invalid input" };

  const householdId = await getHouseholdIdForUser(session.user.id);
  if (!householdId) return { error: "Household missing" };

  if (parsed.data.id) {
    const existing = await prisma.rule.findUnique({ where: { id: parsed.data.id } });
    if (!existing || existing.householdId !== householdId) return { error: "Not allowed" };
    await prisma.rule.update({
      where: { id: parsed.data.id },
      data: {
        pattern: parsed.data.pattern,
        categoryId: parsed.data.categoryId,
        matchType: parsed.data.matchType,
        priority: parsed.data.priority,
      },
    });
  } else {
    await prisma.rule.create({
      data: {
        householdId,
        pattern: parsed.data.pattern,
        categoryId: parsed.data.categoryId,
        matchType: parsed.data.matchType,
        priority: parsed.data.priority,
      },
    });
  }

  revalidatePath("/rules");
  revalidatePath("/import");
  return { success: true };
}

export async function deleteRuleAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };
  const householdId = await getHouseholdIdForUser(session.user.id);
  if (!householdId) return { error: "Household missing" };

  const ruleId = formData.get("ruleId")?.toString();
  if (!ruleId) return { error: "Invalid rule" };

  const rule = await prisma.rule.findUnique({ where: { id: ruleId } });
  if (!rule || rule.householdId !== householdId) return { error: "Not allowed" };

  await prisma.rule.delete({ where: { id: ruleId } });
  revalidatePath("/rules");
  revalidatePath("/import");
  return { success: true };
}
