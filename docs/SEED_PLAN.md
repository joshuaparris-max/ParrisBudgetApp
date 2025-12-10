Seed Plan (v0.1)
================

Purpose
- Provide a ready-to-use dev dataset: household, users, accounts, categories, budgets, rules, sample import.

Entities to seed
- Household: "Parris Family".
- Users: Josh (josh@example.com), Kristy (kristy@example.com); optional dev passwords or dev-bypass login.
- Accounts: Joint Card & Bills, Joint Savings, Buckland Rent Account, Rental Tax, Insurance Sinking, Sylvie Account, Elias Account.
- Categories: Income + Expenses per Prompt 2 list; include Uncategorised, Shopping (0), Charity/Op Shop (0), Home/Repairs (0), Postage (0) if used.
- Budget: Weekly budget lines per provided amounts; derived F/M/Y computed at runtime.
- Rules: Merchant patterns per list with priorities; pattern type = contains, case-insensitive.
- Sample import: sample_data/bendigo_sample.csv synthetic file mapped to one account; generates transactions for UI/demo.

Implementation steps
- Prisma seed script (ts) reading constants for categories, budget lines, rules, accounts.
- Ensure idempotent: upsert by unique keys (email, category name per household, account name).
- Create initial budget with effectiveFrom = current week start.
- Insert rules with priority ordering.
- Optional: insert a demo import and transactions from sample CSV for immediate dashboard view.

