# Testing Plan

## Automated
- Unit: rollover math (`src/lib/rollover.test.ts`), period bounds (`src/lib/periods.test.ts`), dedupe hash (`src/lib/dedupe.test.ts`), CSV parsing (`src/lib/csv.test.ts`), rule selection (`src/lib/rules.test.ts`).
- Run: `npm test` (vitest).

## Manual checks
- Auth/login/logout flows.
- Import CSV (headerless and headered); verify dashboard totals update; dedupe prevents duplicates.
- Recategorise a transaction; dashboard updates.
- Add/edit rules; re-import applies new mapping.
- Edit budgets; dashboard reflects changes.

## Future
- Add integration tests for import pipeline and ledger recompute.
- E2E (Playwright) for critical flows: login, import, dashboard, recategorise, edit budgets.
