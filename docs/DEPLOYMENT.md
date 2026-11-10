# Deployment

TrueDraft runs as a Next.js server with a local SQLite database. Use a single Node.js instance with a writable persistent disk. For a desktop install, see [Desktop app](DESKTOP.md).

## 1. Provision

- A persistent disk with encryption at rest and a directory writable by the app. Choose a region that matches your legal review.
- An SMTP provider for sign-in emails.
- An AI provider account (Anthropic recommended), with data-use terms you have verified.

## 2. Configure environment

Copy `.env.example` and set at least:

```bash
APP_URL=https://your-domain.example          # must be set at BUILD time too
BETTER_AUTH_URL=https://your-domain.example
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
DATABASE_PATH=/var/lib/truedraft/truedraft.sqlite
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

### AI limits and spend

```bash
AI_MAX_CONCURRENT_PER_USER=1       # AI runs in flight per student (default 1)
AI_DEDUP_WINDOW_HOURS=24           # reuse an identical recent result instead of calling again (0 = off)
AI_PRICE_INPUT_PER_MTOK_USD=...    # your provider's price per million input tokens, to estimate cost
AI_PRICE_OUTPUT_PER_MTOK_USD=...   # ... and per million output tokens
AI_DAILY_BUDGET_USD=20             # optional: stop new AI runs for the day at this estimated spend
AI_DAILY_TOKEN_BUDGET=2000000      # optional: or at this many tokens (works without prices)
```

Token usage is recorded per run, including failed attempts. Today's totals are on `/admin`. The ceilings are checked before each run, so runs already in flight can overshoot slightly. Set a hard limit in your provider account as well.

### Startup guard

In production the server refuses to start if any of these hold:

- `AI_PROVIDER=mock`;
- `EMAIL_TRANSPORT` is `console` or `file`;
- SMTP settings are missing;
- `AUTH_RATE_LIMIT=off`;
- `ENCRYPTION_KEYS` or a strong `BETTER_AUTH_SECRET` is missing;
- `APP_URL` doesn't use https.

For a demo with fictional data only, set `TRUEDRAFT_DEMO_MODE=true`. The server then starts with a site-wide banner telling visitors not to enter real essays. Never use demo mode for real students.

## 3. Build, migrate, seed, start

```bash
npm ci
npm run build
npm run db:migrate
npm run db:seed        # optional: original writing resources and the starter schools
npm run scorecard:import   # U.S. Department of Education data: adds ~1,570 colleges
npm run cds:import     # Common Data Set datasets in data/cds/
npm run start          # listens on $PORT or 3000
```

Run `db:migrate` on every deploy before starting the new version. It also encrypts any version notes stored before notes were encrypted. Migrations live in `drizzle-sqlite/`; generate new ones with `npm run db:generate` after changing `src/db/schema.ts`.

## 4. Schedule retention

Daily:

```bash
curl -X POST https://your-domain.example/api/cron/retention -H "Authorization: Bearer $CRON_SECRET"
# or, from a worker with database access:
npm run retention:run
```

The retention job also marks AI runs left "pending" by a crash or restart as failed (`ai_interrupted`). The app does the same for one student before starting that student's next run.

## 5. Verify after deploy

1. Visit `/privacy` and check that every row in the status panel is accurate for this deployment.
2. Sign in with a real email. Create an essay, request feedback once, and confirm the result shows the expected model name.
3. Check response headers on `/` (CSP, HSTS) and confirm `/dashboard` returns `Cache-Control: no-store`.
4. Delete the test account from Settings.
5. Before changing `AI_MODEL` or the prompts, run the evaluation set against the new setup: `npm run eval:ai` (see `docs/AI_EVALUATION.md`).

## Scaling notes

- Keep the SQLite file and its WAL files on the same local disk. Back up with SQLite’s backup facilities or stop the app before copying its data directory. Better Auth’s rate limiter is in memory. Add edge rate limiting for `/api/auth/*` on a public deployment.
- AI requests stream for up to `AI_TIMEOUT_MS` (default 120 s) per attempt. Make sure your platform's request timeout is longer than that (the route sets `maxDuration = 300`).

## Import an existing PostgreSQL database

Stop writes to the old app and back up PostgreSQL and the original `ENCRYPTION_KEYS`. Update the source schema to the last PostgreSQL revision with its own migration command. In the SQLite checkout, set `LEGACY_DATABASE_URL` to that database, `DATABASE_PATH` to a new file, and `ENCRYPTION_KEYS` to the original keyring. Run `npm run db:import-postgres`. The command preserves IDs, encrypted data, and references, and rejects an existing destination file. It leaves the source database available for rollback. Users sign in again after the switch.

For a desktop migration, quit TrueDraft and import to `truedraft.sqlite` in a fresh data directory. Before opening it, create `settings.json` in that directory with `email` set to the imported account, `encryptionKeys` set to the original keyring, and `authSecret` set to a fresh value from `openssl rand -hex 32`. Launch with `TRUEDRAFT_DESKTOP_DATA_DIR` pointing to that directory. Back up `settings.json` with the database.
