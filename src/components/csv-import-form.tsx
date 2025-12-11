'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { importCsvAction } from '@/app/(protected)/import/actions';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

type Props = {
  accounts: { id: string; nickname: string }[];
};

type ImportState =
  | { results: { fileName: string; imported: number; total: number; checksum: string }[] }
  | { error: string }
  | null;

export function CsvImportForm({ accounts }: Props) {
  const [state, formAction] = useActionState<ImportState>(importCsvAction as any, null);

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4"
    >
      <div className="space-y-2">
        <Label htmlFor="file">CSV files</Label>
        <Input id="file" name="files" type="file" accept=".csv" multiple required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="accountId">Account (optional)</Label>
        <select
          id="accountId"
          name="accountId"
          className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 text-sm text-slate-100 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/50"
        >
          <option value="">Unspecified</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.nickname}
            </option>
          ))}
        </select>
      </div>

      <SubmitButton />

      {state && "error" in state && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {state.error}
        </div>
      )}
      {state && "results" in state && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          <p className="font-semibold">Imported {state.results.length} file(s):</p>
          <ul className="mt-2 space-y-1 text-xs">
            {state.results.map((r) => (
              <li key={r.checksum}>
                <span className="font-semibold">{r.fileName}</span> — {r.imported}/{r.total} (checksum{" "}
                {r.checksum.slice(0, 8)}…)
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Importing…' : 'Upload CSV'}
    </Button>
  );
}
