import "server-only";
import { CDS_FIELDS } from "@/lib/planning";
import { AiProviderError, type AiProvider, type StructuredRequest, type StructuredResponse } from "./provider";

/**
 * Development-only mock. It does NOT analyse the essay: every field says it is placeholder text,
 * and the UI labels mock runs prominently. It exists so the interface can be exercised without
 * AI credentials. Never enable AI_PROVIDER=mock in production.
 *
 * Test hooks (only inside the mock): include "[[mock:fail]]" or "[[mock:malformed]]" in a draft to
 * simulate provider failures.
 */
const M = "[Development mock — not real feedback]";

function firstWords(user: string, tag: string, count = 8) {
  const match = user.match(new RegExp(`<${tag}>\\n([\\s\\S]*?)\\n</${tag}>`));
  const body = match?.[1]?.trim() ?? "";
  return body.split(/\s+/).slice(0, count).join(" ");
}

function payloadFor(schemaName: string, user: string): unknown {
  const quote = firstWords(user, "student_essay") || firstWords(user, "selected_passage");
  switch (schemaName) {
    case "full_feedback":
      return {
        summary: `${M} This placeholder shows where an overall response would appear.`,
        strengths: [
          { point: `${M} A strength would be described here.`, evidence_quote: quote },
          { point: `${M} A second strength would be described here.`, evidence_quote: quote },
        ],
        primary_priority: { title: `${M} Most important revision`, explanation: `${M} An explanation would appear here.`, zh_note: null },
        prompt_alignment: { status: "unclear", explanation: `${M} Prompt alignment would be assessed here.` },
        categories: [
          "prompt_response",
          "specificity",
          "reflection",
          "structure_pacing",
          "clarity",
          "voice",
          "opening_ending",
          "concision",
        ].map((key, i) => ({
          key,
          label: (["strong_foundation", "developing", "needs_attention"] as const)[i % 3],
          explanation: `${M} Category explanation.`,
          next_step: `${M} One concrete next step.`,
          passage_quote: i === 0 ? quote : null,
          zh_note: null,
        })),
        passage_comments: [
          {
            quote,
            observation: `${M} What is happening in this passage.`,
            why_it_matters: `${M} Why it matters.`,
            revision_question: `${M} A question to help you revise?`,
            priority: "high",
            zh_note: null,
          },
        ],
        revision_plan: [
          { task: `${M} First revision task`, why: `${M} Reason.`, zh_note: null },
          { task: `${M} Second revision task`, why: `${M} Reason.`, zh_note: null },
          { task: `${M} Third revision task`, why: `${M} Reason.`, zh_note: null },
        ],
        voice_check: [
          { question: "Does this sound like how you would explain the experience to someone you trust?", note: M },
          { question: "Which details could only have come from your experience?", note: M },
        ],
        questions_for_student: [`${M} A question only you can answer?`],
        limitations: `${M} No AI analysis was performed. Configure an AI provider to get real feedback.`,
      };
    case "prompt_decoder":
      return {
        what_it_asks: `${M} An explanation of the prompt would appear here.`,
        key_terms: [{ term: "example", meaning: M }],
        possible_experiences: [M],
        not_required: [M],
        common_misunderstandings: [M],
        reflective_questions: [`${M} A reflective question?`],
        limitations: M,
      };
    case "sentence":
      return {
        diagnosis: `${M} A short diagnosis of the selected passage.`,
        alternatives: [],
        tradeoffs: M,
        translation: null,
        zh_explanation: null,
        voice_reminder: "Choose language that sounds natural to you.",
        boundary_note: null,
      };
    case "word_count":
      return {
        overview: `${M} Word-count guidance would appear here.`,
        repeated_ideas: [{ quote, suggestion: M }],
        unnecessary_setup: [],
        redundant_modifiers: [],
        condensable_passages: [],
        preserve: [{ quote, reason: M }],
        limitations: M,
      };
    case "final_read":
      return {
        prompt_alignment: { status: "unclear", explanation: M },
        clarity_issues: [{ quote, issue: M, suggestion: M }],
        repeated_words: [],
        grammar_issues: [],
        checklist: [`${M} Read your essay aloud once.`],
        limitations: M,
      };
    case "brainstorm":
      return {
        acknowledgement: `${M} An acknowledgement of what you shared.`,
        questions: [`${M} What is a moment you still think about?`],
        threads_noticed: [],
        boundary_note: null,
      };
    case "major_explorer":
      return {
        themes: [{ theme: `${M} A theme from your profile`, evidence: M }],
        suggestions: [
          {
            major: "[Mock] Example major",
            cip_family: "11",
            why_it_might_fit: `${M} An explanation grounded in your profile would appear here.`,
            based_on: [],
            what_you_would_study: M,
            related_majors: ["[Mock] Related major"],
            ways_to_test_interest: [`${M} A low-cost way to explore this.`],
            questions_to_ask_yourself: [`${M} A question to ask yourself?`],
            zh_note: null,
          },
        ],
        broader_options: [],
        reflective_questions: [`${M} A reflective question?`],
        notes_on_naming: M,
        limitations: `${M} No AI analysis was performed.`,
      };
    case "cv_import":
      return { courses: [], activities: [], honors: [], skipped_notes: [`${M} Nothing was extracted. Configure an AI provider to import a CV.`] };
    case "cds_extract":
      return {
        ...Object.fromEntries(CDS_FIELDS.map((f) => [f.key, null])),
        c7: [],
        degrees_by_field: [],
        uncertain_fields: ["[Development mock] nothing was extracted"],
      };
    default:
      return {};
  }
}

export class MockProvider implements AiProvider {
  kind = "mock";
  model = "mock-placeholder";

  async generate(request: StructuredRequest): Promise<StructuredResponse> {
    if (request.user.includes("[[mock:fail]]")) throw new AiProviderError("unavailable", false);
    const delay = Number(process.env.MOCK_AI_DELAY_MS ?? 400);
    const full = request.user.includes("[[mock:malformed]]")
      ? '{"summary": "unterminated'
      : JSON.stringify(payloadFor(request.schemaName, request.user));
    const steps = 6;
    for (let i = 1; i <= steps; i++) {
      if (request.signal.aborted) throw new AiProviderError("timeout");
      await new Promise((r) => setTimeout(r, delay / steps));
      request.onProgress?.(full.slice(0, Math.ceil((full.length * i) / steps)));
    }
    let json: unknown;
    try {
      json = JSON.parse(full);
    } catch {
      throw new AiProviderError("malformed");
    }
    return { json, model: this.model, providerRef: null };
  }
}
