Runbook (v0.1)
==============

Stale imports banner always on
- Cause: no successful imports in >7 days.
- Action: upload latest CSV; confirm import status success; banner clears on success.

Import fails (CSV)
- Check import history status/errors.
- Verify CSV columns match Bendigo format; re-export if needed.
- If dedupe skipped rows, ensure file isn’t duplicate; adjust description if truly new and retry.

PDF unreadable
- Marked needs_review/low confidence.
- Action: fall back to CSV export; optionally manually enter missing transactions after parsing attempt.

Wrong categorisation
- Override transaction category in Transactions page; create/edit rule; reorder priority if conflict.

Rollover looks off
- Verify budget effectiveFrom and period alignment; check fortnight epoch setting in Settings.
- Recompute by reimporting sample or run diagnostic script (future).

DB migration issue
- Local: reset dev DB (docker-compose down -v; up; re-run migrate + seed).
- Prod: roll forward with fix; avoid destructive resets.

Access/login issues
- Dev: use dev-bypass; ensure NODE_ENV=development.
- Prod: check Supabase Auth settings; reset password via Supabase dashboard.

