# Draft — TrueDraft adult essay-review App: APS, identity and completion lifecycle

Hi Anna developer team,

I’m adapting TrueDraft into a focused essay-review App for adult applicants. Users enter their own prompt and draft, confirm AI processing, receive structured feedback and revision priorities, revise the essay themselves, and save versions. The App does not write replacement essays, invent experiences or predict admissions.

The test candidate uses a schema-4 static App UI with no Executa or external backend. It calls `llm.complete` and own-App APS through AnnaAppRuntime. It ignores chat history and entry payloads, sends a best-effort redacted draft only after consent, validates the returned JSON, and associates feedback with the saved version. Writes use etags; a startup probe refuses legacy storage that ignores `if_match`. Existing standalone SQLite data is kept separate. Tests use fictional essays.

I understand approval depends on the complete App submitted for review. Before a real-data pilot, could you help clarify these specific points?

1. Is own-App APS consistently scoped to the authenticated user and stable App identity across windows, devices, App upgrades and reinstall? We successfully installed private cut versions; working-draft-only installation returned “App has no published version available.” Is cutting a private version the intended requirement? The real-APS local harness also showed a different essay list from the production iframe; please clarify the development-to-production bucket mapping.
2. Which runtime/dispatcher version guarantees APS `if_match` and TTL enforcement? The SDK page still describes legacy runtime_state storage while the canonical storage reference describes APS. Is there a reliable capability check beyond an intentional stale-etag probe?
3. APS documents soft deletion. What happens to the underlying row, backups and service logs after delete or TTL expiry? Is permanent purge available, what is its retention window, and how can a developer verify a deletion request?
4. For `llm.complete`, is there a supported request idempotency key, status lookup and provider cancellation API? After a client timeout or closed window, how should we safely recover a pending operation without duplicate charges? Does cancelling `llm.stream` stop generation and billing, and which SDK version guarantees that behavior?
5. For a stateless completion with explicit messages/systemPrompt, can you confirm no unrelated chat, agent or account context is added? How can users identify the actual provider and its applicable retention/training terms before transmitting an essay?
6. What are the supported export/backup/restore and at-rest encryption/key-recovery guarantees for own-App APS? How should we test upgrade rollback without risking saved versions?
7. The current Terms require age 18 or the higher local age of majority and do not allow parental consent as a substitute. We restrict this candidate accordingly. Are any education-specific arrangements available separately, and what written confirmation would be required before considering minors or minors’ essays? We are not treating an adviser account as an exemption.

Isabel also clarified that the program runs through March 31, 2027; the 70% share concerns eligible usage profit after model API costs; and qualifying BYOK usage may count toward Qualified MAU without paid Token usage revenue share. We will keep these distinctions clear and avoid promising funding or zero retention.

Thank you for helping us make the implementation and its user-facing explanations accurate.

Best,
Wendy
