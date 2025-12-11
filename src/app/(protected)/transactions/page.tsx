import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getHouseholdIdForUser } from "@/lib/households";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { autoCategoriseUncategorisedAction } from "./actions";
import { TransactionsTable } from "./transactions-table";

export const dynamic = "force-dynamic";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams?:
    | { category?: string; accountId?: string; from?: string; to?: string }
    | Promise<{ category?: string; accountId?: string; from?: string; to?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const householdId = await getHouseholdIdForUser(session.user.id);
  if (!householdId) redirect("/settings");

  const resolvedParams = searchParams ? await Promise.resolve(searchParams) : {};
  const categoryParam =
    typeof resolvedParams?.category === "string" ? resolvedParams.category : undefined;
  const accountParam =
    typeof resolvedParams?.accountId === "string" ? resolvedParams.accountId : undefined;
  const fromParam = typeof resolvedParams?.from === "string" ? resolvedParams.from : undefined;
  const toParam = typeof resolvedParams?.to === "string" ? resolvedParams.to : undefined;

  const fromDate = fromParam && !isNaN(new Date(fromParam).getTime()) ? new Date(fromParam) : null;
  const toDate = toParam && !isNaN(new Date(toParam).getTime()) ? new Date(toParam) : null;
  const categoryFilter =
    categoryParam === "uncategorised"
      ? { categoryId: null }
      : categoryParam
        ? { categoryId: categoryParam }
        : {};
  const dateFilter =
    fromDate || toDate
      ? {
          date: {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lte: toDate } : {}),
          },
        }
      : {};

  const transactions = await prisma.transaction.findMany({
    where: {
      householdId,
      ...categoryFilter,
      ...(accountParam ? { accountId: accountParam } : {}),
      ...dateFilter,
    },
    orderBy: { date: "desc" },
    take: 200,
      include: { category: true, account: true },
  });

  const categories = await prisma.category.findMany({
    where: { householdId },
    orderBy: { sortOrder: "asc" },
  });
  const accounts = await prisma.account.findMany({
    where: { householdId },
    orderBy: { nickname: "asc" },
  });
  const selectedCategory =
    categoryParam && categoryParam !== "uncategorised"
      ? categories.find((c) => c.id === categoryParam)
      : null;
  const selectedAccount = accountParam ? accounts.find((a) => a.id === accountParam) : null;

  const accountTotals = transactions.reduce(
    (acc, txn) => {
      const amt = Number(txn.amount);
      if (txn.direction === "CREDIT") acc.inflow += amt;
      else acc.outflow += amt;
      acc.net += txn.direction === "CREDIT" ? amt : -amt;
      return acc;
    },
    { inflow: 0, outflow: 0, net: 0 },
  );

  const tableData = transactions.map((txn) => ({
    id: txn.id,
    date: txn.date.toISOString(),
    dateLabel: txn.date.toLocaleDateString("en-AU", { timeZone: "UTC" }),
    description: txn.description,
    amount: Number(txn.amount),
    direction: txn.direction,
    categoryId: txn.categoryId,
  }));

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Transactions</p>
        <h2 className="text-2xl font-semibold text-white">
          Recent activity
          {categoryParam
            ? categoryParam === "uncategorised"
              ? " • Uncategorised"
              : selectedCategory
                ? ` • ${selectedCategory.name}`
                : " • Filtered"
            : ""}
        </h2>
        {categoryParam && (
          <div className="mt-1 text-sm text-slate-300">
            Showing {categoryParam === "uncategorised" ? "uncategorised" : selectedCategory ? selectedCategory.name : "category-filtered"} items.{" "}
            <a href="/transactions" className="text-brand underline">
              Clear filter
            </a>
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <form className="flex flex-wrap items-center gap-2" method="get">
            <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Account</label>
            <select
              name="accountId"
              defaultValue={accountParam ?? ""}
              className="rounded-lg border border-slate-700 bg-slate-900/70 px-2 py-1 text-xs text-slate-100"
            >
              <option value="">All accounts</option>
              {accounts.map((acct) => (
                <option key={acct.id} value={acct.id}>
                  {acct.nickname}
                </option>
              ))}
            </select>
            {categoryParam && <input type="hidden" name="category" value={categoryParam} />}
            <label className="ml-3 text-xs uppercase tracking-[0.2em] text-slate-400">From</label>
            <input
              type="date"
              name="from"
              defaultValue={fromParam ?? ""}
              className="rounded-lg border border-slate-700 bg-slate-900/70 px-2 py-1 text-xs text-slate-100"
            />
            <label className="ml-3 text-xs uppercase tracking-[0.2em] text-slate-400">To</label>
            <input
              type="date"
              name="to"
              defaultValue={toParam ?? ""}
              className="rounded-lg border border-slate-700 bg-slate-900/70 px-2 py-1 text-xs text-slate-100"
            />
            <button
              type="submit"
              className="rounded-lg bg-slate-800 px-2 py-1 text-xs font-semibold text-white hover:bg-slate-700"
            >
              Apply
            </button>
          </form>
          <form action={autoCategoriseUncategorisedAction}>
            <button
              type="submit"
              className="rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white hover:bg-brand-muted"
            >
              Auto-categorise uncategorised
            </button>
          </form>
        </div>
      </div>
      {selectedAccount && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{selectedAccount.bankName}</p>
              <h3 className="text-lg font-semibold text-white">{selectedAccount.nickname}</h3>
            </div>
            <a href="/transactions" className="text-brand text-sm underline">
              Clear account filter
            </a>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-sm text-slate-200">
            <div>
              <p className="text-slate-400">Inflows</p>
              <p className="font-semibold text-emerald-300">${Number(accountTotals.inflow).toFixed(0)}</p>
            </div>
            <div>
              <p className="text-slate-400">Outflows</p>
              <p className="font-semibold text-rose-300">${Number(accountTotals.outflow).toFixed(0)}</p>
            </div>
            <div>
              <p className="text-slate-400">Net</p>
              <p className="font-semibold text-white">${Number(accountTotals.net).toFixed(0)}</p>
            </div>
          </div>
          {(fromParam || toParam) && (
            <div className="mt-2 text-xs text-slate-400">
              Showing transactions{" "}
              {fromParam ? `from ${fromParam}` : "from start"}{" "}
              {toParam ? `to ${toParam}` : "onwards"}
            </div>
          )}
        </Card>
      )}
      <TransactionsTable transactions={tableData} categories={categories} />
    </div>
  );
}
