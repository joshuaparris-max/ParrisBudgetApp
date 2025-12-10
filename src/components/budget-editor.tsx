'use client';

import { useActionState } from 'react';
import { Budget, BudgetLine, Category } from '@prisma/client';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { updateBudgetLineAction } from '@/app/(protected)/budget/actions';
import { useTransition, useState } from 'react';
import { Badge } from './ui/badge';

type BudgetWithLines = Budget & {
  lines: (BudgetLine & { category: Category })[];
};

export function BudgetEditor({ budget }: { budget: BudgetWithLines }) {
  const [state, formAction] = useActionState(updateBudgetLineAction, null);
  const [pendingMap, setPendingMap] = useState<Record<string, boolean>>({});
  const [formValues, setFormValues] = useState<Record<string, string>>(
    Object.fromEntries(budget.lines.map((line) => [line.id, Number(line.amount).toFixed(2)])),
  );
  const [isPending, startTransition] = useTransition();

  const handleChange = (id: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (lineId: string) => {
    setPendingMap((m) => ({ ...m, [lineId]: true }));
    startTransition(() => {
      const fd = new FormData();
      fd.set('lineId', lineId);
      fd.set('amount', formValues[lineId] ?? '0');
      formAction(fd);
    });
  };

  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-4 gap-2 bg-slate-900/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <span>Category</span>
        <span className="text-right">Amount (weekly)</span>
        <span className="text-right">Type</span>
        <span className="text-right">Save</span>
      </div>
      <div className="divide-y divide-slate-800">
        {budget.lines.map((line) => (
          <div key={line.id} className="grid grid-cols-4 gap-2 px-4 py-2 text-sm text-slate-100">
            <span>{line.category.name}</span>
            <div className="text-right">
              <Label className="sr-only" htmlFor={`amount-${line.id}`}>
                Amount
              </Label>
              <Input
                id={`amount-${line.id}`}
                type="number"
                step="0.01"
                value={formValues[line.id] ?? ''}
                onChange={(e) => handleChange(line.id, e.target.value)}
                className="text-right"
              />
            </div>
            <span className="text-right text-slate-400">{line.category.type}</span>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => handleSubmit(line.id)}
              >
                {pendingMap[line.id] ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 py-3">
        {state?.error && (
          <Badge intent="danger" className="uppercase">
            {state.error}
          </Badge>
        )}
        {state?.success && (
          <Badge intent="success" className="uppercase">
            Saved
          </Badge>
        )}
      </div>
    </Card>
  );
}
