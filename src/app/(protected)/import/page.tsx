import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getHouseholdIdForUser } from "@/lib/households";
import { prisma } from "@/lib/prisma";
import { CsvImportForm } from "@/components/csv-import-form";
import { Card } from "@/components/ui/card";
import { Upload } from "lucide-react";

export default async function ImportPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const householdId = await getHouseholdIdForUser(session.user.id);
  if (!householdId) redirect("/settings");

  const accounts = await prisma.account.findMany({
    where: { householdId },
    orderBy: { nickname: "asc" },
    select: { id: true, nickname: true },
  });

  const recentImports = await prisma.import.findMany({
    where: { householdId },
    orderBy: { uploadedAt: "desc" },
    take: 5,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-brand/10 p-3 text-brand">
          <Upload className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Imports</p>
          <h2 className="text-2xl font-semibold text-white">Upload CSV</h2>
          <p className="text-sm text-slate-300">
            Add Bendigo Bank exports. We dedupe and apply rules automatically.
          </p>
        </div>
      </div>

      <CsvImportForm accounts={accounts} />

      <Card className="p-4">
        <h3 className="text-lg font-semibold text-white">Recent imports</h3>
        <div className="mt-3 space-y-2 text-sm text-slate-300">
          {recentImports.length === 0 && <p>No imports yet.</p>}
          {recentImports.map((imp) => (
            <div
              key={imp.id}
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2"
            >
              <div>
                <p className="font-semibold text-white">{imp.filename}</p>
                <p className="text-xs text-slate-400">
                  {imp.status} • {imp.totalTransactions} rows
                </p>
              </div>
              <p className="text-xs text-slate-400">
                {imp.uploadedAt.toLocaleDateString()} {imp.uploadedAt.toLocaleTimeString()}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
