import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getHouseholdIdForUser } from "@/lib/households";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { RuleEditor } from "@/components/rule-editor";

export default async function RulesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const householdId = await getHouseholdIdForUser(session.user.id);
  if (!householdId) redirect("/settings");

  const rules = await prisma.rule.findMany({
    where: { householdId },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    include: { category: true },
  });
  const categories = await prisma.category.findMany({
    where: { householdId },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Rules</p>
        <h2 className="text-2xl font-semibold text-white">Merchant categorisation</h2>
        <p className="text-sm text-slate-300">First matching rule wins. Add or adjust below.</p>
      </div>

      <RuleEditor rules={rules} categories={categories} />
    </div>
  );
}
