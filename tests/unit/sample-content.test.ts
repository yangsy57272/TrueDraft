import { describe, expect, it } from "vitest";
import { SAMPLE_ESSAY, SAMPLE_FEEDBACK, SAMPLE_FEEDBACK_EN, SAMPLE_FEEDBACK_ZH } from "@/content/sample";
import { fullFeedbackSchema } from "@/server/ai/schemas";
import { quoteAppearsIn } from "@/server/ai/guard";

const variants = { en: SAMPLE_FEEDBACK_EN, bilingual: SAMPLE_FEEDBACK, zh: SAMPLE_FEEDBACK_ZH };
const quotes = (f: { strengths: { evidence_quote: string }[]; categories: { passage_quote: string | null }[]; passage_comments: { quote: string }[] }) => [
  ...f.strengths.map((s) => s.evidence_quote),
  ...f.categories.map((c) => c.passage_quote).filter(Boolean),
  ...f.passage_comments.map((p) => p.quote),
] as string[];

describe("sample feedback (fictional, hand-written)", () => {
  for (const [name, f] of Object.entries(variants)) {
    it(`${name}: passes the same substance rules as live feedback`, () => {
      const parsed = fullFeedbackSchema.safeParse(f);
      expect(parsed.success ? [] : parsed.error.issues.map((i) => i.message)).toEqual([]);
    });
    it(`${name}: every quote marked as found really is in the essay`, () => {
      for (const q of quotes(f)) expect(quoteAppearsIn(SAMPLE_ESSAY, q), q).toBe(true);
    });
  }

  it("all three versions quote the same passages and give the same diagnosis", () => {
    expect(quotes(SAMPLE_FEEDBACK_ZH)).toEqual(quotes(SAMPLE_FEEDBACK));
    expect(quotes(SAMPLE_FEEDBACK_EN)).toEqual(quotes(SAMPLE_FEEDBACK));
    expect(SAMPLE_FEEDBACK_ZH.categories.map((c) => [c.key, c.label])).toEqual(SAMPLE_FEEDBACK.categories.map((c) => [c.key, c.label]));
    expect(SAMPLE_FEEDBACK_ZH.revision_plan).toHaveLength(SAMPLE_FEEDBACK.revision_plan.length);
  });

  it("the Chinese version is in Chinese and the English version has no Chinese notes", () => {
    const han = /[一-鿿]/;
    expect(han.test(SAMPLE_FEEDBACK_ZH.summary)).toBe(true);
    for (const t of SAMPLE_FEEDBACK_ZH.revision_plan) expect(han.test(t.task)).toBe(true);
    expect(JSON.stringify(SAMPLE_FEEDBACK_EN)).not.toMatch(han);
  });
});
