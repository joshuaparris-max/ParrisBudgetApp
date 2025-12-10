import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getHouseholdIdForUser } from "@/lib/households";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { PeriodType } from "@prisma/client";
import { BudgetEditor } from "@/components/budget-editor";

export default async function BudgetPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const householdId = await getHouseholdIdForUser(session.user.id);
  if (!householdId) redirect("/settings");

  const budget = await prisma.budget.findFirst({
    where: { householdId, periodType: PeriodType.WEEK },
    orderBy: { startsOn: "desc" },
    include: { lines: { include: { category: true } }, household: true },
  });

  // Serialize Decimal fields to plain numbers before sending to Client Components.
  // Prisma returns Decimal instances which are not transferable to Client Components.
  const serializedBudget =
    budget && {
      ...budget,
      lines: budget.lines.map((line) => ({
        ...line,
        amount: Number(line.amount),
      })),
    };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Budget</p>
        <h2 className="text-2xl font-semibold text-white">Weekly targets</h2>
        <p className="text-sm text-slate-300">Edit amounts inline below.</p>
      </div>
      {!serializedBudget && <p className="text-slate-200">No budget found.</p>}
      {serializedBudget && <BudgetEditor budget={serializedBudget as any} />}
    </div>
  );
}
