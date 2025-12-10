# Runbook (MVP)

## Imports fail / parse errors
- Check import status in DB `Import.status`.
- If error is "Missing date column"/"Invalid Record Length", verify CSV format; headerless 3-col is supported (Date, Amount, Description).
- Re-run upload; dedupe prevents duplicates.

## Dashboard shows NaN/zero
- Ensure budgets exist; reseed (`npm run prisma:seed`) or add budgets manually.
- Check transactions exist for current period; ensure timezone/week start Monday.
- If carry looks wrong, run ledger recompute: call `recomputeLedgerHistory(householdId)` from a one-off script.

## Recategorisation
- Use `/transactions` dropdown to change categories; dashboard will revalidate.
- Update rules in `/rules`; re-import to apply automatically.

## Database maintenance
- `docker compose logs db` for Postgres issues.
- `prisma studio` for quick inspection.

## Credentials
- Dev users: josh@example.com / kristy@example.com (password `password123`). Change in production.
