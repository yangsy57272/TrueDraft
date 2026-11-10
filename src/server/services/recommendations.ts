import "server-only";
import { scoreRanges, studentScores, suggestFit, type Fit, type FitCategory } from "@/lib/fit";
import { TUITION_BANDS } from "@/lib/federal";
import { CIP_CODES, sizeBand, STATE_REGIONS, type StudentProfile } from "@/lib/planning";
import { allSchoolEntries, type SchoolEntry } from "./schools";

/*
 * College suggestions for a student's chosen majors, split into Reach / Target / Safety.
 *
 * Transparent and rule-based: a school is a candidate when at least MIN_FIELD_SHARE % of its
 * bachelor's degrees are in one of the student's fields (from its CDS, otherwise federal data).
 * Candidates are ranked by rankScore(): field strength (capped, so a one-subject institute doesn't
 * automatically win) plus the six-year graduation rate, with a small bonus when a test-score range
 * is published (so the suggestion can use the student's scores). The bucket comes from src/lib/fit.ts. The student's size and
 * region preferences are applied first and only relaxed (and labelled as such) if a bucket would
 * otherwise be short. Nothing here predicts an admission decision.
 */

export const MIN_FIELD_SHARE = 1;
export const BUCKET_SIZES: Record<FitCategory, number> = { reach: 4, target: 5, likely: 4 };

export type Recommendation = SchoolEntry & {
  fit: Fit;
  /** The student's field with the largest share at this school, and that share (percent of degrees). */
  field: { code: string; share: number };
  /** True when the school is outside the student's size/region preferences (used to fill a short bucket). */
  outsidePreferences: boolean;
};

/** Field share counts fully up to this percent of degrees; beyond it, every school is "strong". */
export const FIELD_SHARE_CAP = 15;

export function rankScore(r: { field: { share: number }; facts: { gradRate: { value: number } | null }; fit: { usedScores: boolean } }) {
  const field = Math.min(r.field.share, FIELD_SHARE_CAP) / FIELD_SHARE_CAP; // 0..1
  const grad = (r.facts.gradRate?.value ?? 0) / 100; // 0..1, unknown counts as 0
  return 0.45 * field + 0.45 * grad + (r.fit.usedScores ? 0.1 : 0);
}

export type RecommendationOptions = { field?: string; tuition?: string };

export function chosenFields(profile: StudentProfile, override?: string) {
  if (override && CIP_CODES.includes(override)) return [override];
  return [...new Set(profile.intendedMajors.map((m) => m.cipFamily).filter((c): c is string => Boolean(c && CIP_CODES.includes(c))))];
}

export async function recommendSchools(profile: StudentProfile, options: RecommendationOptions = {}) {
  const fields = chosenFields(profile, options.field);
  const empty = { reach: [], target: [], likely: [] } as Record<FitCategory, Recommendation[]>;
  if (!fields.length) return { fields, buckets: empty, candidates: 0, noAdmitRate: 0 };

  const prefs = profile.preferences;
  const scores = studentScores(profile.tests);
  const tuitionBand = options.tuition ? TUITION_BANDS[options.tuition] : undefined;
  const all = await allSchoolEntries();

  const strict: Recommendation[] = [];
  const relaxed: Recommendation[] = [];
  let candidates = 0;
  let noAdmitRate = 0;

  for (const entry of all) {
    const degrees = entry.facts.degreesByField?.value;
    if (!degrees) continue;
    let best: { code: string; share: number } | null = null;
    for (const code of fields) {
      const share = degrees[code] ?? 0;
      if (share >= MIN_FIELD_SHARE && (!best || share > best.share)) best = { code, share };
    }
    if (!best) continue;
    if (tuitionBand) {
      const tuition = entry.facts.tuition?.value;
      if (tuition == null || tuition < tuitionBand[0] || tuition >= tuitionBand[1]) continue;
    }
    candidates++;
    const fit = suggestFit(entry.facts.admitRate?.value ?? null, scoreRanges(entry.latest?.data ?? null, entry.federal?.data ?? null), {
      ...scores,
      testPlan: prefs.testPlan,
    });
    if (!fit) {
      noAdmitRate++;
      continue;
    }
    const band = sizeBand(entry.facts.undergrads?.value ?? null);
    const region = STATE_REGIONS[entry.school.state ?? ""];
    const sizeOk = !prefs.sizes.length || (band != null && prefs.sizes.includes(band));
    const regionOk = !prefs.regions.length || (region != null && prefs.regions.includes(region));
    const rec: Recommendation = { ...entry, fit, field: best, outsidePreferences: !(sizeOk && regionOk) };
    (rec.outsidePreferences ? relaxed : strict).push(rec);
  }

  // Highest rank score first; schools whose own CDS is imported, then name, break ties.
  const rank = (a: Recommendation, b: Recommendation) =>
    rankScore(b) - rankScore(a) || Number(Boolean(b.latest)) - Number(Boolean(a.latest)) || a.school.name.localeCompare(b.school.name);
  strict.sort(rank);
  relaxed.sort(rank);

  const buckets = { reach: [], target: [], likely: [] } as Record<FitCategory, Recommendation[]>;
  for (const cat of Object.keys(BUCKET_SIZES) as FitCategory[]) {
    const want = BUCKET_SIZES[cat];
    buckets[cat] = strict.filter((r) => r.fit.category === cat).slice(0, want);
    if (buckets[cat].length < want) buckets[cat].push(...relaxed.filter((r) => r.fit.category === cat).slice(0, want - buckets[cat].length));
  }
  return { fields, buckets, candidates, noAdmitRate };
}
