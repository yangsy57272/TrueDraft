# TrueDraft

**Your story. Your voice. Clearer feedback.** · 你的故事，你的声音。更清晰、更透明的文书反馈。

TrueDraft is a bilingual (English / Simplified Chinese) web app that gives students — especially Chinese students applying to undergraduate programs abroad — structured, ethical feedback on their own college application essays. It is a coaching and revision tool, **not** a ghostwriting service: the AI is constrained so it can't write or replace the essay, invent experiences, or predict admission outcomes.

> The product name, tagline, and logo are configured in [`src/config/brand.ts`](src/config/brand.ts).

---

## Status: what is implemented vs. future work

### Implemented (and covered by automated tests)

| Area | What works |
|---|---|
| Accounts | Email magic-link sign-in (Better Auth), persistent sessions, sign-out, account deletion, full JSON data export. No name, school, phone, ID, scores, or finances collected. |
| Essays | Create workspaces (title, type, exact prompt, optional school & word limit, focus areas, feedback language, optional context); autosaved working draft; immutable numbered versions with notes; compare any two versions (word diff); duplicate; export `.md` / `.txt`; delete. |
| AI feedback | Five-part structured feedback (overall response, 8-category diagnostic with developmental labels, passage comments, 3–5 step revision plan, voice check) in English, Chinese, or bilingual. Honest progress stages from the real response stream, no fake percentages. |
| AI tools | Prompt Decoder, Brainstorming Coach (stored only if the student saves notes), Sentence Feedback (7 modes, max 2 alternatives, length-capped), Word-Count Assistant, Final Read-Through. |
| AI safety | Versioned server-side prompts; strict JSON-schema structured output validated with Zod; length-capped fields so no field can carry an essay; long alternatives discarded; quotes checked against the draft; prompt-injection tag neutralisation; never fabricates feedback on failure; timeouts + limited retries; refusal handling. |
| Privacy | Consent dialog (with “Learn what is sent” and “Save without AI analysis”) before the first AI call and after any policy-version change; consent records with withdrawal; identifier redaction before sending; AES-256-GCM application-level encryption of drafts, versions, notes, and feedback; retention periods with automatic purge; Privacy Center driven by deployment config; no third-party analytics; logs carry no essay content. |
| Security | Server-side auth + per-user authorization on every route (foreign IDs → 404), same-origin checks on mutations, Postgres-backed rate limits, CSP and security headers, `no-store` on private data, sanitized Markdown, generic error messages. |
| Localization | Complete English and Simplified Chinese UI; language switcher in the header and Settings; preference stored on the account; i18n architecture ready for more locales. |
| Content | Original bilingual writing guides (seeded), attributed external links, and a clearly-labelled fictional sample essay with hand-written sample feedback. |
| Admin | Aggregate counts only (no essay browsing). Resource management with source, author, license status, permission notes, knowledge collection, access level, and an AI-retrieval switch that is off by default. |
| Accessibility | Semantic HTML, skip link, labelled fields with associated errors, visible focus, keyboard-operable Radix tabs/dialogs/menus with focus return, non-colour cues on all statuses, reduced-motion support, no horizontal overflow at 375px. |

### Not implemented / future work

- **Live AI was not exercised in this environment** (no API key was available). The Anthropic and OpenAI-compatible adapters are tested against their wire formats with stubbed HTTP; run one real request after configuring a key (see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)).
- Counselor/teacher/parent roles, sharing links, and any social features (deliberately out of MVP scope).
- Support access to essays (deliberately not built — see Privacy Center).
- Nonce-based CSP (currently `'unsafe-inline'` scripts; see the security doc).
- Translations beyond English and Simplified Chinese.
- Uploading `.docx`/PDF drafts (students paste text).
- AI retrieval from licensed materials is implemented as a gated mechanism but ships with **no** licensed content.
- Legal review of the privacy text for a specific operator and market (required before launch — see [docs/SECURITY_AND_LEGAL_REVIEW.md](docs/SECURITY_AND_LEGAL_REVIEW.md)).

---

## Tech stack

Next.js 16 (App Router, server components, route handlers) · TypeScript · PostgreSQL + Drizzle ORM (SQL migrations in `drizzle/`) · Better Auth (magic link) · Tailwind CSS v4 · Radix UI primitives · Zod · Anthropic TypeScript SDK behind a provider-agnostic adapter · Vitest + Playwright + axe-core.

## Quick start (local development)

Requirements: Node.js ≥ 20.9, PostgreSQL ≥ 14.

```bash
npm install
cp .env.example .env
# Edit .env: DATABASE_URL, BETTER_AUTH_SECRET, ENCRYPTION_KEYS (see comments in the file)

npm run db:migrate      # create tables
npm run db:seed         # original writing resources (no student data)
npm run dev             # http://localhost:3000
```

Sign in with any email. With `EMAIL_TRANSPORT=console`, the sign-in link is printed in the server console.

### AI provider options

| `AI_PROVIDER` | Behaviour |
|---|---|
| *(empty)* | AI feedback disabled; students can still write, save, version, compare, export. The UI says so. |
| `mock` | **Development only.** Returns placeholder text labelled “Development mock — not real feedback”. A dev banner is shown. |
| `anthropic` | Claude via the official SDK. Set `ANTHROPIC_API_KEY`; model via `AI_MODEL` (default `claude-opus-5-5`). |
| `openai-compatible` | Any Chat Completions endpoint that supports strict JSON-schema output. Set `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`. |

Keys are read only on the server. Model, timeout, retries, token limit, effort/temperature, and rate limits are all environment variables (see `.env.example`).

## Testing

```bash
# Unit + integration (uses a separate database: truedraft_test)
createdb truedraft_test            # once
npm test

# End-to-end (Playwright) against a production build
# .env must contain: AI_PROVIDER=mock, EMAIL_TRANSPORT=file, AUTH_RATE_LIMIT=off
npm run build && npm run start &   # or let Playwright start it
npm run test:e2e
```

Covered: magic-link auth, sign-out, forged cookies; cross-user access to every essay endpoint; drafts, autosave vs. versions, concurrent version numbering, encryption at rest; feedback validation, consent gating, rate limiting; structured-output validation, malformed output, outages with retry, refusals, not-configured state; sentence-alternative guard; prompt-injection tag escaping; essay deletion, feedback deletion, account deletion with no orphan rows, retention purge, export; consent grant/withdraw/re-consent on policy change; i18n structural parity and placeholders; word counting (English, Chinese, mixed); redaction; no essay text in logs/analytics/audit; provider wire formats; and in the browser: the full student workflow, URL-tampering, keyboard navigation of tabs/dialogs/menus, axe WCAG 2 A/AA checks, language switching, mobile layouts without overflow, and secrets absent from client bundles.

## Project layout

```
src/
  app/                 pages (public + (app) authenticated group) and /api route handlers
  components/          layout, editor workspace, feedback renderers, tools, UI primitives
  config/              brand.ts (name/logo), deployment.ts (privacy facts, limits)
  content/sample.ts    fictional demo essay + hand-written sample feedback
  db/                  Drizzle schema and client
  i18n/                locale config, en + zh-CN messages, server/client translators
  server/
    ai/                prompts (versioned), schemas, guardrails, provider adapters, orchestrator
    services/          essays, feedback, consent, account/retention/export, resources, audit
    auth.ts session.ts http.ts crypto.ts redact.ts logger.ts analytics.ts rate-limit.ts
drizzle/               SQL migrations
scripts/               migrate, seed, retention
tests/                 unit, integration (real Postgres), e2e (Playwright)
docs/                  AI data flow, security & legal review, deployment
```

## Documentation

- [docs/AI_DATA_FLOW.md](docs/AI_DATA_FLOW.md) — exactly what is sent to the AI provider and what happens to it
- [docs/SECURITY_AND_LEGAL_REVIEW.md](docs/SECURITY_AND_LEGAL_REVIEW.md) — security measures and the tasks still required before launch
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — production setup

## Learning materials and intellectual property

All guides in this repository are original. TrueDraft does not include, scrape, or ingest third-party course materials, books, worksheets, or real applicants' essays. Licensed material can be added later by an administrator into a separate `licensed` collection with its permission recorded; it is never used for AI guidance unless an administrator explicitly enables retrieval for that item. Student essays are stored in separate tables and never enter the knowledge base.

TrueDraft is not affiliated with the Common App, any university, or any essay-coaching company.
