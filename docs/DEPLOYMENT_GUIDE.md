# Deployment Guide (dev/local focus)

## Prereqs
- Node 20+, npm
- Docker Desktop with WSL2 integration

## Setup
```
cp .env.example .env
npm install
docker compose up -d db
npx prisma migrate dev --name init
npm run prisma:seed
```

## Run
```
npm run dev
```
Visit http://localhost:3000

## Notes
- Storage is local (`./storage`). To swap to Supabase Storage, replace `saveUpload` implementation.
- Auth is credentials-only for dev. Rotate `NEXTAUTH_SECRET` in production.
- Ledger recompute runs on each import; run `recomputeLedgerHistory` (script/hook) if you change budgets historically.

## Deploy (outline)
- Provision Postgres (Supabase/Neon).
- Set env vars (`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `STORAGE_DIR` or S3/Supabase bucket).
- Run `prisma migrate deploy` then `prisma db seed` (or custom seed).
- Deploy Next.js app (Vercel or similar); ensure file uploads target your storage provider.
