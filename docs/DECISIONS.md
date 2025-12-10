Josh & Kristy Budget Keeper – Decisions (v0.1)
==============================================

Scope & Users
- Audience: two-user household (Josh, Kristy) in one household “Parris Family”.
- Goal: fast budget truth (Green/Amber/Red) with rollover and fresh imports; mobile-first (iPhone Safari, Android Chrome).
- Non-goals now: direct bank connections; investing/tax forecasting; guaranteed-perfect PDF parsing.

Platform & Stack
- Frontend: Next.js (App Router) + TypeScript; Tailwind + shadcn/ui.
- Backend: Next.js server actions + API routes.
- DB: Postgres (Supabase or Neon in prod, docker-compose locally).
- ORM: Prisma; validation: Zod.
- Auth: Supabase Auth with email/password; dev seed provides Josh/Kristy plus optional dev-only bypass login (NODE_ENV=development).
- File storage: local ./storage in dev; Supabase Storage in prod behind a storage service interface.
- Hosting: Vercel app + Supabase DB/storage/auth; Vercel Cron for scheduled jobs.

Data Model (initial)
- Users, Households, HouseholdMembers, Accounts, Imports, Transactions, Categories, Budgets, BudgetLines, RolloverLedger, Rules, Alerts.
- Keys of note: Transactions carry householdId/accountId/importId/externalId hash; Rules have priority and pattern; RolloverLedger tracks per category per period; Alerts cover stale_import/overspend.

Budget & Period Rules
- Period types: week, fortnight, month, year.
- Default start: Monday; timezone: Australia/Melbourne.
- Fortnight alignment: ISO week 1 Monday as epoch; setting stored as startDate override in Settings if changed.
- Available = budget + carryIn; variance = budget − spend; carryOut = carryIn + variance.
- Rollover applies per category; caps/resets are future work.
- Budgets editable with history (effectiveFrom next period); no overwriting past periods.

Rollover & Pacing Signals
- Budget result: remaining = available − spent; remaining ≥ 0 => Under (green), else Over (red).
- Pacing: expectedSpendToDate = available * elapsed/total; paceDelta = expected − spent; paceDelta ≥ 0 => On track (green), else Behind (amber unless already red).
- Apply both overall and per category.

Imports & Dedupe
- Support CSV Bendigo exports first; PDFs best-effort scaffold.
- Dedupe hash: SHA256 of (date ISO yyyy-mm-dd, amount in cents signed, normalised description trimmed/uppercased/collapsed spaces, account id, currency, direction, externalId if present).
- Import records store uploadedAt, filename, status, counts, checksum.
- Keep import history; re-import shouldn’t double-count.

CSV Mapping (Bendigo)
- Expected columns: Date, Description, Debit, Credit (or Amount with sign), Balance (optional), Account name (optional).
- Mapping: date→date, description raw kept; amount from debit/credit (credit positive, debit negative); direction inferred; balance ignored for ledger; account chosen at upload; currency AUD.
- Sample file path: sample_data/bendigo_sample.csv (synthetic).
- Map into Transactions with direction, merchantKey = normalised description token, category via rules, uncategorised fallback.

PDF Handling (scaffold)
- Store original PDFs; parse with pdf-parse/pdfjs as best effort.
- Confidence scoring bands: ≥0.85 high, 0.7–0.85 medium, <0.7 needs_review; all PDF-derived transactions require manual approval in MVP (no auto-create).
- Low-confidence/unreadable marked and surfaced in review; never double-count with CSV (reconcile window ±2 days with fuzzy description).

Categorisation Rules
- Table-backed rules: pattern contains/regex/startsWith, priority order, categoryId.
- Apply on import; allow manual override; offer “apply next time” learning.
- Seed initial merchant patterns (Woolworths→Groceries, Launtel→Internet, etc.; see prompt seed list).

Dashboard & UX
- Default view: weekly; tabs Week/Fortnight/Month/Year; derived values from weekly.
- Cards: overall status + per-category Budget, Spend, Available (carry).
- Show top merchants this period.
- Data freshness: days since last successful import; banner if >7 days.

Alerts & Nudges
- Stale import alert after 7 days (banner; email later).
- Overspend alert type reserved; pacing used for amber/red states.

Testing & Quality Bar
- Unit tests: rollover math, period boundaries (incl. fortnight alignment), pacing, rule priority/matching, dedupe hashing.
- Defensive parsing; strict typing; helpful errors; no hard-coded UI magic (data from DB).

Deployment & Dev Workflow
- Provide docker-compose for Postgres; Prisma schema + migrations.
- Seed script: household, users (Josh/Kristy), categories, budgets, rules, accounts, sample data.
- Local storage abstraction; README with WSL steps, env vars, migrate/seed commands.

Outstanding implementation status
- Current repo is base create-next-app; none of the above implemented yet (no DB, auth, storage, or feature pages).

