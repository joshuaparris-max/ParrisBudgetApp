Josh & Kristy Budget Keeper – Testing Plan (v0.1)
=================================================

Scope
- Unit-heavy coverage for core math, parsing, and rule logic; light integration for imports and API routes; minimal happy-path e2e for auth + dashboard view.

Unit tests (primary)
- Period engine: week/fortnight/month/year boundaries; Monday start; ISO-week-1 fortnight epoch; timezone Australia/Melbourne.
- Rollover math: available = budget + carryIn; variance = budget − spend; carryOut = carryIn + variance; per-category ledger entries.
- Pacing: expectedSpendToDate = available * elapsed/total; paceDelta; status mapping (green/amber/red).
- Dedupe hashing: stable SHA256 input; case/whitespace normalization; direction and account/currency included; prevents double-count on re-import.
- Rule matching: priority ordering, pattern types (contains/startsWith/regex), deterministic selection, manual override locking.
- CSV parser: Bendigo mapping (debit/credit to signed amount), date parsing, direction inference, merchantKey normalization, uncategorised fallback.
- PDF candidate parsing (scaffold): confidence banding thresholds; low-confidence classification; reconcile window ±2 days; no auto-create without approval.
- Seed data validation: categories/budgets/rules align; effectiveFrom handling.

Integration tests
- Import flow (CSV): upload -> parse -> store transactions -> dedupe prevents duplicates -> rules applied -> import history reflects counts/status.
- Dashboard aggregation: budgets + carryIn produce available; spends reflect transactions; stale banner when last import >7d.
- Auth flow (Supabase) in local dev: login, protected route guard, dev bypass only in development.

E2E (minimal happy path)
- Login, upload CSV, see dashboard update (overall status + per-category cards).

Tooling & runners
- Test runner: vitest (or jest) with ts-node/ts-jest; use tsconfig paths.
- DB: test database via Prisma with shadow DB; migrations applied before suite; transactional tests where possible.
- Coverage: target core logic files; ensure rollover/period/parse modules hit.

Data fixtures
- sample_data/bendigo_sample.csv synthetic file for repeatable parsing tests.
- In-memory or test DB seeds for categories/budgets/rules/accounts/users.

CI gating
- Run unit + integration suites on push/PR; fail on lint/test errors.
- Optional: preview deployment smoke (build + simple health check).

