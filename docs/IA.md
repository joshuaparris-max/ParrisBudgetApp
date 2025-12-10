Information Architecture (v0.1)
===============================

Navigation (mobile-first tabs/links)
- /login – email/password (Supabase Auth); dev bypass in dev.
- /dashboard – default Week; tabs Week/Fortnight/Month/Year; overall status, stale banner, per-category cards, top merchants.
- /import – upload CSV/PDF, show import history (filename, status, counts, uploadedAt).
- /transactions – filter/search, list, bulk categorise, per-row override.
- /budget – weekly primary entry; derived F/M/Y; effective-from selector; history view.
- /rules – merchant→category rules with priority list + editor.
- /settings – period start (Monday default), timezone (Australia/Melbourne), fortnight epoch override (startDate), account nicknames, storage info.

Content modules (key data shown)
- Dashboard: status card (remaining, traffic light), pace badge, stale banner (>7d), per-category cards (Budget/Spend/Available/carry/pacing), top merchants list.
- Import: upload form (account select, type CSV/PDF), mapping hint (Bendigo), best-effort PDF note, table of imports with status/counts/errors.
- Transactions: filters (category, date range, amount sign), search box, list rows (date, description, amount, category pill, rule source/manual), bulk select + apply category.
- Budget: table of categories with weekly amount input, derived F/M/Y display, effective-from date selector (next period default), change history.
- Rules: list with priority numbers; add/edit modal (pattern, match type, category, priority); conflict hint.
- Settings: timezone, week start (locked to Monday for now), fortnight epoch date, account nicknames, storage location (local vs Supabase).

