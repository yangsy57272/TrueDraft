# Architecture, identity and data handling

Verified against official public docs on 2026-11-15; fetched source copies were kept only in ignored `tmp/anna-docs`. Statements below distinguish documented contracts from observed tests.

## Decision

Use a **schema-4 bundle-only Anna App**, one responsive static SPA, no Executa and no Skill. The official manifest permits empty Executa arrays for UI-only apps. Host `llm.complete` and own-app APS are sufficient; a Skill or Node process would add an unnecessary installation/identity/storage boundary. Existing Next.js routes, cookies, desktop bootstrap login and SQLite are not uploaded. Pure existing coaching prompts, JSON schemas, redaction and quote-grounding functions are bundled from source.

```
Adult confirmation → static iframe → AnnaAppRuntime signed-window bridge
                                      ├── storage.* → per-(Anna user, App) APS
Consent for exact prompt/draft         └── llm.complete → Anna selected provider
                                      ← validate JSON → ground quotes → save feedback
```

The developer must confirm APS and billing behavior in the actual target host. This is an implementation decision, not platform architectural approval.

## Storage options considered

| Option | Reuse / operating conditions | Decision |
|---|---|---|
| Existing Next.js + SQLite backend | Reuses services/encryption, but requires external hosting, independently verified Anna identity/session mapping and an owner-managed server | Not chosen for this bounded first App; no unverified shared bootstrap identity |
| Node Executa + SQLite | Possible process/native-runtime architecture, but needs platform-specific native distribution, durable per-user filesystem and stable encryption-key guarantees that are not established for this App | Preserve standalone SQLite; do not copy a real database or invent persistence guarantees |
| Static App UI + own-App APS | Official signed-user bridge, durable per-user/App rows, etags and TTL; real save/reopen/upgrade verified, purge/backup/at-rest guarantees still qualified | Chosen for new Anna-only records; this is not a migration of existing standalone data |

## Identity and access

No TrueDraft login, arbitrary user ID, token copying, app-wide service account or external HTTP backend. The official SDK's hello handshake binds the window token; host resolves the user and App. All storage calls omit `owner` and `scope`, selecting own-App per-user storage. No cross-App storage, third-party credentials, local-device tools or browser permissions are declared. Entry payload, host runtimeState and conversation context are ignored. There is no separate export/deletion endpoint with weaker authorization.

This relies on Anna's server-side authorization, not a UI-provided identity. Window token verification, replay handling, auth refresh/revocation and isolation must be tested on Anna with **two eligible adult accounts**. Simulated buckets are not evidence of real server enforcement. Lock reloads the frame and clears in-memory editor state; Anna sign-out/session expiration remains a host responsibility and must be tested. Default narrow scopes do not prevent all privileged developer/server access.

## Persistence and consistency

One random-UUID APS row per essay (`truedraft/v1/<uuid>`): schema version, 30/90/365-day retention, at most 30 saved versions, feedback linked to immutable version UUID + language, and in-flight analysis marker. Prompts ≤4,000 characters; drafts ≤20,000. APS quota/row caps may reject large histories; existing saved versions remain intact, editor remains visible, export is offered. No unbounded background autosave or silent history trimming.

Every existing-row write/delete supplies the last read etag. A startup probe intentionally uses a bad etag on a disposable 60-second row and requires `precondition_failed`; legacy last-writer-wins storage is refused. Focus rechecks etag; a stale editor never silently overwrites a saved record. New essays use cryptographically random identifiers. A failed save does not reset the editor. Content typed while save awaits remains in the editor.

The official APS contract says durable per-user storage across windows; **actual close/reopen and App upgrade preservation were verified; full host restart, reinstall and second-account isolation were not verified**. The local harness legacy backend is memory-only. Use `--storage aps` with real test auth for meaningful persistence checks. Keep the same registered App identity and `truedraft/v1/` namespace for updates. No existing SQLite or encrypted database is migrated or opened. No TrueDraft encryption key is introduced; this candidate uses platform-managed storage, **not standalone application-layer encryption or E2EE**. Platform at-rest encryption/key recovery must be confirmed before real-data pilot approval.

## AI and accidental usage

Only the selected version's redacted prompt/draft, feedback language, existing coaching instructions and response schema are sent. Redaction is best effort, not anonymization. No school selections, full account profile, chat history, host entry payload or other-App data is requested. Fixed `maxTokens:4096`, 10-minute client timeout, no automatic retry. Stateless host call; no agent session, tools or conversation context. Platform output caps, provider refusal, invalid JSON, missing categories and truncated output fail validation. Exact quotes are marked located/unlocated against the redacted version. Feedback contains advice/questions, not replacement essays; schema/prompt limits mitigate but cannot mathematically guarantee model behavior.

A local operation lock prevents double clicks. An etag-protected persistent pending marker prevents two open frames from dispatching the same essay concurrently. Stored results for the same version/language are reused. After a definite returned response, failures release the marker. A timeout/uncertain transport failure retains it rather than risking a second billable call; **there is not yet a platform-confirmed recovery/cancel protocol for such orphaned calls**. The owner must resolve the original call with Anna support before re-analysis. The UI still permits export and soft deletion. Known quota, not-granted and invalid-request errors release the pending marker even when the SDK rejects the Promise; unknown provider/transport failures conservatively remain pending.

`llm.complete` is non-streaming. UI shows actual elapsed time, not invented word counts; real streaming/cancellation is an open improvement. Stop-displaying discards the result when it arrives, retains the in-flight lock until settlement, and **does not promise provider cancellation/refund**. Closing the window cannot prove that generation/billing stopped. A result is only written after rereading the essay and verifying the pending operation UUID. Deleted rows are never recreated by a late response. Edits stay in the editor and old feedback is marked stale.

## Privacy, retention, export and deletion

Save transmits the original text to Anna APS even without AI. Analyze additionally transmits the redacted copy through Anna to its configured provider. TrueDraft operates no external backend/analytics here, logs no essay text and trains no model. Anna's Terms/Privacy promise no training of generative model weights while allowing purpose-limited context/security/billing/legal retention. Their provider restrictions are qualified; provider-specific training/retention remains variable. No zero-retention promise.

The selected TTL is reset on **each save/analysis write**, applies to the whole essay row including versions/feedback and depends on Anna's TTL/GC implementation. It is expiration, not verified physical erasure. No local background cleanup scheduler is assumed. APS deletion is documented soft deletion; active reads no longer see it, but hard purge, backups, telemetry and provider copies are outside this App's control. Export is local JSON containing all active rows/versions/feedback, not deleted/expired/platform logs; protect the downloaded file. Delete-one and delete-all App essays do not delete an Anna account, other apps, Anna backups or model-provider records. Contact Anna/provider for their rights-request process. Uninstall alone is not claimed to purge data. Recovery of soft-deleted/expired rows is not implemented by this App.

## Charging and program claims

No API key input is needed here. Host routes through Anna Credits or the user's optional platform BYOK settings. Usage is shown only if returned in the completion; never converted into a fabricated dollar bill. Model selection, quota and actual debits remain platform-owned. The App does not promise a particular model or a free entitlement.

**Email explanation supplied by owner:** program continues through 2027-03-31; approval concerns the complete submitted App; 70% applies to eligible usage profit after applicable model API costs; qualifying BYOK may count toward Qualified MAU but does not generate paid Token usage revenue share. These are not unconditional funding promises or independent legal verification of the revenue contract.

## Primary references

- [Developer Hub](https://anna.partners/developers/overview/welcome)
- [Manifest/schema 4](https://anna.partners/developers/apps/app-manifest.md)
- [Static UI and sizes](https://anna.partners/developers/apps/app-ui-manifest.md)
- [SDK handshake; note legacy-storage examples](https://anna.partners/developers/apps/app-ui-sdk.md)
- [Canonical APS API; CAS, TTL, soft delete](https://anna.partners/developers/reference/host-api-storage.md)
- [Managed LLM; quota/errors/non-streaming](https://anna.partners/developers/reference/host-api-llm.md)
- [CLI/dev harness](https://anna.partners/developers/reference/cli.md)
- [Real-LLM dev authentication](https://anna.partners/developers/apps/local-dev-llm.md)
- [Terms: eligibility and no-training covenant](https://anna.partners/legal/terms)
- [Privacy: retention and third parties](https://anna.partners/legal/privacy)
- [Developer Forum](https://forum.anna.partners/c/developers/5)

Current evidence and known limitations are in [VALIDATION.md](VALIDATION.md) and [review/LIVE-EVIDENCE.md](review/LIVE-EVIDENCE.md). The plain-language bilingual policy is [PRIVACY.md](PRIVACY.md).
