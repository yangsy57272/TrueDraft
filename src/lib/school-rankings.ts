import data from "@/content/rankings/us-news-2027.json";
export type PublishedRank = { rank: number; category: string; source: string };
export type ProgramRank = PublishedRank & { field: string; name: string };
export type SchoolRanking = { overall: PublishedRank | null; programs: ProgramRank[] };
export const RANKING_EDITION = data.edition;
export function schoolRanking(unitid: string | null): SchoolRanking {
  return (data.schools as Record<string, SchoolRanking>)[unitid ?? ""] ?? { overall: null, programs: [] };
}
export function rankingBonus(unitid: string | null, field: string, priority = "balanced") {
  const r = schoolRanking(unitid);
  const overall = r.overall?.category === "National Universities" ? 1 / Math.sqrt(r.overall.rank) : 0;
  const program = Math.max(0, ...r.programs.filter(p => p.field === field && !p.category.includes("specialty") && ["11", "14", "42", "52"].includes(p.field)).map(p => 1 / Math.sqrt(p.rank)));
  return priority === "overall" ? overall * 0.8 + program * 0.2 : priority === "program" ? program * 0.8 + overall * 0.2 : (overall + program) * 0.25;
}
