# Quality and evidence

TrueDraft publishes a small, reproducible regression suite at `/quality`, also available in the public interactive preview. Every input is fictional. The report measures deterministic application behavior, **not live AI accuracy, admissions outcomes, or independent certification**.

## Reproduce

With the Node version in `.nvmrc` and `npm ci`:

```bash
npm run quality:report
npm run quality:check
```

The first command exercises production helpers and writes `src/content/quality-report.json`. The second recomputes the result and fails if the committed report differs or a required check fails. CI runs it on changes. The report includes expected and observed outputs and a SHA-256 digest of the suite and relevant source files. It has no API calls, provider credentials, student data, or hand-entered pass counts.

## What the fixtures test

- Real, missing and punctuation-normalized quotations in English and Chinese; mapping a quote back to source characters and its paragraph.
- Detection of explicit English/Chinese admission promises and one explicit ghostwriting compliance phrase.
- English/Chinese prose-language heuristics, alternative count/length limits, and translation mode's lack of alternatives.
- No inferred group with missing admission data, and the below-15% Reach rule.
- Shared statement deduplication, writing-stage dependencies, and day plans that stay inside saved work availability.

The adversarial examples deliberately contain fabricated quotations or unacceptable promises. Passing those fixtures means the relevant check caught the supplied bad example; it does not mean a model produced good feedback. The full input, expectation and observation are visible in each result.

## What these results do not establish

Pattern checks cannot establish that advice is wise, helpful, free of invented personal facts, or linguistically nuanced. A fixture language check is not a Chinese quality review. A small finite suite cannot establish that every adversarial input will be caught. No claim is made about admissions success or user satisfaction.

For actual provider evaluation, use `npm run eval:ai` as described in [AI_EVALUATION.md](AI_EVALUATION.md). Inspect full English and Chinese responses with an educator/native speaker. Do not label mock-provider runs as live results. A fresh provider result must record the model and prompt/schema versions, date, raw fictional responses, checks, failures and human-review status. This release does not publish a live-provider score: no live provider was configured for this work.

## Real-world validation

Use [USER_TESTING.md](USER_TESTING.md) for a small formative study. Recruitment and observation have not been performed by this change. Publish results only after participants consent and actual observations exist. Five participants can reveal usability problems; they cannot establish population-level success rates.
