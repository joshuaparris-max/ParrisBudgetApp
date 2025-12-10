import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getHouseholdIdForUser } from "@/lib/households";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";

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

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Rules</p>
        <h2 className="text-2xl font-semibold text-white">Merchant categorisation</h2>
        <p className="text-sm text-slate-300">
          First matching rule wins. Add more patterns in the database for now.
        </p>
      </div>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-3 gap-2 bg-slate-900/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <span>Pattern</span>
          <span>Category</span>
          <span className="text-right">Priority</span>
        </div>
        <div className="divide-y divide-slate-800">
          {rules.length === 0 && (
            <div className="px-4 py-3 text-sm text-slate-300">No rules yet.</div>
          )}
          {rules.map((rule) => (
            <div key={rule.id} className="grid grid-cols-3 gap-2 px-4 py-2 text-sm text-slate-100">
              <span>{rule.pattern}</span>
              <span className="text-slate-300">{rule.category?.name ?? "—"}</span>
              <span className="text-right">{rule.priority}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
