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

  const imports = await prisma.import.findMany({
    where: { householdId },
    orderBy: { uploadedAt: "desc" },
    include: { account: true },
  });

  const totalImported = imports.reduce((sum, imp) => sum + (imp.processedTransactions || 0), 0);
  const totalRows = imports.reduce((sum, imp) => sum + (imp.totalTransactions || 0), 0);
  const totalSkipped = totalRows - totalImported;
  const lastImport = imports[0] ?? null;

  const perAccountSummary = imports.reduce<Record<string, { imported: number; last: Date | null }>>(
    (acc, imp) => {
      const id = imp.accountId ?? "unspecified";
      const existing = acc[id] ?? { imported: 0, last: null };
      existing.imported += imp.processedTransactions ?? 0;
      if (!existing.last || imp.uploadedAt > existing.last) existing.last = imp.uploadedAt;
      acc[id] = existing;
      return acc;
    },
    {},
  );

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
        <h3 className="text-lg font-semibold text-white">Summary</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 text-sm text-slate-200 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total imported</p>
            <p className="text-xl font-semibold text-emerald-300">{totalImported}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total skipped (deduped)</p>
            <p className="text-xl font-semibold text-amber-300">{totalSkipped}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Last import</p>
            <p className="text-sm">
              {lastImport
                ? `${lastImport.filename} (${lastImport.account?.nickname ?? "Unspecified"})`
                : "No imports yet"}
            </p>
            <p className="text-xs text-slate-400">
              {lastImport
                ? `${lastImport.uploadedAt.toLocaleDateString()} ${lastImport.uploadedAt.toLocaleTimeString()}`
                : ""}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-lg font-semibold text-white">Recent imports</h3>
        {imports.length === 0 && <p className="mt-3 text-sm text-slate-300">No imports yet.</p>}
        {imports.length > 0 && (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm text-slate-200">
              <thead className="text-xs uppercase tracking-[0.1em] text-slate-400">
                <tr className="border-b border-slate-800">
                  <th className="px-3 py-2 text-left">File</th>
                  <th className="px-3 py-2 text-left">Account</th>
                  <th className="px-3 py-2 text-left">Rows</th>
                  <th className="px-3 py-2 text-left">Imported</th>
                  <th className="px-3 py-2 text-left">Skipped</th>
                  <th className="px-3 py-2 text-left">Errors</th>
                  <th className="px-3 py-2 text-left">Uploaded at</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {imports.map((imp) => {
                  const skipped = (imp.totalTransactions ?? 0) - (imp.processedTransactions ?? 0);
                  return (
                    <tr key={imp.id} className="bg-slate-900/50">
                      <td className="px-3 py-2 font-semibold text-white">{imp.filename}</td>
                      <td className="px-3 py-2 text-slate-300">
                        {imp.account?.nickname ?? "Unspecified"}
                      </td>
                      <td className="px-3 py-2">{imp.totalTransactions}</td>
                      <td className="px-3 py-2 text-emerald-300">{imp.processedTransactions}</td>
                      <td className="px-3 py-2 text-amber-300">{skipped}</td>
                      <td className="px-3 py-2 text-rose-300">{imp.failedTransactions}</td>
                      <td className="px-3 py-2 text-slate-400">
                        {imp.uploadedAt.toLocaleDateString()} {imp.uploadedAt.toLocaleTimeString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {imports.length > 0 && (
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-white">Per-account imports</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm text-slate-200">
              <thead className="text-xs uppercase tracking-[0.1em] text-slate-400">
                <tr className="border-b border-slate-800">
                  <th className="px-3 py-2 text-left">Account</th>
                  <th className="px-3 py-2 text-left">Total imported</th>
                  <th className="px-3 py-2 text-left">Last import</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {Object.entries(perAccountSummary).map(([id, info]) => {
                  const account = accounts.find((a) => a.id === id) ?? { nickname: "Unspecified" };
                  return (
                    <tr key={id} className="bg-slate-900/50">
                      <td className="px-3 py-2 font-semibold text-white">{account.nickname}</td>
                      <td className="px-3 py-2 text-emerald-300">{info.imported}</td>
                      <td className="px-3 py-2 text-slate-400">
                        {info.last ? info.last.toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
