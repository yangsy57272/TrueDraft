# TrueDraft 0.2.0 — A clearer next step

- Try a bilingual, no-account interactive demo with a complete fictional application case. Add/remove colleges, inspect grouping reasons, handle sample tasks, trace an essay quote and compare an illustrative revision.
- The application action centre now selects up to three ready steps within work minutes already allocated for today, shows writing dependencies, and identifies shared statements that support multiple schools.
- School pages bring grouping inputs, source periods and missing assessments together. Essay passage feedback can be traced to source paragraphs and character locations; normalized quote selection works with smart punctuation and whitespace.
- Public quality fixtures expose expected/observed results and a reproducible source digest. These are deterministic regression checks, not a live-model score or user-study result.
- Public preview hosting, English/Chinese introductions, desktop backup guidance and an anonymous formative user-test protocol make trying and evaluating the project easier.

## Installing and updating

Choose the release package matching your system: Windows x64, macOS arm64/x64, or Linux arm64/x64. Runtime and reference data are bundled. See `docs/DESKTOP.md` for platform requirements, unsigned-package information, stopping the app and optional AI configuration.

Before updating an existing installation, stop TrueDraft and back up its complete data directory, including `truedraft.sqlite`, `settings.json` and any encrypted AI settings. Keep the decryption settings with the database and do not share them. Replace the application with the new package; retain the existing data directory. Reinstalling uses that directory. Do not open the same profile in two versions at once. This release adds no database schema migration.

After installing: try the fictional demo, create a workspace with your own draft, and open My list → Application action centre to plan your next step. AI remains optional. Cloud-provider access and charges are separate; the demo requires neither.

## Evidence and limits

Release binaries are built and smoke-tested on each supported platform by the Desktop packages workflow, including a restart preserving existing data. See the exact tag's Actions run for its result. No independent educator review, live-model quality measurement or real-user study is claimed. Read `docs/QUALITY.md` and `docs/USER_TESTING.md` for methods and remaining validation.
