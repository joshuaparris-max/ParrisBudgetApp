'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Category, RuleMatchType, TransactionDirection } from '@prisma/client';
import {
  bulkDeleteTransactionsAction,
  bulkUpdateTransactionCategoriesAction,
  createRuleAction,
  deleteTransactionAction,
  updateTransactionCategoryDirect,
} from './actions';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type TransactionRow = {
  id: string;
  date: string;
  description: string;
  amount: number;
  direction: TransactionDirection;
  categoryId: string | null;
};

type RulePrompt = {
  pattern: string;
  categoryId: string | null;
  openForm?: boolean;
};

type Props = {
  transactions: TransactionRow[];
  categories: Category[];
};

function RuleForm({
  defaultPattern,
  defaultCategoryId,
  onSuccess,
  onCancel,
  categories,
}: {
  defaultPattern: string;
  defaultCategoryId: string | null;
  onSuccess: () => void;
  onCancel: () => void;
  categories: Category[];
}) {
  const [pattern, setPattern] = useState(defaultPattern);
  const [categoryId, setCategoryId] = useState(defaultCategoryId ?? '');
  const [matchType, setMatchType] = useState<RuleMatchType>(RuleMatchType.CONTAINS);
  const [priority, setPriority] = useState<number | ''>('');
  const [submitting, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);

  return (
    <div className="mt-2 rounded-lg border border-slate-700 bg-slate-900/70 p-3 text-sm text-slate-100">
      <div className="font-semibold text-white">Create rule</div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <label className="space-y-1 text-xs uppercase tracking-[0.2em] text-slate-400">
          Pattern
          <input
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-white"
          />
        </label>
        <label className="space-y-1 text-xs uppercase tracking-[0.2em] text-slate-400">
          Category
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-white"
          >
            <option value="">Uncategorised</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs uppercase tracking-[0.2em] text-slate-400">
          Match type
          <select
            value={matchType}
            onChange={(e) => setMatchType(e.target.value as RuleMatchType)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-white"
          >
            <option value={RuleMatchType.CONTAINS}>Contains</option>
            <option value={RuleMatchType.STARTS_WITH}>Starts with</option>
            <option value={RuleMatchType.REGEX}>Regex</option>
          </select>
        </label>
        <label className="space-y-1 text-xs uppercase tracking-[0.2em] text-slate-400">
          Priority (optional)
          <input
            type="number"
            value={priority}
            onChange={(e) => setPriority(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-white"
          />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
        className="rounded-lg bg-brand px-3 py-1 text-xs font-semibold text-white hover:bg-brand-muted disabled:opacity-60"
        disabled={submitting}
        onClick={() => {
          setError(null);
          setDoneMsg(null);
          if (!pattern.trim()) {
            setError('Pattern is required');
            return;
          }
          const chosenCategory = categoryId || defaultCategoryId;
          if (!chosenCategory) {
            setError('Choose a category');
            return;
          }
          startTransition(async () => {
            const res = await createRuleAction({
              pattern,
              categoryId: chosenCategory,
              matchType,
              priority: priority === '' ? undefined : Number(priority),
            });
            if (res?.error) {
              setError(res.error);
              return;
              }
              setDoneMsg(res?.duplicate ? 'Rule already exists' : 'Rule created');
              onSuccess();
            });
          }}
        >
          {submitting ? 'Saving…' : 'Save rule'}
        </button>
        <button
          className="rounded-lg bg-slate-800 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-700"
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        {error && <span className="text-xs text-rose-300">{error}</span>}
        {doneMsg && <span className="text-xs text-emerald-300">{doneMsg}</span>}
      </div>
    </div>
  );
}

export function TransactionsTable({ transactions, categories }: Props) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [prompts, setPrompts] = useState<Record<string, RulePrompt>>({});
  const [bulkRulePrompt, setBulkRulePrompt] = useState<RulePrompt | null>(null);
  const [bulkCategoryId, setBulkCategoryId] = useState<string>('');
  const [wantRuleAfterBulk, setWantRuleAfterBulk] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [, startRowTransition] = useTransition();
  const [bulkPending, startBulkTransition] = useTransition();

  const allSelected = selectedIds.length === transactions.length && transactions.length > 0;

  const toggleSelectAll = () => {
    setSelectionError(null);
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(transactions.map((t) => t.id));
    }
  };

  const toggleSelected = (id: string) => {
    setSelectionError(null);
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSingleSave = (txn: TransactionRow, newCategoryId: string | null) => {
    setSelectionError(null);
    setSavingId(txn.id);
    startRowTransition(async () => {
      try {
        const res = await updateTransactionCategoryDirect({
          transactionId: txn.id,
          categoryId: newCategoryId,
        });
        if (res?.error) return;
        router.refresh();
        if (res?.previousCategoryId !== res?.newCategoryId) {
          setPrompts((prev) => ({
            ...prev,
            [txn.id]: {
              pattern: res?.description ?? txn.description,
              categoryId: newCategoryId,
            },
          }));
        }
      } finally {
        setSavingId(null);
      }
    });
  };

  const handleDelete = (txn: TransactionRow) => {
    const confirmMsg = `Delete this transaction?\n${txn.description} (${formatAmount(txn)})`;
    if (!window.confirm(confirmMsg)) return;
    setSelectionError(null);
    setDeletingId(txn.id);
    startRowTransition(async () => {
      try {
        const res = await deleteTransactionAction({ transactionId: txn.id });
        if (res?.error) {
          setSelectionError(res.error);
          return;
        }
        setSelectedIds((prev) => prev.filter((id) => id !== txn.id));
        setPrompts((prev) => {
          const next = { ...prev };
          delete next[txn.id];
          return next;
        });
        router.refresh();
      } finally {
        setDeletingId(null);
      }
    });
  };

  const handleBulkApply = () => {
    if (!bulkCategoryId) {
      setSelectionError('Choose a category first');
      return;
    }
    setSelectionError(null);
    startBulkTransition(async () => {
      const res = await bulkUpdateTransactionCategoriesAction({
        transactionIds: selectedIds,
        categoryId: bulkCategoryId || null,
      });
      if (res?.error) {
        setSelectionError(res.error);
        return;
      }
      router.refresh();
      setSelectedIds([]);
      if (wantRuleAfterBulk && selectedIds.length > 0) {
        const representative = transactions.find((t) => t.id === selectedIds[0]);
        setBulkRulePrompt({
          pattern: representative?.description ?? '',
          categoryId: bulkCategoryId,
          openForm: true,
        });
      } else {
        setBulkRulePrompt(null);
      }
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    const confirmMsg =
      selectedIds.length === 1
        ? 'Delete this transaction?'
        : `Delete ${selectedIds.length} transactions?`;
    if (!window.confirm(confirmMsg)) return;
    setSelectionError(null);
    setBulkDeleting(true);
    startBulkTransition(async () => {
      try {
        const res = await bulkDeleteTransactionsAction({ transactionIds: selectedIds });
        if (res?.error) {
          setSelectionError(res.error);
          return;
        }
        setSelectedIds([]);
        setBulkRulePrompt(null);
        setBulkCategoryId('');
        router.refresh();
      } finally {
        setBulkDeleting(false);
      }
    });
  };

  const formatAmount = (txn: TransactionRow) => {
    const prefix = txn.direction === 'CREDIT' ? '+' : '-';
    return `${prefix}${txn.amount.toFixed(2)}`;
  };

  const getCategoryName = (id: string | null) =>
    id ? categories.find((c) => c.id === id)?.name ?? 'Uncategorised' : 'Uncategorised';

  return (
    <Card className="overflow-hidden">
      <div className="bg-slate-900/50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <div className="grid grid-cols-[40px_110px_1fr_170px_120px_130px_110px] items-center gap-2">
          <input
            type="checkbox"
            aria-label="Select all"
            checked={allSelected}
            onChange={toggleSelectAll}
            className="h-4 w-4 rounded border-slate-600 bg-slate-800"
          />
          <span>Date</span>
          <span>Description</span>
          <span>Category</span>
          <span className="text-right">Amount</span>
          <span className="text-right">Status</span>
          <span className="text-right">Actions</span>
        </div>
      </div>

      {selectionError && selectedIds.length === 0 && (
        <div className="border-b border-slate-800 bg-rose-950/40 px-4 py-2 text-xs text-rose-100">
          {selectionError}
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="border-b border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-100">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-300">{selectedIds.length} selected</span>
            <select
              value={bulkCategoryId}
              onChange={(e) => setBulkCategoryId(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-white"
            >
              <option value="">Choose category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={wantRuleAfterBulk}
                onChange={(e) => setWantRuleAfterBulk(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800"
              />
              Also create rule
            </label>
            <button
              className="rounded-lg bg-brand px-3 py-1 text-xs font-semibold text-white hover:bg-brand-muted disabled:opacity-60"
              disabled={bulkPending}
              onClick={handleBulkApply}
              type="button"
            >
              {bulkPending ? 'Applying…' : 'Apply category'}
            </button>
            <button
              className="rounded-lg bg-rose-700 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-600 disabled:opacity-60"
              disabled={bulkPending || bulkDeleting}
              onClick={handleBulkDelete}
              type="button"
            >
              {bulkDeleting ? 'Deleting…' : 'Delete selected'}
            </button>
            <button
              className="rounded-lg bg-slate-800 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-700"
              onClick={() => {
                setSelectionError(null);
                setSelectedIds([]);
              }}
              type="button"
            >
              Clear selection
            </button>
            {selectionError && <span className="text-xs text-rose-300">{selectionError}</span>}
          </div>
          {bulkRulePrompt?.openForm && (
            <RuleForm
              defaultPattern={bulkRulePrompt.pattern}
              defaultCategoryId={bulkRulePrompt.categoryId}
              categories={categories}
              onSuccess={() => setBulkRulePrompt(null)}
              onCancel={() => setBulkRulePrompt(null)}
            />
          )}
        </div>
      )}

      <div className="divide-y divide-slate-800">
        {transactions.length === 0 && (
          <div className="px-4 py-3 text-sm text-slate-300">No transactions yet.</div>
        )}
        {transactions.map((txn) => {
          const prompt = prompts[txn.id];
          return (
            <div key={txn.id} className="px-4 py-2">
              <div className="grid grid-cols-[40px_110px_1fr_170px_120px_130px_110px] items-center gap-2 text-sm text-slate-100">
                <input
                  type="checkbox"
                  aria-label="Select transaction"
                  checked={selectedIds.includes(txn.id)}
                  onChange={() => toggleSelected(txn.id)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-800"
                />
                <span className="text-slate-300">
                  {new Date(txn.date).toLocaleDateString()}
                </span>
                <span className="truncate" title={txn.description}>
                  {txn.description}
                </span>
                <select
                  value={txn.categoryId ?? ''}
                  disabled={savingId === txn.id}
                  onChange={(e) =>
                    handleSingleSave(txn, e.target.value === '' ? null : e.target.value)
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-2 py-1 text-xs text-slate-100"
                >
                  <option value="">Uncategorised</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <span className={cn('text-right tabular-nums', txn.direction === 'CREDIT' ? 'text-emerald-300' : 'text-rose-300')}>
                  {formatAmount(txn)}
                </span>
                <div className="text-right text-xs text-slate-300">
                  {savingId === txn.id ? 'Saving…' : getCategoryName(txn.categoryId)}
                </div>
                <div className="flex justify-end">
                  <button
                    className="rounded-lg bg-rose-700 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-600 disabled:opacity-60"
                    onClick={() => handleDelete(txn)}
                    disabled={deletingId === txn.id}
                    type="button"
                  >
                    {deletingId === txn.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
              {prompt && (
                <div className="mt-2 rounded-lg border border-slate-700 bg-slate-900/70 p-3 text-sm text-slate-100">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-white">
                        Apply this change to similar transactions?
                      </div>
                      <div className="text-xs text-slate-300">
                        We can create a rule using “{prompt.pattern.slice(0, 60)}…”.
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="rounded-lg bg-brand px-3 py-1 text-xs font-semibold text-white hover:bg-brand-muted"
                        onClick={() =>
                          setPrompts((prev) => ({
                            ...prev,
                            [txn.id]: { ...prompt, openForm: true },
                          }))
                        }
                      >
                        Create rule
                      </button>
                      <button
                        className="rounded-lg bg-slate-800 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-700"
                        onClick={() => {
                          setPrompts((prev) => {
                            const next = { ...prev };
                            delete next[txn.id];
                            return next;
                          });
                        }}
                      >
                        No thanks
                      </button>
                    </div>
                  </div>
                  {prompt.openForm && (
                    <RuleForm
                      defaultPattern={prompt.pattern}
                      defaultCategoryId={prompt.categoryId}
                      categories={categories}
                      onSuccess={() =>
                        setPrompts((prev) => {
                          const next = { ...prev };
                          delete next[txn.id];
                          return next;
                        })
                      }
                      onCancel={() =>
                        setPrompts((prev) => ({
                          ...prev,
                          [txn.id]: { ...prompt, openForm: false },
                        }))
                      }
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
