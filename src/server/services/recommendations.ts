import "server-only";
import programmeDirectory from "../../../data/global-programmes.json";
import { RECOMMENDATION_SYSTEMS } from "@/lib/recommendation-systems";
import type { ApplicationSystem } from "@/lib/application-systems";
import { schoolRanking, rankingBonus } from "@/lib/school-rankings";
import { scoreRanges, studentScores, suggestFit, type Fit, type FitCategory } from "@/lib/fit";
import { TUITION_BANDS } from "@/lib/federal";
import { CIP_FAMILIES, CIP_CODES, sizeBand, STATE_REGIONS, type StudentProfile } from "@/lib/planning";
import { allSchoolEntries, type SchoolEntry } from "./schools";

/*
 * College suggestions for a student's chosen majors, split into Reach / Target / Safety.
 *
 * Transparent and rule-based: a school is a candidate when at least MIN_FIELD_SHARE % of its
 * bachelor's degrees are in one of the student's fields (from its CDS, otherwise federal data).
 * Candidates are ranked by rankScore(): field prevalence (capped, so a one-subject institute doesn't
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

/** Field share counts fully up to this percent of degrees; larger shares receive no extra credit. */
export const FIELD_SHARE_CAP = 15;

export function rankScore(r: { field: { share: number }; facts: { gradRate: { value: number } | null }; fit: { usedScores: boolean } }) {
  const field = Math.min(r.field.share, FIELD_SHARE_CAP) / FIELD_SHARE_CAP; // 0..1
  const grad = (r.facts.gradRate?.value ?? 0) / 100; // 0..1, unknown counts as 0
  return 0.45 * field + 0.45 * grad + (r.fit.usedScores ? 0.1 : 0);
}

export type ProgrammeSubject = {code:string; label:string; url:string};
export type ProgrammeRecommendation = SchoolEntry & { subjects: ProgrammeSubject[]; sourceUrl:string; checkedAt:string };
export type SystemRecommendations = { system:ApplicationSystem; total:number; matches:ProgrammeRecommendation[]; unverified:number; explore:SchoolEntry[] };

/** Every published school is counted. Missing U.S. statistics never suppress another system. */
export function programmeRecommendations(all:SchoolEntry[],fields:string[],system?:ApplicationSystem):SystemRecommendations[] {
  return RECOMMENDATION_SYSTEMS.filter(c=>c!=="US"&&(!system||c===system)).map(country=>{
    const entries=all.filter(e=>e.school.country===country);
    const matches:ProgrammeRecommendation[]=[];
    for(const entry of entries){
      const evidence=programmeDirectory.find(d=>d.slug===entry.school.slug);
      const subjects=evidence?.subjects.filter(s=>fields.includes(s.code))??[];
      if(subjects.length&&evidence)matches.push({...entry,subjects,sourceUrl:evidence.url,checkedAt:evidence.checkedAt});
    }
    matches.sort((a,b)=>new Set(b.subjects.map(s=>s.code)).size-new Set(a.subjects.map(s=>s.code)).size||a.school.name.localeCompare(b.school.name));
    return {system:country,total:entries.length,matches,unverified:entries.length-matches.length,explore:entries.filter(e=>!matches.some(m=>m.school.id===e.school.id))};
  });
}

export type RecommendationOptions = { system?:ApplicationSystem; field?: string; tuition?: string; priority?: "balanced" | "overall" | "program" };

export function chosenFields(profile: StudentProfile, override?: string) {
  if (override && CIP_CODES.includes(override)) return [override];
  return [...new Set(profile.intendedMajors.map((m) => m.cipFamily).filter((c): c is string => Boolean(c && CIP_CODES.includes(c))))];
}

export async function recommendSchools(profile: StudentProfile, options: RecommendationOptions = {}) {
  const fields = chosenFields(profile, options.field);
  const empty = { reach: [], target: [], likely: [] } as Record<FitCategory, Recommendation[]>;
  const all = await allSchoolEntries();
  const systems=programmeRecommendations(all,fields,options.system);
  const coverage=RECOMMENDATION_SYSTEMS.map(system=>({system,total:all.filter(e=>e.school.country===system).length}));
  if (!fields.length) return { fields, buckets: empty, candidates: 0, noAdmitRate: 0, systems, coverage };

  const prefs = profile.preferences;
  const scores = studentScores(profile.tests);
  const tuitionBand = options.tuition ? TUITION_BANDS[options.tuition] : undefined;
  const strict: Recommendation[] = [];
  const relaxed: Recommendation[] = [];
  let candidates = 0;
  let noAdmitRate = 0;

  for (const entry of all) {
    if (entry.school.country !== "US" || (options.system && options.system !== "US")) continue;
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
    (rankScore(b) + rankingBonus(b.school.unitid, b.field.code, options.priority)) - (rankScore(a) + rankingBonus(a.school.unitid, a.field.code, options.priority)) || Number(Boolean(b.latest)) - Number(Boolean(a.latest)) || a.school.name.localeCompare(b.school.name);
  strict.sort(rank);
  relaxed.sort(rank);

  const buckets = { reach: [], target: [], likely: [] } as Record<FitCategory, Recommendation[]>;
  for (const cat of Object.keys(BUCKET_SIZES) as FitCategory[]) {
    const want = BUCKET_SIZES[cat];
    buckets[cat] = strict.filter((r) => r.fit.category === cat).slice(0, want);
    if (buckets[cat].length < want) buckets[cat].push(...relaxed.filter((r) => r.fit.category === cat).slice(0, want - buckets[cat].length));
  }
  return { fields, buckets, candidates, noAdmitRate, systems, coverage };
}

/** Round-robin selection prevents a single system filling the bounded AI explanation request. */
export function schoolAnalysisCandidates(result:Awaited<ReturnType<typeof recommendSchools>>) {
  const us=Object.values(result.buckets).flat().map(r=>({school_id:r.school.id,name:r.school.name,slug:r.school.slug,system:"US",field:CIP_FAMILIES[r.field.code]?.en,degree_share_percent:r.field.share as number|null,group:r.fit.category==="likely"?"Safety":r.fit.category,graduation_rate:r.facts.gradRate?.value??null,rankings:schoolRanking(r.school.unitid),outside_preferences:r.outsidePreferences,programme_listings:[] as ProgrammeSubject[],source_url:null as string|null}));
  const groups=[us,...result.systems.map(s=>s.matches.map(r=>({school_id:r.school.id,name:r.school.name,slug:r.school.slug,system:s.system,field:[...new Set(r.subjects.map(x=>CIP_FAMILIES[x.code]?.en))].join(", "),degree_share_percent:null,group:"Unassessed — verify course and qualification",graduation_rate:null,rankings:null,outside_preferences:false,programme_listings:r.subjects,source_url:r.sourceUrl})))];
  const selected:(typeof groups)[number][number][]=[];
  for(let i=0;selected.length<13&&groups.some(g=>g.length>i);i++)for(const group of groups)if(group[i]&&selected.length<13)selected.push(group[i]);
  return selected;
}
