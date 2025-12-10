import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getHouseholdIdForUser } from "@/lib/households";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { CategorySelector } from "@/components/category-selector";
import { autoCategoriseUncategorisedAction, updateTransactionCategoryAction } from "./actions";

export default async function TransactionsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const householdId = await getHouseholdIdForUser(session.user.id);
  if (!householdId) redirect("/settings");

  const transactions = await prisma.transaction.findMany({
    where: { householdId },
    orderBy: { date: "desc" },
    take: 50,
    include: { category: true, account: true },
  });

  const categories = await prisma.category.findMany({
    where: { householdId },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Transactions</p>
        <h2 className="text-2xl font-semibold text-white">Recent activity</h2>
        <form action={autoCategoriseUncategorisedAction} className="mt-2">
          <button
            type="submit"
            className="rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white hover:bg-brand-muted"
          >
            Auto-categorise uncategorised
          </button>
        </form>
      </div>
      <Card className="overflow-hidden">
        <div className="grid grid-cols-[120px_1fr_180px_120px_140px] gap-2 bg-slate-900/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <span>Date</span>
          <span>Description</span>
          <span>Category</span>
          <span className="text-right">Amount</span>
          <span className="text-right">Update</span>
        </div>
        <div className="divide-y divide-slate-800">
          {transactions.length === 0 && (
            <div className="px-4 py-3 text-sm text-slate-300">No transactions yet.</div>
          )}
          {transactions.map((txn) => (
            <div
              key={txn.id}
              className="grid grid-cols-[120px_1fr_180px_120px_140px] items-center gap-2 px-4 py-2 text-sm text-slate-100"
            >
              <span className="text-slate-300">{new Date(txn.date).toLocaleDateString()}</span>
              <span className="truncate">{txn.description}</span>
              <span className="text-slate-300">{txn.category?.name ?? "Uncategorised"}</span>
              <span className="text-right tabular-nums">
                {txn.direction === "CREDIT" ? "+" : "-"}
                {Number(txn.amount).toFixed(2)}
              </span>
              <div className="text-right">
                <CategorySelector
                  transactionId={txn.id}
                  categories={categories}
                  currentCategoryId={txn.categoryId ?? undefined}
                  action={updateTransactionCategoryAction}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
