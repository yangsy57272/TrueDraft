# Real Anna test evidence — 2026-11-15

The owner explicitly authorized a private test App and official CLI device-flow login, personally completed developer activation/Terms and approved the device authorization. Credential contents were not read or committed. All submitted text was explicitly fictional.

## Installation and actual AI

- App slug `truedraft-review`, schema-4 static UI. Server state remains `draft`, `is_published:false`; no release or review submission. Beta.1–beta.4 were privately cut; beta.1, beta.2 and **beta.4** installation was observed. Beta.3 was not separately installed.
- Working-draft-only install initially failed. Cutting an immutable private version made owner installation work; this did not publish the App.
- The real host's APS startup probe passes and rejects an intentional bad etag. The local dev bridge wrapped HTTP412 differently; normalization was corrected and covered by a contract test.
- **Call1**, official real-LLM harness: `google/gemini-3-flash-preview`,2,121 input/1,804 output tokens. Its schema-shaped data envelope was initially rejected. No fake result was shown. The adapter now recognizes only the exact two-key data envelope, then validates the same complete feedback schema; a JSON Schema itself still fails.
- **Call2**, installed production beta.2: valid English feedback saved for version1. Model `google/gemini-3-flash-preview`;2,150 input/1,874 output/4,024 total tokens,0 reasoning. First priority “Deepen the Internal Shift”, with3 revision tasks. These are returned tokens, not a verified dollar bill.
- **Call3**, installed production beta.4: valid Chinese feedback saved for version2. Same returned model;2,190 input/2,116 output/4,306 total tokens,0 reasoning. First priority “深化‘倾听’过程中的心理转变”, with4 revision tasks. No automatic paid retries were used.

## Persistence, upgrade, export and deletion

1. Original fictional draft saved without AI. A manual fictional revision was saved as version2, without changing version1 or its feedback. The first-version feedback was correctly marked stale.
2. Closed the real App window and reopened it. “Open selected” read the498-character revised draft and preserved the original review.
3. Upgraded the same private App from beta.2 to beta.4. The two versions and original review remained accessible. Latest UI shows human-readable essay titles/dates and the current saved-version selection. Feedback order stays overview → first priority → revision checklist after persisted JSON key reordering.
4. Downloaded actual JSON exports into the owner's Downloads folder. Final export contains1 explicitly fictional essay,2 versions and2 reviews: English linked to version1, Chinese linked to version2. Every review's versionId matches an exported version. Tokens/models are included; session tokens/API keys are not. Exports remain local and are not committed.
5. Created a separate **FICTIONAL DELETION TEST — disposable validation record**, saved it without AI, then deleted that record only using the App's explicit confirmation. Anna returned soft-deletion completion; active list count returned to1, the disposable title disappeared, and the original two-version example reopened successfully. This is active-read/soft-delete evidence, not proof of physical purge or backup erasure.
6. Changing the interface/feedback selectors back to English showed the actual stored first-version English review; changing back to Chinese showed the current second-version Chinese review without another analysis call.

## Screenshots

- `screenshots/zh-real-anna.jpg`: cropped capture of the real installed beta.4 iframe with actual saved Chinese feedback on fictional input.
- `screenshots/en-real-anna.jpg`: real beta.4 iframe showing the stored English review and its older-version status.
- Captures exclude account chrome, session URLs and tokens. The two `*-simulated.png` files remain separately labelled layout-test artifacts.

## Remaining limits

- Owner confirmed no second eligible adult account is available. Actual two-account ownership/replay/logout tests are not verified.
- Full managed-host restart, uninstall/reinstall retention, backup import/restore, rollback and physical deletion are not proven by window reopen or upgrade.
- Live concurrent-window editing, quota/refusal/outage, timeout/cancellation/charging recovery need additional controlled tests. Simulated tests and the real stale-etag probe do not replace all of them.
- The local real-APS harness and production iframe showed different essay lists. Confirm scope/identity mapping; no automatic migration/equivalence is claimed.
- Earlier browser automation timed out/reset and native capture failed; a later session recovered and completed the beta.4 upgrade, soft deletion and real screenshots. Those completed items are resolved, not current blockers.
- No real-student essay, minor pilot, public release, review submission, forum post or email was used.

## Beta.5 terminal-error fix

Beta.5 distinguishes definitive quota/not-granted/invalid-request rejections from uncertain transport failure. The browser contract test now rejects the Promise like the SDK instead of only returning an error object. It proves a known quota rejection releases this attempt’s marker for a later manual retry, while the simulated timeout retains its marker and prevents another call. No automatic paid retry was introduced. Official strict validation, TypeScript/lint, the browser workflow and296 unit/integration checks pass.

The console confirmed private beta.5 installation. Anna initially restored the already-open beta.4 window; a fresh beta.5 runtime/data check is pending manual close/reopen because three automation close attempts did not work. The owner was asked to perform that small UI action. The beta.4 live AI/upgrade/export/deletion evidence above remains valid.

## November16 beta.5 reopen evidence and beta.6 change

The owner clarified that the earlier closure was of browser tabs. After the owner manually closed the in-page TrueDraft floating window, reopening from Apps loaded the beta.5 path. After the owner explicitly confirmed age eligibility, fresh entry succeeded and reread the fictional498-character second draft, both saved versions and the English/version1 and Chinese/version2 reviews. The old-window restoration blocker is resolved; no fourth automatic close attempt was used. The reported prior red entry error was not captured, so its precise cause is unknown.

The public official SDK source was inspected: connect reads the URL credential, installs auth.refresh handling, completes window.hello and starts the ready heartbeat. Waiting until entry to call connect risks missing host refresh events. Beta.6 moves that host handshake to page load without essay storage or AI before adult acknowledgement, and adds a bilingual startup-specific error. This is a defensive startup correction, not a claim that the original error code was proven. Browser checks verify both early handshake/gate separation and rejected-startup messages; private beta.6 acceptance is pending until recorded.

Private beta.6 cut succeeded (version2366), with3 static bundle files and draft status. The subsequent console tab creation timed out and two tab attachments failed; no further attempts were made. Beta.6 console installation, actual entry and extended gate-wait validation remain pending. No new AI calls or paid retries were used.
