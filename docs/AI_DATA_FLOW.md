# AI data flow

This document describes exactly what happens when a student asks TrueDraft for AI feedback. It reflects the code in `src/server/ai/` and `src/app/api/essays/[id]/ai/[kind]/route.ts`.

## 1. Before anything is sent

1. **Authentication.** The request must carry a valid session cookie. The essay must belong to that account; otherwise the API returns 404.
2. **Configuration.** If no provider is configured, the API returns `ai_not_configured` and nothing is sent.
3. **Consent.** The account must have an active `ai_processing` consent for the *current* `PRIVACY_POLICY_VERSION`. Otherwise the API returns `consent_required` and the UI shows the consent dialog. The dialog states what is sent, links to the Privacy Center, and offers “Save without AI analysis”.
4. **Rate limits.** Per-student hourly and daily limits (Postgres-backed, so they hold across instances).
5. **Version pinning.** For full feedback, word-count, and final read-through, the current editor text is saved as an immutable version first (unless identical to the latest one), so feedback always refers to a specific version.

## 2. What is sent

| Sent (only for the tool requested) | Never sent |
|---|---|
| Essay prompt and application type | Email address, display name, account id |
| The draft — or, for Sentence Feedback, only the selected passage plus its paragraph | Other essays or earlier feedback |
| Optional context notes the student wrote | Consent records, settings, IP addresses |
| Word limit, server-computed word count, focus areas, feedback language | Anything from the browser (cookies, device data) |
| For Brainstorming Coach: the current, unsaved conversation | |
| Operator-approved reference guidance (only if an admin enabled retrieval for a resource — none by default) | |

### Redaction

Before sending, `src/server/redact.ts` replaces obvious direct identifiers in **the copy that is sent**: email addresses, URLs, Chinese resident ID numbers, US SSNs, passport-style numbers, Chinese mobile numbers, international phone numbers, and long account-like digit runs. The saved original is never altered. The number of replacements is stored with the feedback run and shown to the student. Automated redaction is imperfect, and the UI says so.

### Prompt structure

- **System prompt** (`src/server/ai/prompts.ts`, versioned as `PROMPT_VERSION`): the ethical coaching rules from the product spec, tool-specific instructions, and language rules. It never contains student content.
- **User message**: student material wrapped in tagged blocks (`<student_essay>`, `<essay_prompt>`, …). Any tag-like text inside student content that could close those blocks is neutralised. The message ends by restating that everything inside the tags is data.

## 3. At the provider

- Requests use the provider's **structured output** mode with a strict JSON schema (`src/server/ai/schemas.ts`). Claude requests use `output_config.format` and a moderate `effort`. Current Claude models do not accept `temperature`. OpenAI-compatible requests use `response_format: json_schema` with `strict: true` and a low temperature.
- Requests stream so the UI can show real progress stages, based on which sections of the structured response have started arriving.
- Timeout `AI_TIMEOUT_MS`; at most `AI_MAX_RETRIES` retries, and only for retryable failures (network, 5xx, 429, timeout).
- **Provider-side retention and training are governed by the operator's provider account and contract, not by this code.** The Privacy Center only says “not used for training by the provider” when the operator sets `AI_PROVIDER_NO_TRAINING_CONFIRMED=true`, and it shows the operator's own retention note.

## 4. After the response

1. JSON is parsed and validated with Zod. Text fields are length-capped and lists are capped, so no single field can hold an essay.
2. Guardrails (`src/server/ai/guard.ts`):
   - Quotes are matched against the draft. Unmatched quotes are flagged as “could not be found in your draft”.
   - Sentence alternatives longer than about twice the selected passage are discarded, and translation requests return no alternatives.
   - Word counts come from the server, never from the model.
3. The result is encrypted (AES-256-GCM, purpose-bound) and stored in `feedback_run`. Each run records the provider, model, prompt version, schema version, provider message id, redaction count, status, and timestamps.
4. **On any failure** (invalid output, refusal, truncation, outage, or timeout), the run is marked `failed` with an error code and the student sees a plain-language error. No placeholder or fabricated feedback is ever shown. The development `mock` provider is the one exception, and every mock result is labelled as placeholder text.

## 5. What TrueDraft does *not* do with essays or feedback

There is no code path that uses essays or feedback for training, fine-tuning, evaluation datasets, examples, marketing, human review, or advertising. Logs contain only allow-listed identifiers and enums (`src/server/logger.ts`). The analytics boundary (`src/server/analytics.ts`) accepts only enumerated properties and ships with no sink. The admin dashboard shows only counts.

## 6. Deletion

- Deleting feedback removes its rows.
- Deleting an essay cascades to its versions, feedback runs, and brainstorming notes.
- Deleting an account cascades to everything above, plus sessions, consents, and settings. Audit events remain without a user link and never contained essay content.
- Retention preferences purge essays not edited within the chosen period. This runs on dashboard load, when the setting changes, and via the scheduled job (`npm run retention:run` or `POST /api/cron/retention`).
- Data in database backups expires according to the backup schedule (see the deployment doc).
