# Josh & Kristy Budget Keeper

Next.js (App Router, TS) project for a two-user household budget app with CSV imports, rollover, pacing, and simple auth for Josh & Kristy.

## Quick start (WSL)
1) Install deps  
`npm install`

2) Start Postgres (via Docker once installed)  
`docker compose up -d db`

3) Migrate & seed  
`npm run prisma:migrate -- --name init`  
`npm run prisma:seed`

4) Dev server  
`npm run dev` then open http://localhost:3000

## Login
- Josh: `josh@example.com` / `password123`
- Kristy: `kristy@example.com` / `password123`

## Notes
- Env vars: see `.env.example`.
- Local file uploads land under `./storage`.
- CSV import supports Bendigo-like exports (date, description, debit/credit/amount). Deduping uses a stable hash of date+amount+description+account.

Original spec lives in: `Here you go — Vision - Stack plan - the full “docs we still need” list - Prompt 1 for Codex (VS Code in WSL) for your “Josh & Kristy Budget Keeper” web app.txt`
