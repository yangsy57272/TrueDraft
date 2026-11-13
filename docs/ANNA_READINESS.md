# Anna opportunity: readiness assessment (2026-11-13)

This is an implementation recommendation and a record of open questions, not platform approval or a deployment. Isabel's latest email clarifies the commercial scope but does not pre-approve TrueDraft's architecture or student-data handling. No Anna App, public forum post or real-student upload was created in this task.

## Current constraints

- The [published program rules](https://forum.anna.partners/t/turn-your-ai-agents-apps-into-recurring-monthly-grants-join-the-anna-ai-os-founding-builder-program-up-to-80k-month-pool/205) show a qualification window ending **March 31, 2027**. November 30 is not the final participation deadline. Qualification requires an approved, published, functioning App and verified qualifying usage; a proposal alone does not earn a grant.
- The [Terms](https://anna.partners/legal/terms), especially eligibility and no-minor provisions, require users to be at least 18 or their jurisdiction's higher age of majority. Parental consent is not a substitute. A high-school applicant audience cannot automatically become an Anna audience. An adult adviser account is not a confirmed workaround for processing minors' personal data.
- The [Privacy Policy](https://anna.partners/legal/privacy) contains an Anna no-model-weight-training commitment while allowing certain service-context retention and third-party model processing/retention. It does not establish zero retention for every selected provider or a school-specific student-data agreement. Exact retention, deletion/purge behavior, model-provider terms and any treatment of minors' data require confirmation before a real-data pilot.
- Isabel's email says the 70% share is of eligible usage profit after applicable model API costs, rather than 70% of gross payments. It also says qualifying BYOK can count toward Qualified MAU without producing the paid Token usage revenue share. Treat that email clarification separately from any broader marketing headline; verify the applicable contract/rules before forecasting income.

## Recommended first scope — an inference from the code and docs

Build a separate **adult-applicant essay review** pilot using fictional examples first. Reuse TrueDraft's versioned coaching prompts, structured schemas, redaction and quotation guards, rubric and revision workflow. Keep the desktop product, school catalog and scheduler available through their current distribution. Do not migrate the entire application or upload existing applicants' databases as a first step.

The [Node.js Executa quickstart](https://anna.partners/developers/tools/executa-nodejs.md) documents a JSON-lines CLI and platform Node 22 support, which aligns with TrueDraft's runtime. This makes reuse plausible; it does not mean the existing Next.js desktop server is already an Anna App.

[Sampling](https://anna.partners/developers/tools/executa-sampling.md) lets a v2 plugin ask the host for an LLM completion with host-managed provider choice and charging. Evaluate a separate provider adapter against synthetic structured-feedback fixtures. Test schema failures, streamed progress, cancellation/timeouts and quota/charging behavior before replacing any existing provider. BYOK need not be the only path.

For a small pilot, assess [APS](https://anna.partners/developers/tools/executa-storage.md) instead of assuming a bundled SQLite file is durable and isolated in every host environment. Its documented scopes distinguish per-user tool state from broader user storage and app-context storage. Prefer the narrowest supported scope. APS delete methods are documented as soft deletes; do not promise immediate irreversible deletion without purge/retention confirmation.

If a hosted TrueDraft backend is retained, authentication must use a platform-supported verified identity flow. A browser-provided user ID is insufficient. The desktop single-owner bootstrap identity must never be reused as a shared multi-user Anna login. External-backend identity attestation, session scope, persistence and multi-user isolation remain unresolved integration questions.

## Concrete next steps

1. Prepare a synthetic review demonstration: one draft, feedback, revision checklist and clear loading/error states. Run existing redaction/schema/quote-grounding tests through a prototype host adapter.
2. Ask the developer team which verified identity/persistence path they recommend for an App invoking a Node Executa tool or external backend. Confirm app/tool/user storage scopes and restart behavior.
3. Obtain explicit answers on audience eligibility, third-party model retention/training controls, hard-deletion lifecycle and whether a student-data agreement is available. Do not market under-18 availability or provider-wide zero retention meanwhile.
4. Test two adult test accounts for isolation, export and deletion using synthetic content. Review user-facing age/consent/retention language for the Anna-specific product.
5. Submit the complete pilot for review only after those checks. Track actual meaningful successful usage; grants and revenue are conditional outcomes, not a funding guarantee.

Posting architecture in the developer forum, sending another email, connecting an Anna account or submitting/publishing the pilot requires a separate explicit instruction. This document supplies a reviewable plan without performing those external actions.
