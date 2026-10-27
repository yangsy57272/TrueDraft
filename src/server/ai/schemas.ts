import { z } from "zod";

/**
 * Structured-output schemas for every AI tool.
 *
 * Length limits are enforced by clamping after parsing (providers' JSON-schema support does not
 * reliably honour maxLength/maxItems). Because every text field is capped well below essay
 * length, the AI cannot return a replacement essay through any field of these schemas.
 */

export const SCHEMA_VERSION = "2026-10-27.1";

const text = (max: number) => z.string().transform((s) => (s.length > max ? `${s.slice(0, max - 1)}…` : s));
const nullableText = (max: number) => z.string().nullable().transform((s) => (s && s.length > max ? `${s.slice(0, max - 1)}…` : s));
const list = <T extends z.ZodType>(item: T, max: number) => z.array(item).transform((a) => a.slice(0, max));

export const CATEGORY_KEYS = [
  "prompt_response",
  "specificity",
  "reflection",
  "structure_pacing",
  "clarity",
  "voice",
  "opening_ending",
  "concision",
] as const;
export const DIAGNOSTIC_LABELS = ["strong_foundation", "developing", "needs_attention"] as const;
export const PRIORITIES = ["high", "medium", "low"] as const;
export const ALIGNMENT = ["responds", "partly", "not_yet", "unclear"] as const;

/* ------------------------- full feedback ------------------------- */

export const fullFeedbackSchema = z.object({
  summary: text(900),
  strengths: list(z.object({ point: text(400), evidence_quote: text(400) }), 3),
  primary_priority: z.object({ title: text(160), explanation: text(900), zh_note: nullableText(300) }),
  prompt_alignment: z.object({ status: z.enum(ALIGNMENT), explanation: text(800) }),
  categories: list(
    z.object({
      key: z.enum(CATEGORY_KEYS),
      label: z.enum(DIAGNOSTIC_LABELS),
      explanation: text(600),
      next_step: text(400),
      passage_quote: nullableText(400),
      zh_note: nullableText(300),
    }),
    8,
  ),
  passage_comments: list(
    z.object({
      quote: text(500),
      observation: text(600),
      why_it_matters: text(600),
      revision_question: text(400),
      priority: z.enum(PRIORITIES),
      zh_note: nullableText(300),
    }),
    8,
  ),
  revision_plan: list(z.object({ task: text(300), why: text(400), zh_note: nullableText(300) }), 5),
  voice_check: list(z.object({ question: text(300), note: text(400) }), 4),
  questions_for_student: list(text(300), 5),
  limitations: text(600),
});
export type FullFeedback = z.infer<typeof fullFeedbackSchema>;

/* ------------------------- prompt decoder ------------------------ */

export const promptDecoderSchema = z.object({
  what_it_asks: text(900),
  key_terms: list(z.object({ term: text(80), meaning: text(300) }), 5),
  possible_experiences: list(text(300), 6),
  not_required: list(text(300), 5),
  common_misunderstandings: list(text(300), 5),
  reflective_questions: list(text(300), 6),
  limitations: text(400),
});
export type PromptDecoder = z.infer<typeof promptDecoderSchema>;

/* ------------------------ sentence feedback ---------------------- */

export { SENTENCE_MODES, type SentenceMode } from "@/lib/constants";

export const sentenceFeedbackSchema = z.object({
  diagnosis: text(700),
  alternatives: list(z.object({ text: z.string(), explanation: text(400) }), 2),
  tradeoffs: text(500),
  translation: nullableText(1500),
  zh_explanation: nullableText(500),
  voice_reminder: text(300),
  boundary_note: nullableText(400),
});
export type SentenceFeedback = z.infer<typeof sentenceFeedbackSchema>;

/* ------------------------ word-count helper ---------------------- */

const cutSuggestion = z.object({ quote: text(400), suggestion: text(400) });

export const wordCountSchema = z.object({
  overview: text(600),
  repeated_ideas: list(cutSuggestion, 5),
  unnecessary_setup: list(cutSuggestion, 5),
  redundant_modifiers: list(cutSuggestion, 6),
  condensable_passages: list(cutSuggestion, 5),
  preserve: list(z.object({ quote: text(400), reason: text(300) }), 5),
  limitations: text(400),
});
export type WordCountHelp = z.infer<typeof wordCountSchema>;

/* ------------------------- final read-through -------------------- */

const issue = z.object({ quote: text(400), issue: text(400), suggestion: text(400) });

export const finalReadSchema = z.object({
  prompt_alignment: z.object({ status: z.enum(ALIGNMENT), explanation: text(700) }),
  clarity_issues: list(issue, 6),
  repeated_words: list(z.object({ word: text(60), note: text(300) }), 6),
  grammar_issues: list(issue, 8),
  checklist: list(text(240), 8),
  limitations: text(400),
});
export type FinalRead = z.infer<typeof finalReadSchema>;

/* ---------------------------- brainstorm ------------------------- */

export const brainstormSchema = z.object({
  acknowledgement: text(500),
  questions: list(text(300), 3),
  threads_noticed: list(text(300), 4),
  boundary_note: nullableText(400),
});
export type Brainstorm = z.infer<typeof brainstormSchema>;

/* ----------------------------------------------------------------- */

export const SCHEMAS = {
  full_feedback: fullFeedbackSchema,
  prompt_decoder: promptDecoderSchema,
  sentence: sentenceFeedbackSchema,
  word_count: wordCountSchema,
  final_read: finalReadSchema,
  brainstorm: brainstormSchema,
} as const;
export type ToolKind = keyof typeof SCHEMAS;

type JsonSchema = Record<string, unknown>;

/** Make a schema acceptable to strict structured-output modes: closed objects, no meta keys. */
function harden(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(harden);
  if (!node || typeof node !== "object") return node;
  const out: JsonSchema = {};
  for (const [key, value] of Object.entries(node as JsonSchema)) {
    if (key === "$schema") continue;
    out[key] = harden(value);
  }
  if (out.type === "object") {
    out.additionalProperties = false;
    out.required = Object.keys((out.properties as JsonSchema) ?? {});
  }
  return out;
}

const jsonSchemaCache = new Map<ToolKind, JsonSchema>();

export function jsonSchemaFor(kind: ToolKind): JsonSchema {
  let cached = jsonSchemaCache.get(kind);
  if (!cached) {
    cached = harden(z.toJSONSchema(SCHEMAS[kind], { io: "input", unrepresentable: "any" })) as JsonSchema;
    jsonSchemaCache.set(kind, cached);
  }
  return cached;
}
