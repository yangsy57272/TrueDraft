import { schoolFacts, type FederalData } from "@/lib/federal";
import { scoreRanges, type Fit } from "@/lib/fit";

type Dataset = { data: Record<string, unknown>; derived: { admitRate?: number | null }; academicYear: string; sourceUrl: string; reviewedByPerson: boolean };
export function RecommendationEvidence({ dataset, federal, fit, zh }: { dataset: Dataset | null; federal: FederalData | null; fit: Fit | null; zh: boolean }) {
  const facts = schoolFacts(dataset, federal);
  const ranges = scoreRanges(dataset?.data ?? null, federal);
  const say = (en: string, cn: string) => zh ? cn : en;
  return <details className="card mt-3 p-4 text-sm"><summary className="cursor-pointer font-semibold">{say("Evidence behind this grouping", "展开查看分组依据与缺失信息")}</summary>
    <dl className="mt-3 grid gap-3 sm:grid-cols-2">
      <div><dt className="font-semibold">{say("Admission-rate input", "录取率输入")}</dt><dd>{facts.admitRate ? `${facts.admitRate.value}% · ${facts.admitRate.source === "cds" ? `CDS ${dataset?.academicYear}` : say("College Scorecard", "美国教育部数据")}` : say("Missing — no group inferred", "缺失，不推断分组")}</dd></div>
      <div><dt className="font-semibold">{say("Score comparison", "成绩对照")}</dt><dd>{fit?.usedScores ? say("Used; see the exact score and range above", "已使用，具体分数及范围见上方") : say("Not used; see the grouping explanation above", "未使用，原因见上方分组说明")}</dd></div>
      <div><dt className="font-semibold">{say("SAT range construction", "SAT 范围来源")}</dt><dd>{ranges.sat ? (ranges.sat.approximate ? say("Approximate sum of section percentiles; sections can use different sources", "分项百分位相加的近似范围；分项可能使用不同来源") : say("Published composite range", "公布的总分范围")) : say("Unavailable", "未提供")}</dd></div>
      <div><dt className="font-semibold">{say("Missing assessments", "尚未评估")}</dt><dd>{say("Programme-specific admission, international-applicant admission and personal affordability", "具体专业录取、国际生录取及个人可负担性")}</dd></div>
    </dl>
    <p className="mt-3">{say("Rule: admit-rate bands plus at most one score-based group adjustment; rates below 15% always remain Reach. Ranking never changes this group. This is not a personal admission probability.", "规则：录取率区间加最多一级成绩调整；低于15%始终为 Reach。排名不会改变分组。这不是个人录取概率。")}</p>
    <ul className="mt-3 list-disc pl-5">{dataset && <li><a href={dataset.sourceUrl} target="_blank" rel="noopener noreferrer">CDS {dataset.academicYear} ↗</a> · {dataset.reviewedByPerson ? say("Human review recorded", "已记录人工核查") : say("No human review recorded; verify the document", "未记录人工核查，请核对原始文件")}</li>}{federal && <li><a href="https://collegescorecard.ed.gov/data/" target="_blank" rel="noopener noreferrer">College Scorecard ↗</a> · {say("Admission period", "录取数据时期")}: {federal.periods?.admissions ? `${federal.periods.admissions.kind} ${federal.periods.admissions.year}` : say("not recorded", "未记录")}</li>}</ul>
  </details>;
}
