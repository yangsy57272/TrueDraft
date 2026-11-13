import { RESEARCH_CRITERIA, RESEARCH_KINDS } from "@/lib/school-research";
import { z } from "zod";
import { ACTIVITY_TYPES, C7_FACTORS, C7_LEVELS, CDS_FIELDS, COURSE_LEVELS, HONOR_LEVELS } from "@/lib/planning";

/**
 * Structured-output schemas for every AI tool.
 *
 * Length limits are enforced by clamping after parsing (providers' JSON-schema support does not
 * reliably honour maxLength/maxItems). Every text field is capped well below essay length, so no
 * single field can carry a replacement essay. This narrows, but cannot eliminate, the chance of
 * ghostwritten text; the prompts and guards are further layers, not guarantees.
 */

export const SCHEMA_VERSION = "2026-11-11.1";

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

export const MATERIAL_STATUS = ["sufficient", "insufficient"] as const;
export const REVISION_TASKS_MIN = 3;
export const REVISION_TASKS_MAX = 5;

const blank = (v: string | null | undefined) => !v || !v.trim();

export const fullFeedbackSchema = z
  .object({
    /** "insufficient" when the draft is too short, off-prompt, or unreadable to assess honestly. */
    material: z.enum(MATERIAL_STATUS),
    insufficient_reason: nullableText(600),
    summary: text(900),
    strengths: list(z.object({ point: text(400), evidence_quote: text(400) }), 3),
    primary_priority: z.object({ title: text(160), explanation: text(900), zh_note: nullableText(300) }),
    prompt_alignment: z.object({ status: z.enum(ALIGNMENT), explanation: text(800) }),
    // Not clamped: a ninth or duplicate category must be rejected, not silently cut.
    categories: z.array(
      z.object({
        key: z.enum(CATEGORY_KEYS),
        label: z.enum(DIAGNOSTIC_LABELS),
        explanation: text(600),
        next_step: text(400),
        passage_quote: nullableText(400),
        zh_note: nullableText(300),
      }),
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
    revision_plan: z.array(z.object({ task: text(300), why: text(400), zh_note: nullableText(300) })),
    voice_check: list(z.object({ question: text(300), note: text(400) }), 4),
    questions_for_student: list(text(300), 5),
    limitations: text(600),
  })
  .superRefine((f, ctx) => {
    const issue = (code: string) => ctx.addIssue({ code: "custom", message: code, params: { substance: true } });
    if (blank(f.summary)) issue("summary_empty");
    if (blank(f.limitations)) issue("limitations_empty");
    if (f.material === "insufficient") {
      // An honest "not enough to assess yet" result: no invented diagnosis is required.
      if (blank(f.insufficient_reason)) issue("insufficient_reason_empty");
      if (f.questions_for_student.filter((q) => !blank(q)).length === 0) issue("insufficient_needs_questions");
      return;
    }
    const keys = f.categories.map((c) => c.key);
    if (f.categories.length !== CATEGORY_KEYS.length || new Set(keys).size !== keys.length || CATEGORY_KEYS.some((k) => !keys.includes(k))) {
      issue("categories_not_exactly_once");
    }
    if (f.categories.some((c) => blank(c.explanation) || blank(c.next_step))) issue("category_empty");
    if (blank(f.primary_priority.title) || blank(f.primary_priority.explanation)) issue("priority_empty");
    if (blank(f.prompt_alignment.explanation)) issue("alignment_empty");
    if (f.strengths.filter((x) => !blank(x.point)).length === 0) issue("strengths_empty");
    if (f.passage_comments.length === 0) issue("passage_comments_empty");
    const tasks = f.revision_plan.map((r) => r.task.trim().toLowerCase()).filter(Boolean);
    if (f.revision_plan.length < REVISION_TASKS_MIN || f.revision_plan.length > REVISION_TASKS_MAX || tasks.length !== f.revision_plan.length || new Set(tasks).size !== tasks.length) {
      issue("revision_plan_count");
    }
  })
  .transform((f) => ({
    ...f,
    // Order categories canonically so every report reads the same way.
    categories: [...f.categories].sort((a, b) => CATEGORY_KEYS.indexOf(a.key) - CATEGORY_KEYS.indexOf(b.key)),
  }));

/** True when a parse failure came from the substance rules (as opposed to a malformed shape). */
export function isSubstanceFailure(error: z.ZodError) {
  return error.issues.length > 0 && error.issues.every((i) => i.code === "custom" && (i as { params?: { substance?: boolean } }).params?.substance === true);
}
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

/* ------------------------- major explorer ------------------------ */

const cip = z.string().nullable(); // validated against the CIP list by the guard

export const majorExplorerSchema = z.object({
  themes: list(z.object({ theme: text(200), evidence: text(300) }), 4),
  suggestions: list(
    z.object({
      major: text(80),
      cip_family: cip,
      why_it_might_fit: text(600),
      based_on: list(text(120), 4),
      what_you_would_study: text(500),
      related_majors: list(text(80), 4),
      ways_to_test_interest: list(text(250), 3),
      questions_to_ask_yourself: list(text(250), 3),
      zh_note: nullableText(300),
    }),
    6,
  ),
  broader_options: list(z.object({ major: text(80), cip_family: cip, why: text(300) }), 3),
  reflective_questions: list(text(300), 5),
  notes_on_naming: text(400),
  limitations: text(400),
});
export type MajorExplorer = z.infer<typeof majorExplorerSchema>;

/* --------------------------- CV import --------------------------- */

const gradeList = z.array(z.number().int()).transform((a) => [...new Set(a.filter((g) => g >= 9 && g <= 12))].slice(0, 4));

export const cvImportSchema = z.object({
  courses: list(
    z.object({ name: text(80), level: z.enum(COURSE_LEVELS), grade: z.number().int().nullable(), result: nullableText(20) }),
    40,
  ),
  activities: list(
    z.object({
      type: z.enum(ACTIVITY_TYPES),
      role: text(50),
      organization: text(100),
      description: text(150),
      grades: gradeList,
      hours_per_week: z.number().int().nullable(),
      weeks_per_year: z.number().int().nullable(),
    }),
    20,
  ),
  honors: list(z.object({ title: text(100), level: z.enum(HONOR_LEVELS), grades: gradeList }), 10),
  skipped_notes: list(text(200), 5),
});
export type CvImport = z.infer<typeof cvImportSchema>;

/* ------------------- CDS extraction (admin tool) ------------------ */

function extractField(def: (typeof CDS_FIELDS)[number]) {
  if (def.type === "bool") return z.boolean().nullable();
  if (def.type === "monthday") return z.string().nullable();
  if (def.type === "enum") return z.enum(def.options as [string, ...string[]]).nullable();
  return z.number().nullable();
}

export const cdsExtractSchema = z.object({
  ...Object.fromEntries(CDS_FIELDS.map((f) => [f.key, extractField(f)])),
  c7: list(z.object({ factor: z.enum(C7_FACTORS), level: z.enum(C7_LEVELS) }), 19),
  degrees_by_field: list(z.object({ cip_family: z.string(), percent: z.number() }), 40),
  uncertain_fields: list(text(60), 20),
}) as unknown as z.ZodType<Record<string, unknown> & { c7: { factor: string; level: string }[]; degrees_by_field: { cip_family: string; percent: number }[]; uncertain_fields: string[] }>;

/* ----------------------------------------------------------------- */

export const schoolExplorerSchema = z.object({
  schools: list(z.object({ school_id: text(100), why_fit: text(1000), tradeoff: text(700), next_step: text(500) }), 13),
  limitations: text(1000),
});
export type SchoolExplorer = z.infer<typeof schoolExplorerSchema>;

export const schoolResearchSchema = z.object({
  items: list(z.object({ kind: z.enum(RESEARCH_KINDS), title: text(180), source_id: text(20), quote: text(300), what_you_would_learn: text(500), eligibility: text(450), personal_connection: text(500), next_step: text(400) }), 10),
  logic_chain: list(z.object({ paragraph_purpose: text(180), connection: text(500) }), 5),
  audit: list(z.object({ criterion: z.enum(RESEARCH_CRITERIA), score: z.number().int().min(0).max(2), reason: text(500) }), 6),
  revision_actions: list(text(500), 6),
  open_questions: list(text(400), 8),
  limitations: text(1000),
});
export type SchoolResearch = z.infer<typeof schoolResearchSchema>;

export const SCHEMAS = {
  school_research: schoolResearchSchema,
  school_explorer: schoolExplorerSchema,
  full_feedback: fullFeedbackSchema,
  prompt_decoder: promptDecoderSchema,
  sentence: sentenceFeedbackSchema,
  word_count: wordCountSchema,
  final_read: finalReadSchema,
  brainstorm: brainstormSchema,
  major_explorer: majorExplorerSchema,
  cv_import: cvImportSchema,
  cds_extract: cdsExtractSchema,
} as const;
export type ToolKind = keyof typeof SCHEMAS;
/** Tools that operate on one essay (served by /api/essays/[id]/ai/[kind]). */
export const ESSAY_TOOL_KINDS = ["full_feedback", "prompt_decoder", "sentence", "word_count", "final_read", "brainstorm"] as const;
export type EssayToolKind = (typeof ESSAY_TOOL_KINDS)[number];
/** Tools that operate on the student's profile (served by /api/planning/[kind]). */
export const PLANNING_TOOL_KINDS = ["major_explorer", "school_explorer", "school_research", "cv_import"] as const;
export type PlanningToolKind = (typeof PLANNING_TOOL_KINDS)[number];

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
