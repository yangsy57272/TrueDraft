# Review preparation — not submitted

## Listing copy

**English:** TrueDraft helps adult applicants revise their own application essays. Enter your prompt and draft, choose English, Chinese or bilingual feedback, review prioritized coaching, make your own changes and save versions. It does not write complete essays, invent personal experiences or predict admission. Anna's minimum age requirement applies. AI use follows your Anna Credits or optional platform BYOK settings.

**中文：** TrueDraft 帮助成年申请人自行修改申请文书。输入题目和自己的草稿，选择中英文反馈，查看修改优先级，自行修改并保存版本。不代写整篇文书、不编造个人经历、不预测录取。须符合 Anna 最低年龄要求。AI 使用遵循 Anna Credits 或平台可选 BYOK 配置。

## Permissions and services

No third-party credentials, cross-App storage, filesystem/terminal/browser access, microphone, camera or external backend. Own-App APS holds prompt/draft/versions/feedback. Stateless `llm.complete` uses the user's platform-configured provider only after per-draft consent. Installation generally makes host APIs available under Anna's policy; the app makes only the calls described in ARCHITECTURE.md. Do not describe this as a platform-enforced granular AI permission toggle.

## Fictional input

Prompt: **FICTIONAL EXAMPLE — Describe a moment when you learned to listen.**

Draft: **FICTIONAL EXAMPLE. At our imaginary community garden, I proposed moving every planter into one straight line. My teammate asked where the afternoon shade would fall. I had measured the paths but had never sat there after lunch. We spent an afternoon mapping the shadows together. I learned to ask what someone else had noticed before presenting my own plan. Now I begin meetings with a question and leave space for the answer.**

This is also available via “Load fictional example”. No real applicant document is bundled.

## Complete reviewer walkthrough

1. Install in a private test environment per INSTALL.md. Confirm eligible adult access; declining the age checkbox must block the workspace, storage and AI calls. This self-attestation aligns the product audience; it is not independently verified age assurance.
2. Load the fictional example. Save version without AI; confirm no AI usage. Close/reopen and check the text/version. Restart harness/host, then repeat. Use real APS for persistence testing.
3. Choose feedback language, read actual data/retention/fee explanation, confirm and analyze once. Observe elapsed progress, valid structured output and actual usage if supplied. Record model, version UUID, timestamp and terminal status without saving the raw prompt/token/session in logs.
4. Double-click Analyze; confirm only one billable request. Open another frame for the same essay; confirm the pending marker blocks a second request. Repeat after success to confirm cached feedback reuse for the same version/language.
5. Change the draft. Consent resets; feedback is marked stale. Save a new version; old feedback remains associated with the prior UUID. Restore by copying an older version into the editor and saving a new version.
6. Edit in two windows, save one and attempt to save the stale second copy. Expect conflict, no silent overwrite, and second-window text preserved.
7. Test quota denial, provider refusal, bad JSON, truncated output, provider outage, timeout and stop-displaying. No fake feedback. A timeout retains a pending marker; this unresolved recovery path must be addressed before unrestricted use. Stopping display does not promise cancellation/refund.
8. Export JSON; verify all active essays, versions and feedback association. Delete one and then all App essays; active reads must no longer return them. Label this soft deletion. Test late AI completion does not resurrect a deleted record. Hard purge requires separate platform evidence.
9. Test two adult Anna users: capture an essay UUID/key under A; under B try get/set/delete/export using that key and altered owner/scope/user parameters through supported test tooling. B must neither read nor alter A. Re-test after logout/token expiry. This step is **not satisfied** by the simulated unit test.
10. Test 360×640 and 1000×720 windows, long text scrolling, Tab focus, labels, keyboard selects/buttons and both languages. Check actual SDK/production CSP and export download in the sandbox.
11. Export; upgrade same App identity; reopen and compare; reinstall and compare; roll back compatible bundle and compare. Confirm platform persistence and restore instructions. No standalone database should be touched.

## Screenshots

`en-review-simulated.png` and `zh-narrow-simulated.png` are from the actual static UI with a **simulated host and explicitly labelled test feedback**. They are layout/flow evidence only. They do not prove live AI, installation, billing, isolation or approval. `en-real-anna.jpg` and `zh-real-anna.jpg` supplement them with cropped real beta.4 host captures and actual stored feedback on fictional text. See LIVE-EVIDENCE.md for the verified installation, upgrade, three explicit model calls and remaining limits.
