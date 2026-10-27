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

  it("clamps oversized text and lists so no field can carry a full essay", () => {
    const parsed = fullFeedbackSchema.parse({
      ...validFeedback,
      summary: "word ".repeat(2000),
      revision_plan: Array.from({ length: 12 }, () => validFeedback.revision_plan[0]),
    });
    expect(parsed.summary.length).toBeLessThanOrEqual(900);
    expect(parsed.revision_plan).toHaveLength(5);
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
