# TrueDraft Anna validation report

2026-11-16 · candidate **0.1.0-beta.6** · **private test candidate, not submission-ready**.

The complete core workflow ran successfully in the real Anna production host on beta.2 using fictional text: private installation → prompt/draft → consent → valid managed-AI feedback → manual revision → save → close/reopen → export. Beta.4 was also privately installed: upgrade preserved data, real Chinese feedback was saved, and a disposable essay was soft-deleted. No public release, review submission, forum/email message or real-student upload was performed.

## Project audit and preservation

- Original `/Users/yangshiyi/Documents/ChatGPT/TrueDraft`: branch `codex/sqlite-windows`, HEAD `5437300`, pre-existing dirty modifications preserved. No reset, stash, real `.env` read, database migration or application replacement.
- Existing clean release worktree: `codex/admission-fit-budget` at `6fe6839`, standalone source equivalent to merged main. Only prior Anna work discovered was `docs/ANNA_READINESS.md`, an assessment rather than an adapter.
- Separate implementation: `/Users/yangshiyi/Documents/ChatGPT/TrueDraft-anna`, branch `codex/anna-essay-review`, based on GitHub main `d4a65514b3baca0268979846c8acde9b15e905f7`.
- Exact-main [CI](https://github.com/yangsy57272/TrueDraft/actions/runs/43653775148) and [desktop packaging](https://github.com/yangsy57272/TrueDraft/actions/runs/43653780951) passed. Published standalone remains desktop-v0.1.9. Main was rechecked and remained unchanged during this work.
- Baseline open issue #9: email notifications, outside Anna scope. No baseline open PR. New [draft PR #14](https://github.com/yangsy57272/TrueDraft/pull/14) synchronizes the adapter; it is not merged or marked review-ready.
- Original settings, keys, SQLite data and installed standalone app were not used as test fixtures or modified by the adapter. Local workflow-state files are updated separately as requested.

## Implementation matrix

| Area | Initial classification | Change and basis | Acceptance evidence / remaining work |
|---|---|---|---|
| Feedback policy/format | 已实现且可复用 | Existing coaching prompts, complete-feedback schema, bounded fields, identifier redaction and quote grounding | 8 adapter contract tests; actual hosted feedback passes schema/guards. No replacement essays, invented experiences or admissions predictions |
| Editor and versions | 需要适配 | Static Anna editor; immutable version IDs, copy-old-version, feedback linkage and stale marker | Real revision saved and reopened; export contains 2 versions and feedback linked to version 1 |
| Adult audience | 需要适配 | Adult-only copy and access gate aligned with current Terms; parental consent is no substitute | Browser gate blocks storage/AI before acknowledgement. User personally acknowledged age eligibility in the test. Self-attestation is not independently verified age assurance |
| App packaging | 需要新增 | Schema-4 static SPA, no Executa/Skill/server process needed under official manifest | Official CLI strict validation passes; private beta.1, beta.2 and beta.4 installed; upgrade preserves the saved example |
| Managed AI | 需要新增 | Signed host `llm.complete`, optional platform BYOK, no key entry | Real production beta.2 review succeeds, model/actual usage exported. No mock substituted for this result |
| Identity/ownership | 等待平台确认 | Anna resolves authenticated user/App from SDK window tokens; own-App storage only, no arbitrary user ID/backend bootstrap | Simulated isolation passes. **Real second-account get/set/delete/export, replay, logout and expiry tests not performed**; owner has no second eligible account |
| Persistence | 需要适配 | APS per-essay row instead of copying standalone SQLite; schema 1 and no migration | Real save/close/reopen and beta.2→beta.4 upgrade work. Full restart, reinstall and restore remain unverified |
| Concurrent writes | 需要新增 | Etag on existing-row saves/deletes; fail-closed stale-etag probe | Actual Anna rejects deliberate bad etag; simulated two-window conflict preserves editor. Live concurrent-window test remains |
| AI consent/privacy | 需要适配 | Per-input consent; separate save-without-AI; explicit actual data flow and qualified provider terms | Real no-AI save and consented completion verified. No entry payload/chat history/profile requested. Platform context and retention assurances remain qualified |
| Export/deletion | 需要适配 | Active-record JSON download; etag-protected delete-one/all; labelled APS soft deletion | Actual JSON download inspected; a disposable real essay was soft-deleted and the original example preserved. Permanent purge not verified |
| Retention | 等待平台确认 | Row-wide 30/90/365-day TTL on each save/analysis write; no assumed local scheduler | Payload verified. Anna GC timing, backups and physical purge remain unknown |
| Secrets/encryption | 需要适配 | No frontend credentials, external backend or application encryption key; preserve standalone encrypted DB | Explicit package allowlist and build-input audit. Platform-managed at-rest encryption/recovery needs confirmation; no E2EE claim |
| Usage/fees | 需要适配 | Anna Credits/optional platform BYOK; actual returned tokens/model only | Real export contains usage. No fabricated dollar bill. Net-profit revenue/MAU distinctions attributed to owner-supplied Isabel email |
| Duplicates/failures | 需要新增 | Local lock + APS pending UUID + cached version/language results; 10-minute timeout; no automatic paid retry | Simulated dedupe, language-specific cache, discard, quota, malformed output and timeout guard pass. First live format mismatch failed visibly, then normalization was corrected/tested |
| Cancellation/recovery | 等待平台确认 | “Stop displaying result” discards output; uncertain transport failure retains marker | Does not promise provider cancellation/refund. Orphaned-request recovery and reliable live streaming remain unresolved |
| English/Chinese/resizing | 需要适配 | Bilingual labels, three feedback-language choices, focus styles, status/live region, stable feedback order | Simulated 360×640/1000×720 checks, persisted JSON-key reordering and screenshots. Real English and Chinese UI/feedback verified; exhaustive keyboard/window audit incomplete |
| Standalone regression | 已实现且可复用 | No standalone production routes/DB behavior changed | 296 unit/integration checks and production webpack build pass. First source commit's full CI, browser tests and all 5 desktop packages pass; current-head status is recorded separately |

## Actual hosted-AI evidence

See [LIVE-EVIDENCE.md](review/LIVE-EVIDENCE.md). Three explicit test calls were made, with no automatic retries:

1. Official real-LLM harness returned model `google/gemini-3-flash-preview`, 2,121 input / 1,804 output tokens. Its schema-shaped data envelope was initially rejected. No successful feedback was fabricated. Adapter now unwraps only the exact two-key envelope and applies the same full schema; an actual JSON Schema still fails.
2. Installed production beta.2 returned a valid review, saved to version 1. Model `google/gemini-3-flash-preview`; 2,150 input / 1,874 output / 4,024 total tokens, 0 reasoning. UI first priority: “Deepen the Internal Shift”, with three revision tasks. This is returned usage, not a verified monetary bill.

3. Installed production beta.4 returned a valid Chinese review for version2: 2,190 input / 2,116 output / 4,306 total tokens,0 reasoning, with4 revision tasks.

The final actual export inspected locally contains one explicitly fictional essay, two versions and two correctly associated reviews (English/version1, Chinese/version2). Exports remain in the user's Downloads and are not committed. No raw host session/PAT/model request is included in this report or package.

## Checks and practical limits

- Official CLI 0.1.64 / schema dispatcher 0.33.0: strict manifest/bundle validation passed.
- 296 unit/integration checks, current TypeScript and lint pass. Generated bundle is excluded from lint; source is checked.
- Browser simulation covers gate, save without AI, reopen, double clicks, per-language cached feedback selection, consent reset, version/stale linkage, persisted key-order changes, conflicts, JSON export, narrow/Chinese layout, delete-all, discard, quota error and uncertain-timeout retry prevention. **These are simulated tests, not proof of real account isolation or model behavior.**
- Standalone production `--webpack` build passes. Default Turbopack build in this isolated worktree refused its external node_modules symlink; this is a local dependency-layout restriction, not reported as a source build success. GitHub clean-install build/browser regression passed for source commit `8eefecc`.
- Official local harness starts. Default legacy memory storage is deliberately rejected; real APS mode uses login and proper narrow scope checks. The SDK guide contains legacy examples; canonical APS docs and actual stale-etag behavior are the basis.
- CLI0.1.64 does not accept the older guide's `--llm real`; real mode is default when logged in. Commands were adjusted accordingly. Private installation required a cut immutable version; working-draft-only install failed. Neither workaround published the App.
- Local harness and production iframe showed different essay lists. Do not promise their buckets are interchangeable or auto-migrate them; ask Anna about the mapping.
- Browser automation initially failed, then recovered in a later session. Latest beta.4 private upgrade/data preservation, real Chinese review and single-essay soft deletion are now verified. Full restart/reinstall, rollback, physical purge and cross-account checks remain unknown. No bypass or public release was used.
- `review/screenshots/*-real-anna.jpg` are cropped real-host English/Chinese captures. The two `*-simulated.png` files are separately labelled simulated layout evidence.

## Three remaining actionable findings

1. **Authorization and live lifecycle testing.** Source: real-host evidence, owner response that no second adult account is available, failed browser capture. Close with two-account ownership/replay/logout tests, real two-window conflict, full restart/reinstall, rollback and exhaustive keyboard/size audit. Latest private install, upgrade preservation, real single-essay soft deletion and Chinese feedback are resolved; do not reopen them as unknown.
2. **Storage, encryption and permanent deletion guarantees.** Source: official APS soft-delete/TTL reference and legacy SDK examples. Close with Anna's written clarification on bucket identity, at-rest/key recovery, retention/backup purge, and a tested export/restore/rollback procedure. No restore/import exists in this first candidate. No zero-retention or hard-purge promise.
3. **Uncertain billable-request recovery/cancellation.** Source: inspected completion contract and conservative pending marker. Close with supported idempotency/status/cancellation semantics and tests for timeout/window closure/retries/charging. Until then orphaned calls remain blocked and stop-displaying is not described as a provider cancel.

These identity/privacy/runtime decisions require owner/platform review before a real-data pilot or review submission. Prepared forum questions are not posted. Review approval and eligibility have not been inferred from build/test success.

## Beta.5 delta

Latest candidate beta.5 adds only terminal-error cleanup: known quota/not-granted/invalid-request errors unlock a settled attempt even when the SDK rejects its Promise. Unknown provider/transport errors remain conservatively pending. The browser test covers that SDK rejection shape, manual retry and the separate timeout lock. All296 unit/integration checks, browser workflow, typecheck/lint and strict validation pass locally. The private console installation was confirmed; the later November16 section records successful fresh beta.5 launch and data reread. Full source commit11bf36d CI, browser/integration and all5 desktop builds passed; latest source checks are recorded in PR #14 and local loop-state.

## Beta.6 startup update

The owner reported a red entry error. After a fresh beta.5 open and the owner’s explicit eligibility confirmation, real APS entry succeeded: the498-character fictional draft, two versions and both language-specific saved reviews were reread without another AI call. The earlier red error was not captured and its exact cause remains unknown. The official SDK source shows handshake-time URL credentials and refresh listeners/heartbeat only after connect, making delayed connection a plausible failure mode rather than a proven diagnosis. Beta.6 establishes the SDK session on load; storage/AI remain behind the adult gate. New browser assertions verify an early handshake with zero pre-gate storage/model activity and bilingual startup-specific handling of a rejected connection. Beta.6 private installation/live acceptance is recorded separately when performed.

Private beta.6 was uploaded and cut as immutable version2366, still draft/unpublished. Browser control timed out and then failed to attach twice; three failed control attempts were stopped. Console installation, real beta.6 entry and a long-wait-at-gate test remain pending. No additional AI call was made.
