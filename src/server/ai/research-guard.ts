import type { SchoolResearch } from "./schemas";
import { RESEARCH_CRITERIA, type ResearchEvidence } from "@/lib/school-research";
const normalize = (s: string) => s.toLowerCase().replace(/\s+/g," ").trim();
/** Exact source anchoring is a necessary check, not a semantic fact-check or current-access guarantee. */
export function guardSchoolResearch(raw: SchoolResearch, evidence: ResearchEvidence) {
  const used = new Set<string>(); let rejected = 0;
  const items = raw.items.filter(item => {
    const source = evidence.sources.find(s => s.id === item.source_id);
    const ok = source && item.quote.trim().length >= 12 && item.quote.trim().split(/\s+/).length <= 24 && normalize(source.excerpt).includes(normalize(item.quote)) && normalize(source.excerpt).includes(normalize(item.title)) && !used.has(item.source_id);
    if (!ok) { rejected++; return false; } used.add(item.source_id); return true;
  });
  const audit = RESEARCH_CRITERIA.map(criterion => {
    const found = raw.audit.find(a => a.criterion === criterion);
    const score = found?.score ?? 0;
    return { criterion, score: criterion === "factual_support" ? (items.length ? Math.min(score, 1) : 0) : (!items.length ? Math.min(score,1) : score), reason: found?.reason ?? "Not assessed; verify before using." };
  });
  // A matching quotation cannot independently verify every interpretation or current teaching assignment.
  audit[0].reason = `Exact-excerpt check only; current teaching, eligibility and interpretations still require review. ${rejected} unsupported items removed. ${audit[0].reason}`;
  return { ...raw, items, audit, auditTotal: audit.reduce((n,a) => n+a.score,0), auditMax: 12, rejectedItems: rejected,
    open_questions: [...raw.open_questions, ...((!items.length || rejected) ? ["Check the official pages and add the exact programme, course, faculty or club page; source-unsupported items were not retained."] : [])].slice(0,9) };
}
