import "server-only";
import { CDS_FIELDS } from "@/lib/planning";
import { AiProviderError, type AiProvider, type StructuredRequest, type StructuredResponse } from "./provider";

/**
 * Development-only mock. It does NOT analyse the essay: every field says it is placeholder text,
 * and the UI labels mock runs prominently. It exists so the interface can be exercised without
 * AI credentials. Never enable AI_PROVIDER=mock in production.
 *
 * Test hooks (only inside the mock): include "[[mock:fail]]", "[[mock:malformed]]", or
 * "[[mock:incomplete]]" in a draft to simulate provider failures, or "[[mock:insufficient]]" for an
 * honest "not enough material" result.
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
      if (user.includes("[[mock:insufficient]]")) {
        return {
          material: "insufficient",
          insufficient_reason: `${M} The draft is too short to assess yet.`,
          summary: `${M} There isn't enough here for full feedback yet.`,
          strengths: [],
          primary_priority: { title: "", explanation: "", zh_note: null },
          prompt_alignment: { status: "unclear", explanation: "" },
          categories: [],
          passage_comments: [],
          revision_plan: [],
          voice_check: [],
          questions_for_student: [`${M} What moment comes to mind first when you read the prompt?`],
          limitations: `${M} No AI analysis was performed.`,
        };
      }
      return {
        material: "sufficient",
        insufficient_reason: null,
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
    case "school_explorer": {
      const candidates = JSON.parse(user.match(/<school_candidates>\n([\s\S]*?)\n<\/school_candidates>/)?.[1] ?? "[]") as { school_id: string }[];
      return { schools: candidates.map(s => ({ school_id: s.school_id, why_fit: M, tradeoff: M, next_step: M })), limitations: M };
    }
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
      if (user.includes("[[mock:cv-sample]]")) {
        // Test hook: build items from "Course:", "Activity:" and "Honor:" lines in the pasted text,
        // plus one honor that is deliberately not in the CV.
        const cv = user.match(/<cv_text>\n([\s\S]*?)\n<\/cv_text>/)?.[1] ?? "";
        const take = (label: string) => cv.split("\n").filter((l) => l.startsWith(`${label}:`)).map((l) => l.slice(label.length + 1).trim());
        return {
          courses: take("Course").map((name) => ({ name, level: "standard", grade: null, result: null })),
          activities: take("Activity").map((role) => ({ type: "other", role, organization: "", description: `${M}`, grades: [], hours_per_week: null, weeks_per_year: null })),
          honors: [...take("Honor").map((title) => ({ title, level: "other", grades: [] })), { title: "Mock Award Not In CV", level: "national", grades: [] }],
          skipped_notes: [M],
        };
      }
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
    let payload = payloadFor(request.schemaName, request.user) as Record<string, unknown>;
    if (request.user.includes("[[mock:incomplete]]") && request.schemaName === "full_feedback") {
      payload = { ...payload, categories: (payload.categories as unknown[]).slice(0, 5) };
    }
    const full = request.user.includes("[[mock:malformed]]") ? '{"summary": "unterminated' : JSON.stringify(payload);
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
