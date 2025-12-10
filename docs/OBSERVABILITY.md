Observability Plan (v0.1)
=========================

Logging
- Use built-in Vercel/Supabase logs; structured logs from API routes with requestId and userId when available.
- Log import outcomes (counts, dedupe skips), rule changes, overrides, PDF review actions.

Metrics (lightweight)
- Counts: imports per day, stale-alert occurrences, transactions created, overrides applied.
- Errors: parse failures, auth failures.

Tracing
- Optional later: add OpenTelemetry for server actions/API routes.

Alerts
- Manual review: check logs for recurring parse failures or frequent stale alerts.
- Future: hook to email/webhook for chronic errors.

