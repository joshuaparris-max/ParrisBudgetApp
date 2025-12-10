Josh & Kristy Budget Keeper – PRD (v0.1)
========================================

Overview
- Audience: Josh (detail-oriented) and Kristy (glanceable) sharing one household (“Parris Family”).
- Goal: Fast truth on budget status with rollover and fresh imports; mobile-first.
- Scope: CSV imports first; PDFs best-effort with manual review; no direct bank connections.

Success metrics (MVP)
- Usage: Weekly checks ≥3 times.
- Freshness: No stale-data warning most weeks (<7 days since last import).
- Clarity: Traffic-light budget state obvious; fewer “where did it go?” moments.

Personas & needs
- Kristy: “Are we okay?” quick glance, traffic-light, minimal taps, stale warning.
- Josh: Accuracy, rule control, history, pacing, ability to adjust budgets and categories.

User stories (acceptance in bullets)
- Auth
  - As Josh/Kristy, I can log in with email/password and stay within one household. (Auth success, protected pages redirect when not logged in.)
- Imports
  - As a user, I can upload a Bendigo CSV and see an import history entry with counts/status. (Shows uploadedAt, filename, status, counts; rejects duplicates by hash; dedupe prevents double-count.)
  - As a user, I see days since last successful import; if >7 days, a banner tells me to upload. (Banner threshold 7d.)
- Categorisation
  - As a user, transactions auto-categorise via merchant rules; I can override manually. (Rule priority deterministic; overrides persist.)
- Budgeting & rollover
  - As a user, I set weekly budgets per category (other periods derived) and edit going forward (history preserved). (EffectiveFrom next period; past unaffected.)
  - As a user, I see available = budget + carryIn; overspend reduces next period, underspend increases it. (Carry displayed per category.)
- Dashboard
  - As Kristy, on mobile, I see overall status card with under/over amount and traffic light. (Green if remaining ≥0; red if <0; pacing shows on-track/behind.)
  - As a user, I see per-category cards with Budget, Spend, Available (with carry) and pacing status. (Tabs: Week/Fortnight/Month/Year.)
  - As a user, I see top merchants this period. (List of top ~5 by spend.)
- Rules
  - As a user, I can view and edit merchant→category rules with priority. (Create/edit/delete; priority ordering respected.)

Functional requirements
- Period engine: Week/Fortnight/Month/Year boundaries; Monday start; Australia/Melbourne; fortnight epoch = ISO week 1 Monday (override via Settings).
- Rollover: carryOut = carryIn + (budget − spend); stored per category per period.
- Pacing: expectedSpendToDate = available * elapsed/total; paceDelta = expected − spent.
- Dedupe: SHA256(date ISO, amount cents signed, normalized description, account, currency, direction, externalId?).
- CSV mapping: date, description, debit/credit→amount+direction; currency AUD; account chosen at upload; merchantKey normalized.
- PDF: Stored; parsed best-effort; candidates require manual approval; reconcile to CSV within ±2 days using fuzzy description.

Non-functional
- Mobile-first layouts (iPhone Safari baseline); fast first load on Vercel.
- Clear errors on import/categorisation; defensive parsing; strict typing.
- Privacy: no external bank links; files stored in Supabase Storage (prod), local ./storage (dev).

Information architecture (MVP)
- /login
- /dashboard (default Week; tabs W/F/M/Y; overall card; per-category cards; top merchants; stale banner)
- /import (upload CSV/PDF, import history)
- /transactions (list, filter, search, bulk categorise)
- /budget (weekly primary entry, derived displays, history/effective dates)
- /rules (merchant rules with priority)
- /settings (period start override, timezone confirm, fortnight epoch override, accounts)

Wireframe notes (mobile-first, text)
- Dashboard: hero card with status + remaining; stale banner if >7d; tabs W/F/M/Y; per-category cards with Budget/Spend/Available, traffic light + pace badge; top merchants list.
- Import: upload widget (CSV/PDF), recent imports list with status and counts.
- Transactions: search/filter chips (category, date range), list rows with description/date/amount/category pill, inline edit.
- Budget: weekly entry form by category; shows derived fortnight/month/year; effective-from selector defaulting next period.
- Rules: list with priority numbers; add/edit modal (pattern, match type, category, priority).

