# Install, configure, update and roll back

This is a **test candidate**, not an App Store release. Use fictional essays only until the validation blockers in VALIDATION.md are closed. A browser double-click on index.html is not an Anna installation: the signed host SDK must be present.

## For a first-time reviewer

1. Unzip `truedraft-anna-0.1.0-beta.2-test.zip` into its own folder. Keep the original TrueDraft application and database unchanged.
2. Install Node 22 LTS and Astral uv from their official sources. In this folder run `npm ci` to install the pinned official Anna CLI (0.1.64).
3. Run `npm run validate`. No login, upload or review submission occurs.
4. Run `npm run dev` for a local host check. The default legacy in-memory store **must be rejected** with `aps_required`. This is a safety check, not a working persistence demo. Its AI is disabled and it cannot consume tokens.
5. For a real test, an eligible adult owner must activate developer access, choose their public handle and accept Developer Terms themselves. The owner must separately authorize a **private developer test App/draft** and CLI device-flow login. Neither publishing nor review submission is needed for preparation, and neither is automated here.
6. In this folder run `npx anna-app login --host https://anna.partners`. Approve the displayed device-flow in your browser only after reviewing its access. Never paste the resulting PAT into chat, manifests or source. The CLI manages credential files; its docs describe differing legacy locations, so use `anna-app whoami` rather than reading files manually.
7. With an owned private App identity configured per the current CLI documentation, run `npm run dev:real`. Inspect `npx anna-app dev --help` for your installed CLI's account/slug selection flags; use the owner's actual test App slug, not a fabricated numeric user ID. **This uses real Credits/BYOK.** Pass the real APS storage mode; do not weaken the CAS probe to make legacy mode pass.
8. Confirm the in-app adult requirement. Load the explicitly fictional garden example. Save without AI, reopen, select feedback language, check the AI-processing explanation and analyze once. See review/REVIEW.md for the complete checklist.
9. Platform installation testing requires the developer console's private test-install workflow and a valid static bundle. Upload only `bundle/`, plus `manifest.json` and listing metadata as directed by the current console; the ZIP is a handoff package, not a claimed special Anna installer format. No custom `.anna` installer extension is invented here. **Do not select Publish, Release or Submit for review without owner instruction.**

## Updates and backups

- Export all test essays before upgrading; export includes the full row with all versions/feedback. Keep exports securely outside the public repository.
- Preserve the **same App identity**, APS namespace and schema 1. This candidate makes no database schema changes. A new App identity has a different isolated bucket and is not a data migration.
- Rebuild the bundle and validate; the owner uploads a new private test version following official SemVer rules. Close old windows, reopen, and verify all versions/feedback and conflict handling. Never overwrite the desktop `.env`, SQLite database or encryption keys.
- If a future schema change is needed, first implement import/export, a copy-on-write migration with verification, and rollback tests on synthetic data. This version deliberately has no silent migration or restore/import feature.
- Rollback: restore the prior static bundle under the same App identity **only if schema-compatible**; compare exported records before resuming writes. Backups cannot currently be restored from this UI; request Anna-supported recovery or implement/test an explicit import before relying on it. A fully verified restore/rollback is a release blocker.

## Uninstall and credential cleanup

Export first. Use in-app delete-one/delete-all to soft-delete active App rows if desired; uninstall is separate and does not prove a purge. Uninstall/disable the private test App in Anna, stop the local harness with Ctrl+C, and revoke the CLI developer PAT through Anna's developer-token controls when testing ends. Revoke rather than merely deleting a local file. Ask Anna for permanent deletion/backup handling; this candidate cannot verify it.

The install package includes no secrets and no real student content. Standalone TrueDraft remains independently available and unchanged.
