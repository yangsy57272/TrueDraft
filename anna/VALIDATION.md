# Implementation and validation snapshot

2026-11-15 · base GitHub main `d4a65514b3baca0268979846c8acde9b15e905f7` · candidate `0.1.0-beta.2`.

**Status: local test candidate, not submission-ready.** Code/package preparation is implemented; actual Anna installation, hosted AI, platform isolation, lifecycle persistence and purge are not yet proven. Do not describe a build, fixture or validator pass as approval or real AI success.

## Baseline and preservation

- Original worktree: `codex/sqlite-windows` at `5437300`, existing dirty user changes preserved. No reset, stash, overwrite or real-data migration.
- Clean release worktree: `codex/admission-fit-budget` at `6fe6839`; standalone source equivalent to merged main. Separate new worktree/branch `TrueDraft-anna` / `codex/anna-essay-review` from main.
- Main exact-commit [CI](https://github.com/yangsy57272/TrueDraft/actions/runs/43653775148) and [desktop packaging](https://github.com/yangsy57272/TrueDraft/actions/runs/43653780951) were successful. Published standalone remains desktop-v0.1.9; candidate is separate.
- Open issue #9 concerns email notifications, outside this adapter. No open PR at baseline. Prior `docs/ANNA_READINESS.md` was an assessment, not an adapter; no other Anna implementation discovered in the inspected project/Downloads paths.
- No real `.env`, API key, essay database, encryption key or desktop application replaced. The test code uses disposable simulated data.

## Scope matrix

| Requirement | Before | Candidate change / basis | Evidence and remaining acceptance |
|---|---|---|---|
| Adult audience | Needs adaptation | Adult-only introduction and gate, no parental-consent bypass; official Terms | Gate blocks storage/AI in browser test. Self-attestation only, real eligible-adult pilot/access review pending |
| App structure | New | Schema-4 static App UI; no Executa/Skill/backend needed per official manifest | Official CLI 0.1.64 strict validation passed; actual private test-install pending |
| Structured feedback | Implemented, reusable | Existing prompts/schema/redaction/quote guard, 4k/20k input limits, original student text retained | Unit tests and simulated browser pass; real host completion not executed |
| Hosted AI | Needs adaptation | `llm.complete`, maxTokens4096, 10-minute timeout, no key UI | Official interface verified; live model response/usage/refusal/timeout require test permission and eligible account |
| Identity/ownership | Needs adaptation | Host-signed SDK, own-App APS only, no supplied user ID or standalone bootstrap | Simulated bucket isolation passes; **real two-user get/set/delete/export, logout/expiry/replay unverified** |
| Storage | Needs adaptation | APS instead of copying standalone SQLite; CAS probe, version rows, TTL | Simulated reopen/conflict tests pass; real restart/reinstall/upgrade/restore/at-rest encryption unknown |
| Versions | Implemented, reusable concept | Immutable version IDs, feedback references, stale marker, copy-old-version | Browser version association/conflict tests pass |
| Consent/privacy | Needs adaptation | Separate save-without-AI and per-input AI confirmation; precise data flow, no-training/retention qualifications | Browser consent reset/no-AI-save pass; actual host-injected context/provider choices require platform confirmation |
| Export/delete | Needs adaptation | Complete active-row JSON; etag delete-one/all, explicit soft-delete limitation | Browser export/version/deletion pass; permanent purge and backup retention unknown |
| Retention | Needs adaptation | Row-wide30/90/365-day APS TTL on latest write | Payload verified; actual Anna GC/hard purge unverified, no local scheduler assumed |
| Keys | Needs adaptation | No external credentials or application encryption key in static bundle; no standalone decrypt/migration | Allowlist package includes no env/DB/PAT. Platform-managed at-rest/key policies need owner acceptance |
| Costs | Needs adaptation | Platform Credits/optional BYOK, actual returned tokens only | No dollar bill invented; live debits unverified. Email net-profit/MAU claims labelled separately |
| Duplicate/failure handling | New | UI lock + CAS pending marker + result reuse; malformed/refused/truncated output rejected; discard display | Simulated duplicate/discard/quota/timeout guard passes. **Uncertain-timeout recovery and provider cancellation remain unresolved** |
| Bilingual/responsive | Needs adaptation | English/Chinese interface, 3 feedback-language choices, labels, status, focus outline | Browser360×640/1000×720 checks and fictional screenshots; real host CSP/export/keyboard audit pending |
| Standalone core | Implemented, reusable | No production standalone source/database behavior changed | 296 unit/integration checks passed (288 prior +8 adapter); exact-branch CI/build/e2e reported separately once run |

## Observed checks

- `node anna/build.mjs`: static bundle built. Explicit bundle allowlist; generated code contains reused schemas/prompts, no configured secrets or real documents.
- Official `anna-app validate --manifest anna/manifest.json --bundle anna/bundle --strict`: passed (CLI0.1.64, schema dispatcher0.33.0).
- TypeScript and source lint: checked; generated bundle excluded from lint because it is compiler output, source remains checked.
- 296 unit/integration tests passed. The8 adapter tests cover malformed inputs/output, redaction, quote grounding, simulated isolation, optimistic conflicts and legacy-backend refusal.
- Browser workflow uses an isolated Chrome context and **simulated host**: adult gate/no storage before confirmation; save/no AI; reload/reopen; double-click dedupe; consent reset; version linkage/stale feedback; two-window conflict preserving text; full JSON export; Chinese/narrow layout; soft deletion; discarded output; quota error; uncertain-timeout retry prevention. Screenshots are explicitly simulated.
- Official local dev harness successfully started on localhost:5180 with `--no-llm` after one initial cold-download startup timeout. Its default legacy store is not accepted by this App. This proves harness startup only, not persistence or live AI.

## Three current blockers (with closing conditions)

1. **Real host installation/AI/account lifecycle.** Developer console initially required activation; owner completed it during preparation. No App existed. Private App draft creation and CLI credential authorization are beyond the stated local-only boundary and require owner decision. Close by authorizing a private fictional-data test identity, real APS + hosted call, validation of failure/usage, and two eligible adult accounts with ownership/logout/expiry checks. Do not publish or submit for review during this test.
2. **Durability/deletion/encryption/restore guarantees.** Source: official APS API documents soft delete and TTL, SDK still shows legacy examples. Close with platform response and live close/restart/upgrade/reinstall tests, a verified recovery/backup/rollback procedure, and accurate final privacy text. No claim of permanent purge or E2EE.
3. **Provider cancellation and uncertain paid-request recovery.** Source: official non-streaming completion API lacks a verified idempotency/status/cancel contract in the inspected reference. Candidate conservatively blocks orphaned retries. Close with a platform-supported recovery/cancel strategy plus tests for timeout, window closure and cross-window duplicate charging. Real streaming progress is also unverified; elapsed time is shown honestly.

Architecture, identity, encryption posture and hosting decisions require owner review. No real-data pilot or minor testing until these concerns are resolved. The forum consultation is prepared, not posted.
