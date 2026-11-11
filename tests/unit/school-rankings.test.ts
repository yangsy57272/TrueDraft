import { describe, expect, it } from "vitest";
import { rankingBonus, schoolRanking } from "@/lib/school-rankings";
import data from "@/content/rankings/us-news-2027.json";
describe("verified undergraduate rankings", () => {
  it("keeps missing ranks unknown, categories separate and program ranks field-specific", () => {
    expect(schoolRanking("unknown")).toEqual({ overall: null, programs: [] });
    expect(schoolRanking("166683").overall?.rank).toBe(1);
    expect(schoolRanking("168342").overall?.category).toBe("National Liberal Arts Colleges");
    expect(rankingBonus("168342", "11", "overall")).toBe(0);
    expect(rankingBonus("211440", "11", "program")).toBeGreaterThan(rankingBonus("211440", "14", "program"));
    // An economics rank is not a ranking of every social-science program.
    expect(rankingBonus("240444", "45", "program")).toBe(rankingBonus("240444", "99", "program"));
  });
  it("records source URLs for every fact", () => {
    for (const r of Object.values(data.schools)) {
      if (r.overall) expect(r.overall.source).toMatch(/^https:\/\//);
      for (const p of r.programs) { expect(p.source).toMatch(/^https:\/\//); expect(p.rank).toBeGreaterThan(0); }
    }
  });
});
