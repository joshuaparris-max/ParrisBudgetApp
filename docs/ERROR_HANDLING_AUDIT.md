Error Handling & Audit Logging (v0.1)
=====================================

Error handling principles
- Validate inputs with Zod; return structured errors.
- User-friendly messages for import/categorisation failures; retain raw file for reprocessing.
- Graceful degradation: if PDF parse fails, mark as unreadable and prompt manual CSV.
- API responses use consistent shape: { error: { code, message, details? } }.

Audit logging
- Log entries for:
  - Imports: created, status changes, counts.
  - Rule changes: create/update/delete with userId.
  - Transaction overrides: old/new category, userId, timestamp.
  - PDF review actions: approve/merge/ignore/edit with details.
- Storage: Postgres tables (AuditLog, ReconcileActions) with timestamp, userId, action, entity, payload JSON.

Observability hooks
- Errors emitted to console/server logs; future integration with hosted logging (e.g., Logflare/Supabase Logs).

