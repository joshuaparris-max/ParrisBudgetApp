Data & Domain Specs (v0.1)
==========================

Budget periods
- Types: week, fortnight, month, year.
- Week start: Monday. Timezone: Australia/Melbourne.
- Fortnight: aligned to ISO week 1 Monday as epoch; setting stored as startDate override in Settings if changed.
- Period boundaries: computed via period engine using TZ; elapsed/total seconds used for pacing.

Rollover rules
- Per category per period.
- available = budget + carryIn
- variance = budget − spend
- carryOut = carryIn + variance
- Overspend reduces next period; underspend increases next period.
- Future: optional caps/resets not in v0.1.

Categorisation rules
- Match types: contains, startsWith, regex; case-insensitive normalization.
- Deterministic priority (lower number = higher priority). First match wins unless user manually overrides; manual overrides lock category.
- Seed rules from merchant list (Woolworths→Groceries, etc.).

CSV mapping (Bendigo)
- Expected columns: Date, Description, Debit, Credit (or Amount with sign), Balance optional, Account name optional.
- Direction: credit positive, debit negative.
- Amount: compute from debit/credit; currency AUD.
- Account: selected at upload.
- merchantKey: normalized description (trim, collapse spaces, uppercase).
- Uncategorised fallback category exists (0 budget).
- Sample file: sample_data/bendigo_sample.csv (synthetic).

PDF ingestion (best effort, scaffold)
- Store original PDFs.
- Parse with pdf-parse/pdfjs; extract candidates: date, descriptionRaw, amount, direction, optional balance.
- Confidence scoring: ≥0.85 high, 0.7–0.85 medium, <0.7 needs_review.
- All PDF-derived candidates require manual approval in MVP.
- Reconcile to existing transactions: match amount and date within ±2 days with fuzzy description; if matched, do not create new transaction.

Dedupe hashing
- SHA256 of tuple: (date ISO yyyy-mm-dd, amount cents signed, normalized description trimmed/uppercased/collapsed spaces, accountId, currency, direction, externalId if present).
- Used to prevent double-count on re-import; checksum stored on Import.

Alerts & freshness
- Stale data: if last successful import >7 days, show banner on dashboard.
- Overspend alert type reserved; pacing used for amber/red signals.

