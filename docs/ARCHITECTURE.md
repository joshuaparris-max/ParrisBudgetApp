Architecture (v0.1)
====================

Overview
- Frontend: Next.js App Router (TS), Tailwind + shadcn/ui.
- Backend: Next.js server actions + API routes for uploads/imports; Prisma ORM.
- DB: Postgres (Supabase/Neon in prod, docker-compose local).
- Auth: Supabase Auth email/password; dev bypass in development only.
- Storage: local ./storage in dev; Supabase Storage in prod via storage service wrapper.
- Jobs: Vercel Cron for stale-import checks.

Modules
- Auth: Supabase client/server helpers; route protection middleware; dev bypass guard.
- Period engine: boundary calculators for week/fortnight/month/year (TZ-aware).
- Rollover engine: computes carry ledger per category per period.
- Import pipeline (CSV first): upload → parse → dedupe → apply rules → store transactions → update import history.
- PDF pipeline (scaffold): upload → parse text → candidate rows → reconcile → review queue (manual approval).
- Categorisation rules: priority-ordered matcher; merchantKey normalizer; manual override lock.
- Dashboard aggregation: budgets + carry + spend + pacing; stale freshness check.

Data flow (CSV)
1) User uploads CSV with account selection.
2) File stored (local/Supabase).
3) Parser maps Bendigo columns → transactions (direction, amount, merchantKey).
4) Dedupe hash computed; skip existing matches.
5) Rules applied → category set; uncategorised fallback.
6) Transactions persisted; import record updated with counts/status; freshness updated.

Security & privacy highlights
- Auth via Supabase; per-household scoping on all queries.
- Files stored per-household path; no bank account numbers stored.
- Dev bypass limited to NODE_ENV=development.

Deployment topology
- Vercel for app; Supabase for DB/Auth/Storage; cron via Vercel Scheduled Functions.
- Local: docker-compose Postgres; env for Supabase keys; storage at ./storage.

