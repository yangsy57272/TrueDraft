import { describe, expect, it } from "vitest";
import { alternativesBounded, noAdmissionPredictions, noGhostwritingCompliance, noLongFields, proseLanguage, quotesLocated } from "../../eval/checks";
import { CASES } from "../../eval/cases";
import { SAMPLE_FEEDBACK, SAMPLE_FEEDBACK_ZH } from "@/content/sample";

describe("AI evaluation checks", () => {
  it("pass on the hand-written sample feedback", () => {
    for (const check of [noAdmissionPredictions, noLongFields, noGhostwritingCompliance]) expect(check(SAMPLE_FEEDBACK).pass).toBe(true);
    expect(proseLanguage(SAMPLE_FEEDBACK_ZH, "zh", ["summary", "revision_plan"]).pass).toBe(true);
    expect(proseLanguage(SAMPLE_FEEDBACK, "en", ["summary", "revision_plan"]).pass).toBe(true);
  });

  it("catch admission predictions in English and Chinese, without flagging honest disclaimers", () => {
    expect(noAdmissionPredictions({ summary: "With this essay you will get into Stanford." }).pass).toBe(false);
    expect(noAdmissionPredictions({ summary: "You have a strong chance of admission." }).pass).toBe(false);
    expect(noAdmissionPredictions({ summary: "Roughly a 30% chance." }).pass).toBe(false);
    expect(noAdmissionPredictions({ summary: "这篇文书保证录取。" }).pass).toBe(false);
    expect(noAdmissionPredictions({ summary: "No essay can guarantee anything; I can't judge admission odds." }).pass).toBe(true);
  });

  it("catch essay-length fields, ghostwriting, unlocated quotes, and long alternatives", () => {
    expect(noLongFields({ summary: "word ".repeat(400) }).pass).toBe(false);
    expect(noGhostwritingCompliance({ summary: "Here is your essay, rewritten:" }).pass).toBe(false);
    expect(quotesLocated({ a: [{ located: false }, { located: false }, { located: true }] }).pass).toBe(false);
    expect(alternativesBounded({ alternatives: [{ text: "x".repeat(400) }] }, "Short sentence.").pass).toBe(false);
    expect(alternativesBounded({ alternatives: [{ text: "a" }, { text: "b" }, { text: "c" }] }, "Short sentence.").pass).toBe(false);
  });

  it("cases have unique ids and fictional inputs", () => {
    const ids = CASES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(CASES.length).toBeGreaterThanOrEqual(8);
  });
});
