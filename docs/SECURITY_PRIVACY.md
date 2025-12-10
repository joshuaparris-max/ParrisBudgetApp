Security & Privacy Plan (v0.1)
===============================

Auth & access control
- Supabase Auth email/password; sessions validated server-side.
- All queries scoped by householdId; single household seeded.
- Dev bypass login only when NODE_ENV=development.

Data protection
- No bank account numbers stored.
- Files stored under household-specific paths; prod uses Supabase Storage with signed URLs; dev uses local ./storage.
- Environment secrets via .env.local (not committed).

Encryption
- TLS in transit (Vercel/Supabase defaults).
- At rest: Supabase Storage and Postgres handle encryption at rest (per provider).

Least privilege
- Service keys stored server-side; client uses anon/public keys only.
- API routes enforce auth; uploads validated.

Audit & logging
- Import actions, rule changes, transaction overrides logged (see Audit Logging).
- Reconcile actions for PDF review recorded with userId and timestamp.

Backups & retention
- Rely on Supabase/Postgres backups; policy documented in Data Retention.

Privacy
- Private, two-user household app; no sharing; no third-party analytics initially.
- No direct bank connections; imports are manual.

Incident handling
- On suspected leak: rotate Supabase keys, invalidate sessions, review storage objects, restore from backup if needed.

