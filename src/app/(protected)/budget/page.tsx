import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getHouseholdIdForUser } from "@/lib/households";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { PeriodType } from "@prisma/client";

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

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Budget</p>
        <h2 className="text-2xl font-semibold text-white">Weekly targets</h2>
        <p className="text-sm text-slate-300">Edit in code for now; UI editing coming next.</p>
      </div>
      {!budget && <p className="text-slate-200">No budget found.</p>}
      {budget && (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-3 gap-2 bg-slate-900/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <span>Category</span>
            <span className="text-right">Amount</span>
            <span className="text-right">Type</span>
          </div>
          <div className="divide-y divide-slate-800">
            {budget.lines.map((line) => (
              <div key={line.id} className="grid grid-cols-3 gap-2 px-4 py-2 text-sm text-slate-100">
                <span>{line.category.name}</span>
                <span className="text-right">${Number(line.amount).toFixed(2)}</span>
                <span className="text-right text-slate-400">{line.category.type}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
