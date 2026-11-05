import { describe, expect, it } from "vitest";
import { fullFeedbackSchema, jsonSchemaFor, SCHEMAS, sentenceFeedbackSchema } from "@/server/ai/schemas";
import { applyGuards, maxAlternativeLength, quoteAppearsIn } from "@/server/ai/guard";
import { validFeedback } from "../helpers/fixtures";

function walk(node: unknown, visit: (n: Record<string, unknown>) => void) {
  if (Array.isArray(node)) node.forEach((n) => walk(n, visit));
  else if (node && typeof node === "object") {
    visit(node as Record<string, unknown>);
    Object.values(node).forEach((n) => walk(n, visit));
  }
}

describe("structured AI output", () => {
  it("accepts a valid feedback object", () => {
    expect(fullFeedbackSchema.safeParse(validFeedback).success).toBe(true);
  });

  it("rejects missing or wrongly-typed fields", () => {
    const { summary: _s, ...missing } = validFeedback;
    expect(fullFeedbackSchema.safeParse(missing).success).toBe(false);
    expect(fullFeedbackSchema.safeParse({ ...validFeedback, categories: [{ ...validFeedback.categories[0], label: "admit" }] }).success).toBe(false);
    expect(fullFeedbackSchema.safeParse({ ...validFeedback, passage_comments: [{ ...validFeedback.passage_comments[0], priority: "urgent" }] }).success).toBe(false);
    expect(fullFeedbackSchema.safeParse("not json").success).toBe(false);
  });

  it("clamps oversized text so no field can carry a full essay", () => {
    const parsed = fullFeedbackSchema.parse({ ...validFeedback, summary: "word ".repeat(2000) });
    expect(parsed.summary.length).toBeLessThanOrEqual(900);
  });

  const reasons = (value: unknown) => {
    const r = fullFeedbackSchema.safeParse(value);
    return r.success ? [] : r.error.issues.map((i) => i.message);
  };

  it("requires all eight categories exactly once", () => {
    const cats = validFeedback.categories;
    expect(reasons({ ...validFeedback, categories: cats.slice(0, 7) })).toContain("categories_not_exactly_once");
    expect(reasons({ ...validFeedback, categories: [...cats.slice(0, 7), cats[0]] })).toContain("categories_not_exactly_once");
    expect(reasons({ ...validFeedback, categories: [...cats, cats[1]] })).toContain("categories_not_exactly_once");
    // Output order doesn't matter; it is normalised.
    const parsed = fullFeedbackSchema.parse({ ...validFeedback, categories: [...cats].reverse() });
    expect(parsed.categories.map((c) => c.key)).toEqual(cats.map((c) => c.key));
  });

  it("requires non-empty essentials", () => {
    expect(reasons({ ...validFeedback, summary: "  " })).toContain("summary_empty");
    expect(reasons({ ...validFeedback, categories: validFeedback.categories.map((c, i) => (i === 3 ? { ...c, next_step: "" } : c)) })).toContain("category_empty");
    expect(reasons({ ...validFeedback, primary_priority: { title: "", explanation: "x", zh_note: null } })).toContain("priority_empty");
    expect(reasons({ ...validFeedback, strengths: [] })).toContain("strengths_empty");
    expect(reasons({ ...validFeedback, passage_comments: [] })).toContain("passage_comments_empty");
    expect(reasons({ ...validFeedback, limitations: "" })).toContain("limitations_empty");
  });

  it("requires three to five distinct revision tasks", () => {
    const plan = validFeedback.revision_plan;
    expect(reasons({ ...validFeedback, revision_plan: plan.slice(0, 2) })).toContain("revision_plan_count");
    const six = Array.from({ length: 6 }, (_, i) => ({ ...plan[0], task: `Task ${i}` }));
    expect(reasons({ ...validFeedback, revision_plan: six })).toContain("revision_plan_count");
    expect(reasons({ ...validFeedback, revision_plan: [plan[0], plan[0], plan[1]] })).toContain("revision_plan_count");
    expect(reasons({ ...validFeedback, revision_plan: [...plan, { ...plan[0], task: "Fourth.", why: "w" }, { ...plan[0], task: "Fifth.", why: "w" }] })).toEqual([]);
  });

  it("accepts an honest insufficient-material result without invented diagnosis", () => {
    const insufficient = {
      ...validFeedback,
      material: "insufficient",
      insufficient_reason: "The draft is two sentences long.",
      strengths: [],
      categories: [],
      passage_comments: [],
      revision_plan: [],
      questions_for_student: ["What happened next?"],
    };
    expect(reasons(insufficient)).toEqual([]);
    expect(reasons({ ...insufficient, insufficient_reason: null })).toContain("insufficient_reason_empty");
    expect(reasons({ ...insufficient, questions_for_student: [] })).toContain("insufficient_needs_questions");
  });

  it("produces strict JSON schemas (closed objects, all fields required)", () => {
    for (const kind of Object.keys(SCHEMAS) as (keyof typeof SCHEMAS)[]) {
      const schema = jsonSchemaFor(kind);
      expect(schema.$schema).toBeUndefined();
      walk(schema, (n) => {
        if (n.type === "object") {
          expect(n.additionalProperties).toBe(false);
          expect(n.required).toEqual(Object.keys(n.properties as object));
        }
      });
    }
  });

  it("limits sentence alternatives to at most two of reasonable length", () => {
    const data = sentenceFeedbackSchema.parse({
      diagnosis: "d",
      alternatives: [
        { text: "short", explanation: "e" },
        { text: "x".repeat(500), explanation: "e" },
        { text: "third", explanation: "e" },
      ],
      tradeoffs: "",
      translation: null,
      zh_explanation: null,
      voice_reminder: "v",
      boundary_note: null,
    });
    const guarded = applyGuards("sentence", data, { draft: "", selection: "A short sentence here.", wordCount: 0, wordLimit: null }) as { alternatives: unknown[] };
    expect(data.alternatives).toHaveLength(2);
    expect(guarded.alternatives).toHaveLength(1);
    expect(maxAlternativeLength("abc")).toBeGreaterThanOrEqual(160);
  });

  it("returns no alternatives for translation requests", () => {
    const guarded = applyGuards(
      "sentence",
      { diagnosis: "d", alternatives: [{ text: "x", explanation: "e" }], tradeoffs: "", translation: "翻译", zh_explanation: null, voice_reminder: "", boundary_note: null },
      { draft: "", selection: "x", mode: "translate", wordCount: 0, wordLimit: null },
    ) as { alternatives: unknown[] };
    expect(guarded.alternatives).toHaveLength(0);
  });

  it("locates quotes despite curly quotes and whitespace differences", () => {
    const draft = "She said, “don't  worry,”\nand left.";
    expect(quoteAppearsIn(draft, 'she said, "don\'t worry," and left')).toBe(true);
    expect(quoteAppearsIn(draft, "an invented sentence")).toBe(false);
    expect(quoteAppearsIn(draft, "")).toBe(false);
  });
});
