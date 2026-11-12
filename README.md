# TrueDraft

**Your story. Your voice. Clearer feedback.** · 你的故事，你的声音。更清晰、更透明的文书反馈。

TrueDraft is a bilingual (English / Simplified Chinese) web app that gives students — especially Chinese students applying to undergraduate programs abroad — structured, ethical feedback on their own college application essays. It is a coaching and revision tool, **not** a ghostwriting service. The AI is instructed not to write or replace the essay, invent experiences, or predict admission outcomes. Structured, length-capped output (at most two short alternatives for a passage the student selects) makes handing back a replacement essay hard, but no control can guarantee a model never produces ghostwritten text.

> The product name, tagline, and logo are configured in [`src/config/brand.ts`](src/config/brand.ts).

---

## What the app does now

1. **School recommendations after choosing majors** — “See colleges for these majors →” opens `/schools/recommended`. The link is always visible; applicants without a saved field can choose one directly. A starting list aims for **4 Reach, 5 Target, 4 Safety**, with fewer when data or filters leave too few candidates. Each card explains its classification, field prevalence, graduation rate, and verified U.S. News ranks. School pages also let you choose a field and inspect its available data. Choose balanced matching, undergraduate program rank, or National University rank as the ordering priority. Rankings never change the admission group.
   - **AI school + major matching** uses courses, activities, honors and interests to explain the shortlist, tradeoffs and next research steps, with streamed character tracking. It requires configured AI and consent. Test scores/GPA remain local to the rules; development mock results are clearly labeled. AI can only return schools in the server-generated shortlist and cannot assign admission groups.
   - University-wide admit-rate bands: below 15% always Reach; 15–35% Reach; 35–60% Target; 60%+ Safety. SAT/ACT at or above the published 75th percentile moves one group safer; below the 25th percentile moves one harder. Missing scores/ranges use admit rate only. These are planning suggestions, **not predictions or program-specific admission assessments**. Competitive majors, international admission and financial aid can make admission harder; Safety does not guarantee admission or affordability. Applicants choose the final label.
   - The versioned **2027 U.S. News** extract currently covers 24 institutions with overall and/or undergraduate program rankings. Each displayed rank links to a publisher or university announcement and identifies its category. National Universities and Liberal Arts Colleges are not pooled into one ranking; graduate/public-only/specialty ranks are not passed off as undergraduate overall ranks. Missing data says **not verified**, not unranked. Degree share is **prevalence, not program quality**. Broader ranking and program-specific admissions coverage remain future work.
   - Adding a school saves its suggested Reach/Target/Safety label and the selected major/field to My list. Existing list entries retain the applicant’s choices.
2. **Supplemental essays** — The 2026–27 catalog now contains **134 institutions**: 98 with listed questions or labeled task summaries, 31 requiring portal checks, and 5 with no required general supplement identified. Its **428 prompt/task records preserve all 327 original workbook prompts**. School pages show limits/requirements and “Start this essay” prefills the workspace; My list shows prompt counts. Newly researched task summaries link to official wording. Confirm current route/program requirements in the application portal. College Essay Guy commentary was not imported; relevant free guides appear as attributed external links.
3. **Personal statement guide** — `/guides/personal-statement`, in English and Chinese, covers the seven Common App prompts, six writing steps, montage/narrative structures, pitfalls, international-applicant tips, a submission checklist and outside reading. The text is original and linked from navigation, essays and the journey.
4. **Desktop downloads** — SQLite packages for Windows x64, macOS Apple Silicon/Intel and Linux x64/arm64 include the runtime and reference data. Upgrades refresh public supplements while retaining local drafts. AI is optional. **Settings → AI connection settings** provides service presets, a masked API-key field, model discovery, a synthetic structured-response test and instant save; no `.env` editing is needed in desktop downloads. Keys are encrypted on the device. Hosted deployments retain operator-managed AI.

## Status: what is implemented vs. future work

### Implemented (and covered by automated tests)

| Area | What works |
|---|---|
| Accounts | Email magic-link sign-in (Better Auth), persistent sessions, sign-out, account deletion, full JSON data export (format v2: every record with its id, uncapped history, activity log). Name, school, phone, ID, and family finances are never required; test scores and GPA are optional profile fields that are never sent to the AI. |
| Essays | Create workspaces (title, type, exact prompt, optional school & word limit, focus areas, feedback language, optional context); autosaved working draft (saves run one at a time with a revision number, so an outdated tab or reordered request can never overwrite newer text; conflicts are shown with keep/load/copy choices; export and navigation wait for the save); immutable numbered versions with notes; compare any two versions (word diff); duplicate; export `.md` / `.txt`; delete. |
| AI feedback | Five-part structured feedback (overall response, 8-category diagnostic with developmental labels, passage comments, 3–5 step revision plan, voice check) in English, Chinese, or bilingual. Honest progress stages from the real response stream, no fake percentages. |
| AI tools | Prompt Decoder, Brainstorming Coach (stored only if the student saves notes), Sentence Feedback (7 modes, max 2 alternatives, length-capped), Word-Count Assistant, Final Read-Through. |
| AI safety | Versioned server-side prompts; strict JSON-schema structured output validated with Zod; length-capped fields so no single field can carry an essay; long alternatives discarded; quotes checked against the draft; prompt-injection tag neutralisation; never fabricates feedback on failure; timeouts + limited retries; refusal handling. |
| Privacy | Consent dialog (with “Learn what is sent” and “Save without AI analysis”) before the first AI call and after any policy-version change; consent records with withdrawal; identifier redaction before sending; AES-256-GCM application-level encryption of drafts, versions and version notes, notes, profiles, and feedback (titles, prompts, and list metadata are stored unencrypted and owner-scoped); retention periods with automatic purge; Privacy Center driven by deployment config; no third-party analytics; logs carry no essay content. |
| Security | Server-side auth + per-user authorization on every route (foreign IDs → 404), same-origin checks on mutations, SQLite-backed rate limits, CSP and security headers, `no-store` on private data, sanitized Markdown, generic error messages. |
| Localization | Complete English and Simplified Chinese UI; language switcher in the header and Settings; preference stored on the account; i18n architecture ready for more locales. |
| Content | Original bilingual writing guides (seeded), attributed external links, and a clearly-labelled fictional sample essay with hand-written sample feedback. |
| Application journey | A 7-step hub (`/journey`): profile → majors → read the CDS → explore schools → college list → essays → track applications. Each step's status is computed from the student's own data, with no streaks or pressure. |
| Profile | Courses (IB/A-Level/AP/Chinese national/OSSD levels), Common App-style activities (150-char descriptions, grades, hours), honors, interests and values, optional scores, and college preferences. Encrypted at rest. **CV import:** paste CV text, the AI extracts items, the student ticks which to add, and the CV itself is never stored. |
| Major Explorer | AI suggests fields of study grounded in the student's own entries. Every cited entry is checked against the profile and flagged if not found. Includes ways to test each interest. No prestige ranking or admission talk. Scores and GPA are never sent. Shortlist "majors I'm considering". |
| Common Data Set | `/cds` explains every CDS section and the key items (C1, C2, C7, C8–C9, C11–C12, C13–C22, G1, H6, J1), with a fictional worked example. `/schools` is a directory of 1,573 U.S. colleges of every kind (public and private nonprofit, any selectivity). It has U.S. Department of Education figures (College Scorecard) for every college, and 245 imported Common Data Set editions for 234 institutions, plus 561 checked institutional CDS entry points/documents (including historical sources); every value is marked with its source and period. Filters cover region, size, admission rate, tuition, test policy, early plans, international aid, and field. Results can be sorted and are paginated. Schools whose data can't answer a filter are listed separately, never silently dropped. School pages, side-by-side compare, and admin CDS entry, CSV import, and AI pre-fill (drafts only) are included. |
| Recommendations | `/schools/recommended`: after choosing majors (each linked to a field of study), a balanced starting list split into **Reach / Target / Safety** (4/5/4). Rule-based and transparent (`src/lib/fit.ts`): admit-rate bands (under 15% is always a reach), moved one step by where the student's SAT/ACT sits in the school's middle-50% range; no score or no published range means admit rate only, and the card says so. Candidates must award ≥1% of degrees in the student's fields; ordered by field prevalence, six-year graduation rate and verified ranking signals. Size/region preferences apply first and are relaxed (and labelled) only to fill a short group. Every card lists its reasons and adds the school to the list with the suggested label. School pages show the same suggestion. Not a prediction, and the page says so. |
| Supplements | 2026–27 catalog for 134 institutions (428 prompt/task records; 98 with listed questions, 31 portal checks, 5 with no required general supplement identified), loaded from `data/supplements/2026-2027.json` with `npm run supplements:import`. Shown on school pages and summarised on My list; "Start this essay" opens a new essay pre-filled with the prompt, word limit, school, and list link. |
| Personal statement guide | `/guides/personal-statement`: original bilingual guide — Common App prompts, step-by-step process, two essay shapes, pitfalls, notes for international applicants, a pre-submit checklist, and attributed external links. |
| College list | Add directory or custom schools. Labels are Reach / Target / Safety / Not sure; TrueDraft can suggest one, but the student always decides. Tracks round, platform, deadline, intended major, status, private notes (encrypted), a checklist with defaults (recommendations, transcript, English test, CSS/ISFAA, …), linked supplemental essays, and upcoming deadlines. |
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
- **CDS coverage is partial and explicitly sourced.** The 2026-11-12 audit covers all 1,573 U.S. directory institutions; 561 have a checked official page or document, and 234 have imported detailed figures. Historical sources, blocked sites, ambiguous forms, unparsed spreadsheets and missing fields are identified in the coverage catalog; none means “no CDS exists.” See [the coverage report](docs/CDS_COVERAGE.md).
- Continued CDS source/field coverage expansion and deadline reminders by email.
- Legal review of the privacy text for a specific operator and market (required before launch — see [docs/SECURITY_AND_LEGAL_REVIEW.md](docs/SECURITY_AND_LEGAL_REVIEW.md)).

---

## Tech stack

Next.js 16 (App Router, server components, route handlers) · TypeScript · SQLite + Drizzle ORM (SQL migrations in `drizzle-sqlite/`) · Better Auth (magic link) · Tailwind CSS v4 · Radix UI primitives · Zod · Anthropic TypeScript SDK behind a provider-agnostic adapter · Vitest + Playwright + axe-core.

## Desktop app

Download the Windows x64 installer or the macOS ZIP for your processor from [GitHub Releases](https://github.com/yangsy57272/TrueDraft/releases). On Windows, double-click the installer. On macOS, extract the ZIP and open `TrueDraft.app`. TrueDraft opens in your browser with a local profile and stores data in a SQLite file on your device. The packages include Node.js and the reference data.

See the [desktop guide](docs/DESKTOP.md) for data locations, backup, optional AI settings, and packaging commands.

## Quick start (local development)

1. Install Node.js **22.22.0** (the version in `.nvmrc`), then run these commands from the repository folder.

   ```bash
   node --version
   npm ci
   cp .env.example .env
   ```

2. Open `.env`. Keep `DATABASE_PATH=.truedraft/truedraft.sqlite` to store the SQLite database inside this checkout. The first migration creates the file and its tables.
3. Run `openssl rand -base64 32` twice. Use the first result for `BETTER_AUTH_SECRET` and the second for `ENCRYPTION_KEYS`, with `k1:` before the second result. Keep `EMAIL_TRANSPORT=console` for local sign-in. Set `AI_PROVIDER=mock` to try the feedback workflow with fictional text, or leave it empty to try the editor without AI. Keep `.env` local.
4. Create the tables, load the starter data, and start the app.

   ```bash
   npm run db:migrate
   npm run db:seed
   npm run scorecard:import
   npm run cds:import
   npm run supplements:import
   npm run dev
   ```

5. Open `http://localhost:3000` and sign in with `demo@example.test`. Open the one-time link printed in the terminal where `npm run dev` is running. Create a fictional essay, then go to **My journey** and use **Open draft** to return to it. Add a school and a deadline in **My college list**, then open **View my deadlines** and select the school name to jump back to its deadline controls.

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
# Unit tests only (no database needed)
npm run test:unit
# Unit + integration (creates in-memory SQLite databases)
npm test

# End-to-end (Playwright) against a production build
# .env must contain: AI_PROVIDER=mock, EMAIL_TRANSPORT=file, AUTH_RATE_LIMIT=off
npm run build && npm run start &   # or let Playwright start it
npm run test:e2e
```

Covered: magic-link auth, sign-out, forged cookies; cross-user access to every essay endpoint; drafts, autosave vs. versions, stale-revision rejection, versions and feedback never overwriting a newer draft, concurrent version numbering, encryption at rest; feedback validation, consent gating, rate limiting; structured-output validation, malformed output, outages with retry, refusals, not-configured state; sentence-alternative guard; prompt-injection tag escaping; essay deletion, feedback deletion, account deletion with no orphan rows, retention purge, export; consent grant/withdraw/re-consent on policy change; i18n structural parity and placeholders; word counting (English, Chinese, mixed); redaction; no essay text in logs/analytics/audit; provider wire formats; and in the browser: the full student workflow, typing through slow saves / version saves / feedback and reloading, two-tab conflicts, export refusing stale text, URL-tampering, keyboard navigation of tabs/dialogs/menus, axe WCAG 2 A/AA checks, language switching, mobile layouts without overflow, and secrets absent from client bundles.

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
drizzle-sqlite/        SQLite migrations
scripts/               migrate, seed, retention
tests/                 unit, integration (SQLite), e2e (Playwright)
docs/                  AI data flow, security & legal review, deployment
```

## Documentation

- [docs/AI_DATA_FLOW.md](docs/AI_DATA_FLOW.md) — exactly what is sent to the AI provider and what happens to it
- [docs/SECURITY_AND_LEGAL_REVIEW.md](docs/SECURITY_AND_LEGAL_REVIEW.md) — security measures and the tasks still required before launch
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — production setup
- [docs/CDS_DATA.md](docs/CDS_DATA.md) — Common Data Set sources, integrity rules, and how to import and verify data

## Learning materials and intellectual property

All guides in this repository are original. TrueDraft does not include, scrape, or ingest third-party course materials, books, worksheets, or real applicants' essays. Licensed material can be added later by an administrator into a separate `licensed` collection with its permission recorded; it is never used for AI guidance unless an administrator explicitly enables retrieval for that item. Student essays are stored in separate tables and never enter the knowledge base.

**Supplemental prompts.** `data/supplements/2026-2027.json` was converted from a spreadsheet the operator supplied: a public quick-reference list compiled by College Essay Guy (last updated 2026-08-21). Only the colleges' own prompt text and factual fields (word limit, required/optional, section labels, the college's page) are imported, and only for rows marked "Confirmed for 2026–27". The compiler's guides and commentary are **not** imported; where the list linked to a free College Essay Guy guide, TrueDraft shows an attributed external link. Students are told to confirm every prompt in the Common App or on the college's site.

TrueDraft is not affiliated with the Common App, any university, or any essay-coaching company.
