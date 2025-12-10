Deployment Guide (v0.1)
=======================

Local (WSL)
- Requirements: Node 18+, pnpm|npm, Docker.
- Steps:
  1) cp .env.example .env.local and fill Supabase keys or local DB DSN.
  2) docker-compose up -d (Postgres).
  3) pnpm install
  4) pnpm prisma migrate deploy
  5) pnpm prisma db seed
  6) pnpm dev

Prod (Vercel + Supabase)
- Create Supabase project; enable Auth, Storage, Postgres.
- Set env vars in Vercel: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (server), SUPABASE_ANON_KEY (client), DATABASE_URL (pooled), STORAGE_BUCKET.
- Disable dev-bypass in prod (NODE_ENV=production).
- Vercel deploy: connect repo; set build command (pnpm build) and install command.
- Run Prisma migrations on deploy (using Supabase connection).
- Storage: create bucket for imports/pdfs; configure RLS to household.

Cron
- Vercel Scheduled Function daily to check stale imports (>7 days) and create alerts.

Domains & TLS
- Use Vercel-managed domains; TLS via Vercel default.

Monitoring
- Enable Supabase logs and Vercel function logs; see Observability plan.

