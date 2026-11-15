# TrueDraft for Anna · 0.1.0-beta.5

**Adult-only, fictional-data test candidate. The private beta.4 install/upgrade, real English/Chinese managed-AI reviews, save/reopen, export and single-essay soft deletion are verified. Not publicly released, not submitted for review, and not yet submission-ready.** This folder is a separate static Anna App; the standalone Next.js/SQLite app is unchanged.

Start with [installation](INSTALL.md), [architecture and privacy](ARCHITECTURE.md), [implementation/validation report](VALIDATION.md), and [review runbook](review/REVIEW.md), [real-host evidence](review/LIVE-EVIDENCE.md). The [forum draft](review/FORUM-DRAFT.md) has not been posted.

## Build and check

From the repository root, with Node 22.12–22.x:

```sh
npm ci
npm run anna:build
npm ci --prefix anna
npm --prefix anna run validate
npm test
npm run typecheck
npm run lint
npm run anna:test:ui
npm run anna:package
```

Browser checks use a **simulated** host and fictional fixture, not Anna AI. They use an isolated headless Chrome profile; set `PW_CHROMIUM_PATH` to an installed Chromium executable if needed. Production bundle contains no mock AI, localStorage database, external backend URL, API key, PAT, SQLite file or user configuration.

The package can be loaded by the official local harness. Real persistent storage and managed AI require an eligible adult developer account, explicit test authorization, a private developer App identity and Anna login. The default local harness's legacy in-memory storage is intentionally refused: it lacks real conflict protection. See INSTALL.md before starting a test.
