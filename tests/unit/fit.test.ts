import { describe, expect, it } from "vitest";
import { scoreRanges, studentScores, suggestFit } from "@/lib/fit";

const none = { sat: null, act: null };
const ranges = { sat: { low: 1300, high: 1450, approximate: false }, act: { low: 28, high: 33 } };
const student = (sat: number | null, act: number | null = null, testPlan: "submit" | "not_submit" | "undecided" = "submit") => ({ sat, act, testPlan });

describe("suggestFit", () => {
  it("returns null without an admit rate (never guesses)", () => {
    expect(suggestFit(null, ranges, student(1500))).toBeNull();
  });

  it("uses admit-rate bands when there is no score", () => {
    expect(suggestFit(25, none, student(null))?.category).toBe("reach");
    expect(suggestFit(45, none, student(null))?.category).toBe("target");
    expect(suggestFit(75, none, student(null))?.category).toBe("likely");
    expect(suggestFit(75, none, student(null))?.reasons).toContainEqual({ code: "no_score" });
    expect(suggestFit(75, none, student(null))?.usedScores).toBe(false);
  });

  it("keeps very selective schools as reaches whatever the score", () => {
    const fit = suggestFit(6, ranges, student(1600))!;
    expect(fit.category).toBe("reach");
    expect(fit.reasons[0]).toEqual({ code: "very_selective", rate: 6 });
  });

  it("moves one step safer at or above the 75th percentile", () => {
    expect(suggestFit(30, ranges, student(1450))?.category).toBe("target");
    expect(suggestFit(50, ranges, student(1500))?.category).toBe("likely");
    expect(suggestFit(80, ranges, student(1500))?.category).toBe("likely");
  });

  it("moves one step harder below the 25th percentile", () => {
    expect(suggestFit(70, ranges, student(1200))?.category).toBe("target");
    expect(suggestFit(50, ranges, student(1200))?.category).toBe("reach");
  });

  it("leaves the category alone within the middle 50%", () => {
    const fit = suggestFit(50, ranges, student(1350))!;
    expect(fit.category).toBe("target");
    expect(fit.reasons).toContainEqual(expect.objectContaining({ code: "score", test: "sat", position: "within" }));
  });

  it("falls back to the ACT when the school has no SAT range", () => {
    const fit = suggestFit(50, { sat: null, act: ranges.act }, student(1500, 34))!;
    expect(fit.category).toBe("likely");
    expect(fit.reasons).toContainEqual(expect.objectContaining({ code: "score", test: "act", position: "above" }));
  });

  it("ignores scores the student won't submit", () => {
    const fit = suggestFit(50, ranges, student(1200, null, "not_submit"))!;
    expect(fit.category).toBe("target");
    expect(fit.reasons).toContainEqual({ code: "not_submitting" });
  });

  it("says when the school publishes no range", () => {
    expect(suggestFit(50, none, student(1400))?.reasons).toContainEqual({ code: "no_range", test: "sat" });
  });
});

describe("scoreRanges", () => {
  it("prefers the CDS composite", () => {
    expect(scoreRanges({ satComposite25: 1200, satComposite75: 1400 }, { satEbrw25: 500, satEbrw75: 600, satMath25: 500, satMath75: 600 }).sat).toEqual({
      low: 1200,
      high: 1400,
      approximate: false,
    });
  });
  it("approximates from section percentiles", () => {
    expect(scoreRanges(null, { satEbrw25: 500, satEbrw75: 600, satMath25: 520, satMath75: 640, actComposite25: 22, actComposite75: 28 })).toEqual({
      sat: { low: 1020, high: 1240, approximate: true },
      act: { low: 22, high: 28 },
    });
  });
});

describe("studentScores", () => {
  it("adds the sections when there is no total", () => {
    expect(studentScores({ satEbrw: 700, satMath: 750 })).toEqual({ sat: 1450, act: null });
    expect(studentScores({ satTotal: 1500, satEbrw: 700, satMath: 750, actComposite: 33 })).toEqual({ sat: 1500, act: 33 });
  });
});
