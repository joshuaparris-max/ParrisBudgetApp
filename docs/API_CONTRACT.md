# API Contract (MVP)

## Auth
- Session via NextAuth credentials (email/password). Sign-in page `/login`.
- Protected routes use middleware; unauthenticated users are redirected to `/login`.

## Imports
- `POST /import` (server action form): multipart with `file` (CSV) and optional `accountId`.
- On success: transactions inserted (deduped), import record stored, ledger recomputed, revalidate dashboard/transactions.
- Errors returned as `{ error: string }` via server action state.

## Data entities (subset)
- Household, Users, Accounts, Categories, Budgets/BudgetLines, Imports, Transactions, Rules, RolloverLedger.
- Transactions dedupe on `householdId + dedupeHash(date|amount|description|account|direction)`.
- Rules: first matching (ordered by `priority ASC`) wins.
- Ledger: per-week carryIn/carryOut per category (week starts Monday, AU time assumed).

## Responses
- All server actions return `{ success?: boolean; error?: string; ...payload }`.
- Pages are server-rendered; no public REST API is exposed beyond Next.js routes.
