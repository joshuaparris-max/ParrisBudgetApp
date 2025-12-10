Data Retention & Export (v0.1)
==============================

Retention
- Raw imports (CSV/PDF): retain indefinitely by default; can prune after 12 months in future; document policy in Settings later.
- Transactions/Budgets/Rules: retained indefinitely.
- Audit logs: retain 12 months minimum (future pruning task).
- Backups: rely on Supabase backups; restore plan via Supabase dashboard.

Export my data
- Provide CSV export endpoint/page for transactions by date range, including: date, description, amount, direction, category, account, importId, rule source/manual flag.
- Allow export of budgets/rules snapshot as JSON (future).

Deletion
- No automated deletion in MVP; manual admin SQL if needed; future: household delete flow.

