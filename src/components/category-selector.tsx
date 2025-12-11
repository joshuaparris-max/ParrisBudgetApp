'use client';

import { Category } from '@prisma/client';
import { useActionState } from 'react';
import { Label } from './ui/label';

type Props = {
  transactionId: string;
  categories: Category[];
  currentCategoryId?: string;
  action: (
    prev: { error?: string; success?: boolean } | null,
    formData: FormData | null,
  ) => Promise<{ error?: string; success?: boolean } | null>;
};

export function CategorySelector({ transactionId, categories, currentCategoryId, action }: Props) {
  const [state, formAction] = useActionState(action, null);

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-center justify-end gap-2 sm:flex-nowrap"
    >
      <input type="hidden" name="transactionId" value={transactionId} />
      <Label className="sr-only" htmlFor={`category-${transactionId}`}>
        Category
      </Label>
      <select
        id={`category-${transactionId}`}
        name="categoryId"
        defaultValue={currentCategoryId ?? ''}
        className="w-32 shrink-0 rounded-lg border border-slate-700 bg-slate-900/70 px-2 py-1 text-xs text-slate-100"
      >
        <option value="">Uncategorised</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="shrink-0 rounded-lg bg-slate-800 px-2 py-1 text-xs font-semibold text-white hover:bg-slate-700"
      >
        Save
      </button>
      {state?.error && <span className="text-xs text-rose-300">{state.error}</span>}
      {state?.success && <span className="text-xs text-emerald-300">Saved</span>}
    </form>
  );
}
