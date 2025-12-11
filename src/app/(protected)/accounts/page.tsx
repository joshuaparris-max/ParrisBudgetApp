import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getHouseholdIdForUser } from "@/lib/households";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";

type AccountStats = {
  inflow: number;
  outflow: number;
  net: number;
  count: number;
  lastDate: Date | null;
};

export default async function AccountsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const householdId = await getHouseholdIdForUser(session.user.id);
  if (!householdId) redirect("/settings");

  const accounts = await prisma.account.findMany({
    where: { householdId },
    orderBy: { nickname: "asc" },
  });

  const accountIds = accounts.map((a) => a.id);
  const transactions = await prisma.transaction.findMany({
    where: { householdId, accountId: { in: accountIds } },
    select: { accountId: true, amount: true, direction: true, date: true },
  });

  const stats = new Map<string, AccountStats>();
  accountIds.forEach((id) =>
    stats.set(id, { inflow: 0, outflow: 0, net: 0, count: 0, lastDate: null }),
  );

  transactions.forEach((txn) => {
    const entry = stats.get(txn.accountId ?? "");
    if (!entry) return;
    const amt = Number(txn.amount);
    if (txn.direction === "CREDIT") {
      entry.inflow += amt;
      entry.net += amt;
    } else {
      entry.outflow += amt;
      entry.net -= amt;
    }
    entry.count += 1;
    if (!entry.lastDate || txn.date > entry.lastDate) entry.lastDate = txn.date;
  });

  const fmt = (n: number) => n.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const fmtDate = (d: Date | null) => (d ? new Date(d).toLocaleDateString() : "—");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Accounts</p>
        <h2 className="text-2xl font-semibold text-white">Bank accounts</h2>
        <p className="text-sm text-slate-300">All Bendigo accounts and their recent totals.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {accounts.map((acct) => {
          const s = stats.get(acct.id) ?? { inflow: 0, outflow: 0, net: 0, count: 0, lastDate: null };
          return (
            <Card key={acct.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{acct.bankName}</p>
                  <h3 className="text-lg font-semibold text-white">{acct.nickname}</h3>
                </div>
                <Link href={`/transactions?accountId=${acct.id}`} className="text-brand text-sm underline">
                  View transactions
                </Link>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-200">
                <div>
                  <p className="text-slate-400">Inflows</p>
                  <p className="font-semibold text-emerald-300">${fmt(s.inflow)}</p>
                </div>
                <div>
                  <p className="text-slate-400">Outflows</p>
                  <p className="font-semibold text-rose-300">${fmt(s.outflow)}</p>
                </div>
                <div>
                  <p className="text-slate-400">Net</p>
                  <p className="font-semibold text-white">${fmt(s.net)}</p>
                </div>
                <div>
                  <p className="text-slate-400">Transactions</p>
                  <p className="font-semibold text-white">{s.count}</p>
                </div>
              </div>
              <div className="mt-3 text-xs text-slate-400">
                Last transaction: {fmtDate(s.lastDate)}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
