import { redirect } from "next/navigation";
import { BarChart3, Clock3, Info, Leaf, TrendingUp } from "lucide-react";
import { auth } from "@/lib/auth";
import { getHouseholdIdForUser } from "@/lib/households";
import { getDashboardData } from "@/lib/dashboard";
import { PeriodType } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PeriodTabs } from "@/components/period-tabs";

function statusColor(status: "green" | "amber" | "red") {
  if (status === "green") return "text-emerald-400";
  if (status === "amber") return "text-amber-400";
  return "text-rose-400";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ period?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const householdId = await getHouseholdIdForUser(session.user.id);
  if (!householdId) redirect("/settings");

  const params = searchParams ? await searchParams : {};
  const periodParam =
    typeof params?.period === "string" ? params?.period : undefined;
  const requested = periodParam?.toUpperCase() as PeriodType | undefined;
  const period = Object.values(PeriodType).includes(requested ?? PeriodType.WEEK)
    ? (requested as PeriodType)
    : PeriodType.WEEK;
  const periodLabel = typeof period === "string" ? period.toLowerCase() : "week";
  const fmt0 = (value: number | null | undefined) => {
    const n = Number(value ?? 0);
    return Number.isFinite(n) ? n.toFixed(0) : "0";
  };

  const data = await getDashboardData(householdId, period);
  if (!data) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Dashboard</h2>
        <Card className="p-6">
          <p className="text-slate-200">No budget found. Create one in Budget.</p>
          <Link href="/budget" className="text-brand underline">
            Go to budget
          </Link>
        </Card>
      </div>
    );
  }

  const { summary } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">At a glance</p>
          <h2 className="text-2xl font-semibold text-white">This {periodLabel}</h2>
        </div>
        <PeriodTabs active={period} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-4">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <BarChart3 className="h-4 w-4" />
          Budget vs spend
        </div>
        <div className="mt-3 text-3xl font-semibold text-white">
          ${(fmt0(summary.totals.available - summary.totals.spend))}
        </div>
        <p className="text-sm text-slate-300">
          Available {fmt0(summary.totals.available)} • Spent {fmt0(summary.totals.spend)}
        </p>
          <Badge intent={summary.totals.status === "green" ? "success" : "danger"} className="mt-3">
            {summary.totals.status === "green" ? "Under budget" : "Over budget"}
          </Badge>
        </Card>

        <Card className="p-4">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <TrendingUp className="h-4 w-4" />
          Pacing
        </div>
        <div className="mt-3 text-3xl font-semibold text-white">
          {summary.totals.paceDelta >= 0 ? "+" : "-"}
          {fmt0(Math.abs(summary.totals.paceDelta))}
        </div>
          <p className="text-sm text-slate-300">
            Expected vs actual so far
          </p>
          <Badge
            intent={
              summary.totals.pacing === "green"
                ? "success"
                : summary.totals.pacing === "amber"
                  ? "warning"
                  : "danger"
            }
            className="mt-3"
          >
            {summary.totals.pacing === "green"
              ? "On track"
              : summary.totals.pacing === "amber"
                ? "Behind"
                : "Over"}
          </Badge>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Clock3 className="h-4 w-4" />
            Data freshness
          </div>
          <div className="mt-3 text-3xl font-semibold text-white">
            {summary.freshnessDays === null ? "—" : `${summary.freshnessDays}d`}
          </div>
          <p className="text-sm text-slate-300">
            {summary.freshnessDays !== null && summary.freshnessDays > 7
              ? "Uploads older than a week"
              : "Recent uploads"}
          </p>
        </Card>
      </div>

      {summary.freshnessDays !== null && summary.freshnessDays > 7 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-200">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            Uploads are older than a week - import recent transactions.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {summary.categories.map((cat) => (
          <Card key={cat.id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">{cat.name}</p>
                <p className="text-xl font-semibold text-white">
                  ${fmt0(cat.available - cat.spend)} left
                </p>
              </div>
              <Badge
                intent={
                  cat.status === "green" ? "success" : cat.status === "amber" ? "warning" : "danger"
                }
              >
                {cat.status === "green"
                  ? "On track"
                  : cat.status === "amber"
                    ? "Tight"
                    : "Over"}
              </Badge>
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm text-slate-300">
              <Leaf className="h-4 w-4 text-emerald-400" />
              Budget {fmt0(cat.budget)} • Carry {fmt0(cat.carryIn)} • Spend {fmt0(cat.spend)}
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-slate-800">
              <div
                className="h-2 rounded-full bg-brand transition-all"
                style={{
                  width: `${Math.min(100, (cat.spend / Math.max(1, cat.available)) * 100)}%`,
                }}
              />
            </div>
          <div className="mt-3 text-sm">
            <Link
              href={{ pathname: "/transactions", query: { category: cat.id } }}
              className="text-brand underline"
            >
              View transactions
            </Link>
          </div>
        </Card>
      ))}
      </div>
    </div>
  );
}
