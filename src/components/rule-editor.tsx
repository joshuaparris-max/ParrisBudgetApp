'use client';

import { useActionState } from 'react';
import { Rule, Category, RuleMatchType } from '@prisma/client';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { upsertRuleAction, deleteRuleAction } from '@/app/(protected)/rules/actions';

export function RuleEditor({
  rules,
  categories,
}: {
  rules: (Rule & { category: Category | null })[];
  categories: Category[];
}) {
  const [state, formAction] = useActionState(upsertRuleAction, null);

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-4">
        <h3 className="text-lg font-semibold text-white">Add / Update Rule</h3>
        <form action={formAction} className="grid grid-cols-5 gap-3 items-end">
          <div className="col-span-2 space-y-1">
            <Label htmlFor="pattern">Pattern</Label>
            <Input id="pattern" name="pattern" placeholder="e.g. Woolworths" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="matchType">Match type</Label>
            <select
              id="matchType"
              name="matchType"
              className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 text-sm text-slate-100"
            >
              <option value={RuleMatchType.CONTAINS}>Contains</option>
              <option value={RuleMatchType.STARTS_WITH}>Starts with</option>
              <option value={RuleMatchType.REGEX}>Regex</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="categoryId">Category</Label>
            <select
              id="categoryId"
              name="categoryId"
              className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 text-sm text-slate-100"
              required
            >
              <option value="">Select</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="priority">Priority</Label>
            <Input id="priority" name="priority" type="number" step="1" defaultValue="0" />
          </div>
          <div className="flex justify-end">
            <Button type="submit">Save rule</Button>
          </div>
        </form>
        {state?.error && <p className="text-sm text-rose-300">{state.error}</p>}
        {state?.success && <p className="text-sm text-emerald-300">Saved</p>}
      </Card>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-5 gap-2 bg-slate-900/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <span>Pattern</span>
          <span>Match</span>
          <span>Category</span>
          <span className="text-right">Priority</span>
          <span className="text-right">Actions</span>
        </div>
        <div className="divide-y divide-slate-800">
          {rules.length === 0 && (
            <div className="px-4 py-3 text-sm text-slate-300">No rules yet.</div>
          )}
          {rules.map((rule) => (
            <div key={rule.id} className="grid grid-cols-5 gap-2 px-4 py-2 text-sm text-slate-100">
              <span>{rule.pattern}</span>
              <span className="text-slate-300">{rule.matchType}</span>
              <span className="text-slate-300">{rule.category?.name ?? '—'}</span>
              <span className="text-right">{rule.priority}</span>
              <div className="flex justify-end">
                <form action={deleteRuleAction}>
                  <input type="hidden" name="ruleId" value={rule.id} />
                  <Button type="submit" variant="ghost" className="text-rose-300 hover:text-rose-200">
                    Delete
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
