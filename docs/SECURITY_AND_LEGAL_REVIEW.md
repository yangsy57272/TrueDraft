# Security measures and remaining production tasks

This document lists what the code already does, and what an operator still must do before real students use TrueDraft. It is not a compliance certification.

## Implemented in code

| Control | Where |
|---|---|
| Server-side authentication on every private page and API route | `src/server/session.ts`, `src/server/http.ts`, `(app)/layout.tsx` |
| Per-user authorization: every query is scoped by `user_id`; foreign ids return 404 | `src/server/services/*` |
| Magic-link sign-in: single-use, 15-minute, hashed tokens | `src/server/auth.ts` |
| Session cookies: HTTP-only, SameSite=Lax, `Secure` when `APP_URL` is https; IP tracking disabled | Better Auth config |
| CSRF: Better Auth origin checks + same-origin/Sec-Fetch-Site check on all mutating API routes | `assertSameOrigin` |
| Rate limits: auth endpoints (Better Auth), AI per hour/day, writes per minute (Postgres-backed) | `src/server/rate-limit.ts` |
| Input limits: body size, draft/prompt/context/selection length, version and essay counts | `src/server/validation.ts`, `limits` |
| Application-level AES-256-GCM encryption of drafts, versions, context notes, feedback requests/results, and brainstorming notes; purpose-bound AAD; key rotation via `ENCRYPTION_KEYS` | `src/server/crypto.ts` |
| AI output validated against strict schemas; no `dangerouslySetInnerHTML`; admin Markdown rendered without raw HTML and sanitized | `schemas.ts`, `Markdown.tsx` |
| Security headers: CSP (self only, no third-party origins), `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy: no-referrer`, Permissions-Policy, COOP; HSTS and upgrade-insecure-requests on https deployments | `next.config.ts` |
| `Cache-Control: no-store` and `X-Robots-Tag: noindex` on private pages and APIs; robots.txt disallows private paths | `proxy.ts`, `http.ts`, `robots.ts` |
| No essay content in URLs, logs, analytics, audit metadata, or error responses; generic error pages without stack traces | `logger.ts`, `analytics.ts`, `apiRoute`, `error.tsx` |
| Admins cannot browse essays; admin pages return 404 for non-admins | `src/server/admin.ts` |
| Better Auth telemetry disabled; no third-party scripts, fonts, or analytics (fonts are self-hosted) | `auth.ts`, `layout.tsx` |

## Required before launch (operator tasks)

### Legal and policy
- [ ] **Have a qualified lawyer review** the Privacy Center text, consent flow, and a full privacy policy and terms of service. The review should cover the users' ages (many applicants are minors; parental-consent rules may apply), the operating entity, the storage location, and the target markets (for example China's PIPL and its cross-border transfer rules, GDPR/UK GDPR, US state privacy laws, and COPPA if under-13 users are possible).
- [ ] Set `NEXT_PUBLIC_OPERATOR_NAME`, `NEXT_PUBLIC_SUPPORT_EMAIL`, `STORAGE_REGION`, and `PRIVACY_LAST_UPDATED`. Bump `PRIVACY_POLICY_VERSION` whenever the text changes; students are then asked for consent again.
- [ ] **AI provider terms:** confirm in writing that API inputs and outputs are not used for training, and record the provider's retention period. Disable any optional provider-side logging or retention you can. Set `AI_PROVIDER_NO_TRAINING_CONFIRMED=true` and `AI_PROVIDER_RETENTION_NOTE` **only** to match the signed terms. Consider zero-data-retention arrangements where available; note that some models require standard retention.
- [ ] Decide whether essays may be processed outside the student's country, and choose the provider region and database region to match.
- [ ] Get permission and license records for any third-party learning material before adding it (admin “licensed” collection).

### Infrastructure
- [ ] Serve only over HTTPS. Set `APP_URL` to the https origin **at build time**, because the security headers are computed during the build.
- [ ] Use managed PostgreSQL with encryption at rest, TLS (`DATABASE_SSL=require`), private networking, and least-privilege credentials.
- [ ] **Backups:** define the retention window (for example, 14–35 days) and document that deleted data persists in backups until they expire. Update the Privacy Center text if it differs. Encrypt backups, and test restoring them.
- [ ] **Key management:** keep `ENCRYPTION_KEYS`, `BETTER_AUTH_SECRET`, `CRON_SECRET`, and provider keys in a secrets manager. To rotate keys, prepend a new key, then re-encrypt old rows (not yet automated). Losing every key makes stored essays unrecoverable.
- [ ] Configure SMTP with SPF/DKIM/DMARC (`EMAIL_TRANSPORT=smtp`). Never use the `console` or `file` transports in production.
- [ ] Never set `AI_PROVIDER=mock` or `AUTH_RATE_LIMIT=off` in production.
- [ ] Schedule the retention job daily (`POST /api/cron/retention` with `Authorization: Bearer $CRON_SECRET`, or `npm run retention:run`).
- [ ] Put a WAF or edge rate limiting in front of `/api/auth/*` for abuse protection beyond per-instance limits.
- [ ] Make sure no proxy, CDN, or APM tool records request bodies, and that error reporting (if added) scrubs bodies and breadcrumbs.

### Engineering hardening (recommended)
- [ ] Move to nonce-based CSP to remove `'unsafe-inline'` from `script-src`.
- [ ] Turn on dependency scanning (Dependabot or Renovate, plus `npm audit` in CI), secret scanning, and push protection on the repository.
- [ ] Add CI that runs `npm run typecheck`, `npm test`, and `npm run test:e2e` on every pull request.
- [ ] Write a key-rotation re-encryption script and an incident-response runbook.
- [ ] Commission an independent security assessment or penetration test before a public launch.
- [ ] Monitor provider usage and cost, and alert on spikes in failed AI runs (counts are visible on the admin page).

## Claims the product must not make

The UI and docs avoid “100% secure”, “impossible to leak”, “fully compliant”, “AI-undetectable”, and any admission prediction. Keep it that way in marketing copy too.
