# Deployment

TrueDraft is a standard Next.js server application backed by PostgreSQL. It runs on any Node.js host (Render, Fly.io, Railway, a VM, a container platform, or Vercel with an external Postgres).

## 1. Provision

- PostgreSQL 14+ with TLS and encryption at rest. Choose a region that matches your legal review.
- An SMTP provider for sign-in emails.
- An AI provider account (Anthropic recommended), with data-use terms you have verified.

## 2. Configure environment

Copy `.env.example` and set at least:

```bash
APP_URL=https://your-domain.example          # must be set at BUILD time too
BETTER_AUTH_URL=https://your-domain.example
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
DATABASE_URL=postgres://user:pass@host:5432/truedraft
DATABASE_SSL=require
ENCRYPTION_KEYS=k1:$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")

AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=...
AI_MODEL=claude-opus-5-5        # or another model your account can use
AI_PROVIDER_DISPLAY_NAME="Anthropic (Claude API)"
AI_PROVIDER_NO_TRAINING_CONFIRMED=true   # only if your agreement confirms it
AI_PROVIDER_RETENTION_NOTE="..."         # copy from your agreement

EMAIL_TRANSPORT=smtp
SMTP_URL=smtps://user:pass@smtp.example:465
EMAIL_FROM="TrueDraft <no-reply@your-domain.example>"

ADMIN_EMAILS=you@your-domain.example
CRON_SECRET=$(openssl rand -hex 32)
NEXT_PUBLIC_OPERATOR_NAME="..."
NEXT_PUBLIC_SUPPORT_EMAIL=privacy@your-domain.example
STORAGE_REGION="..."
```

Back up `ENCRYPTION_KEYS` securely. Without it, stored essays cannot be decrypted.

## 3. Build, migrate, seed, start

```bash
npm ci
npm run build
npm run db:migrate
npm run db:seed        # optional: original writing resources
npm run start          # listens on $PORT or 3000
```

Run `db:migrate` on every deploy before starting the new version. Migrations live in `drizzle/`; generate new ones with `npm run db:generate` after changing `src/db/schema.ts`.

## 4. Schedule retention

Daily:

```bash
curl -X POST https://your-domain.example/api/cron/retention -H "Authorization: Bearer $CRON_SECRET"
# or, from a worker with database access:
npm run retention:run
```

## 5. Verify after deploy

1. Visit `/privacy` and check that every row in the status panel is accurate for this deployment.
2. Sign in with a real email. Create an essay, request feedback once, and confirm the result shows the expected model name.
3. Check response headers on `/` (CSP, HSTS) and confirm `/dashboard` returns `Cache-Control: no-store`.
4. Delete the test account from Settings.

## Scaling notes

- The app is stateless apart from Postgres, so it can run as multiple instances. Rate limits are stored in Postgres. Better Auth's own auth rate limiter is in-memory per instance, so add edge rate limiting for `/api/auth/*` as well.
- AI requests stream for up to `AI_TIMEOUT_MS` (default 120 s) per attempt. Make sure your platform's request timeout is longer than that (the route sets `maxDuration = 300`).
