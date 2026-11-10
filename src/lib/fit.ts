/*
 * A transparent, rule-based Reach / Target / Safety *suggestion* for one school.
 *
 * This is not a prediction of admission. It only places a school relative to two published facts:
 * how many applicants it admits, and where the student's test score sits in its middle 50% range.
 * Every suggestion carries the reasons it was made, so a student can see (and disagree with) them.
 *
 * Rules
 * 1. Base category from the admit rate: under 15% is always a reach (scores cannot change that);
 *    15–35% reach; 35–60% target; 60% or more safety.
 * 2. If the student has a score, plans to submit it, and the school publishes a range for that
 *    test: at or above the 75th percentile moves one step safer, below the 25th moves one step harder.
 * 3. Without a usable score, the admit rate alone decides, and the result says so.
 * Categories use the list's stored values; "likely" is shown to students as "Safety".
 */
import type { FederalData } from "./federal";
import type { StudentProfile } from "./planning";

export const FIT_CATEGORIES = ["reach", "target", "likely"] as const;
export type FitCategory = (typeof FIT_CATEGORIES)[number];

export type ScorePosition = "above" | "within" | "below";

export type FitReason =
  | { code: "very_selective"; rate: number }
  | { code: "admit_rate"; rate: number }
  | { code: "score"; test: "sat" | "act"; position: ScorePosition; student: number; low: number; high: number; approximate: boolean }
  | { code: "no_score" }
  | { code: "not_submitting" }
  | { code: "no_range"; test: "sat" | "act" };

export type Fit = { category: FitCategory; reasons: FitReason[]; usedScores: boolean };

export type ScoreRanges = {
  sat: { low: number; high: number; approximate: boolean } | null;
  act: { low: number; high: number } | null;
};

const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/**
 * Middle-50% ranges for one school. SAT comes from the CDS composite when published; otherwise it
 * is approximated by adding the section percentiles (CDS, then federal), which is marked approximate.
 */
export function scoreRanges(cdsData: Record<string, unknown> | null, fed: FederalData | null): ScoreRanges {
  const d = cdsData ?? {};
  let sat: ScoreRanges["sat"] = null;
  const c25 = n(d.satComposite25);
  const c75 = n(d.satComposite75);
  if (c25 != null && c75 != null) sat = { low: c25, high: c75, approximate: false };
  else {
    const e25 = n(d.satEbrw25) ?? fed?.satEbrw25 ?? null;
    const e75 = n(d.satEbrw75) ?? fed?.satEbrw75 ?? null;
    const m25 = n(d.satMath25) ?? fed?.satMath25 ?? null;
    const m75 = n(d.satMath75) ?? fed?.satMath75 ?? null;
    if (e25 != null && e75 != null && m25 != null && m75 != null) sat = { low: e25 + m25, high: e75 + m75, approximate: true };
  }
  const a25 = n(d.actComposite25) ?? fed?.actComposite25 ?? null;
  const a75 = n(d.actComposite75) ?? fed?.actComposite75 ?? null;
  const act = a25 != null && a75 != null ? { low: a25, high: a75 } : null;
  return { sat, act };
}

/** The student's SAT total (or EBRW + Math) and ACT composite, if entered. */
export function studentScores(tests: StudentProfile["tests"]) {
  const sat = tests.satTotal ?? (tests.satEbrw != null && tests.satMath != null ? tests.satEbrw + tests.satMath : null);
  return { sat: sat ?? null, act: tests.actComposite ?? null };
}

export function scorePosition(score: number, low: number, high: number): ScorePosition {
  return score >= high ? "above" : score < low ? "below" : "within";
}

function baseCategory(rate: number): FitCategory {
  if (rate < 35) return "reach";
  if (rate < 60) return "target";
  return "likely";
}

const shift = (c: FitCategory, by: -1 | 1): FitCategory => FIT_CATEGORIES[Math.min(2, Math.max(0, FIT_CATEGORIES.indexOf(c) + by))];

/**
 * Suggest a category, or null when the school publishes no admit rate (we never guess one).
 */
export function suggestFit(
  admitRate: number | null,
  ranges: ScoreRanges,
  student: { sat: number | null; act: number | null; testPlan: StudentProfile["preferences"]["testPlan"] },
): Fit | null {
  if (admitRate == null) return null;
  const reasons: FitReason[] = [];
  const locked = admitRate < 15;
  let category = baseCategory(admitRate);
  reasons.push(locked ? { code: "very_selective", rate: admitRate } : { code: "admit_rate", rate: admitRate });

  let usedScores = false;
  if (student.testPlan === "not_submit") reasons.push({ code: "not_submitting" });
  else if (student.sat == null && student.act == null) reasons.push({ code: "no_score" });
  else {
    // Prefer the SAT when both the student and the school have one; otherwise use the ACT.
    let used: Extract<FitReason, { code: "score" }> | null = null;
    if (student.sat != null && ranges.sat) {
      const r = ranges.sat;
      used = { code: "score", test: "sat", position: scorePosition(student.sat, r.low, r.high), student: student.sat, low: r.low, high: r.high, approximate: r.approximate };
    } else if (student.act != null && ranges.act) {
      const r = ranges.act;
      used = { code: "score", test: "act", position: scorePosition(student.act, r.low, r.high), student: student.act, low: r.low, high: r.high, approximate: false };
    }
    if (used) {
      usedScores = true;
      reasons.push(used);
      if (!locked && used.position === "above") category = shift(category, 1);
      if (used.position === "below") category = shift(category, -1);
    } else reasons.push({ code: "no_range", test: student.sat != null ? "sat" : "act" });
  }
  if (locked) category = "reach";
  return { category, reasons, usedScores };
}
