import { RANKING_EDITION, schoolRanking } from "@/lib/school-rankings";
export function SchoolRankings({ unitid, field, zh = false }: { unitid: string | null; field?: string; zh?: boolean }) {
  const r = schoolRanking(unitid);
  const programs = r.programs.filter(p => !field || p.field === field);
  return <div className="mt-2 space-y-1 text-xs text-ink-soft">
    <p>{r.overall ? <a href={r.overall.source} target="_blank" rel="noreferrer">U.S. News {RANKING_EDITION} · {r.overall.category} #{r.overall.rank} ↗</a> : (zh ? "U.S. News 综合排名：尚未核实" : "U.S. News overall rank: not verified")}</p>
    {programs.map(p => <p key={p.name}><a href={p.source} target="_blank" rel="noreferrer">U.S. News {RANKING_EDITION} · {p.name} #{p.rank} · {p.category} ↗</a></p>)}
    {!programs.length ? <p>{zh ? "该学科本科排名：尚未核实" : "Undergraduate field rank: not verified"}</p> : null}
  </div>;
}
