API Contract (internal, v0.1)
=============================

Auth (Supabase)
- Supabase Auth handles email/password; session available server-side; protected routes require session; dev bypass guarded by NODE_ENV=development.

Imports
- POST /api/imports/csv
  - Body: { accountId, file (CSV multipart) }
  - Behavior: store file, parse, dedupe, apply rules, create Transactions, create Import record with counts/status.
  - Responses: 200 { importId, counts } | 400 parse/validation errors | 409 duplicate checksum.
- GET /api/imports
  - Query: pagination.
  - Returns list with { id, filename, uploadedAt, status, counts } scoped to household.

Transactions
- GET /api/transactions
  - Query: categoryId?, dateRange?, search?, limit/offset.
  - Returns list with category, ruleSource/manual flag.
- PATCH /api/transactions/:id
  - Body: { categoryId } (manual override) | { note? }

Rules
- GET /api/rules
- POST /api/rules
  - Body: { pattern, matchType, categoryId, priority }
- PATCH /api/rules/:id
  - Body: same fields; priority updates reorder list.
- DELETE /api/rules/:id

Budgets
- GET /api/budgets/current
  - Returns active budget lines derived for current period.
- POST /api/budgets
  - Body: { periodType=week, lines: [{categoryId, amount}], effectiveFrom }
  - Behavior: creates new budget version effective from specified period start.

Dashboard
- GET /api/dashboard
  - Returns: overall totals (budget/spend/available/remaining, traffic light, pacing), per-category aggregates, top merchants, freshness (days since last import).

PDF (scaffold)
- POST /api/imports/pdf
  - Body: { accountId, file (PDF multipart) }
  - Behavior: store file, parse candidates, reconcile, mark all as needs_review; no auto-create transactions.
- GET /api/review
  - Returns candidate list with confidence, match status.
- POST /api/review/:id/actions
  - Body: { action: approve|merge|ignore|edit, targetTransactionId?, edits? }

Settings
- GET /api/settings
- PATCH /api/settings
  - Body: { fortnightEpochStartDate?, timezone?, weekStart? (locked), accounts? }

