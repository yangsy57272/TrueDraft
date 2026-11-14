import Link from "next/link";
import { SYSTEMS } from "@/lib/application-systems";
import { CIP_FAMILIES } from "@/lib/planning";
import type { SystemRecommendations as Result } from "@/server/services/recommendations";
import {ProgrammeListChoice} from "./ProgrammeListChoice";
import {FIT_CATEGORIES,type FitCategory} from "@/lib/fit";
import {BUCKET_STYLE} from "./FitBadge";

export function SystemRecommendations({results,listed,zh}:{results:Result[];listed:Set<string>;zh:boolean}) {
 const names:Record<FitCategory,string>={reach:"Reach / 冲刺",target:"Target / 匹配",likely:"Safety / 保底"};
 const renderCard=(r:Result["matches"][number])=><li key={r.school.id} className="card min-w-0 p-4">
    <h3 className="font-semibold"><Link href={`/schools/${r.school.slug}`}>{zh&&r.school.nameZh?r.school.nameZh:r.school.name}</Link></h3>
    <p className="mt-2 text-sm font-medium">{zh?"与你所选学科的关联：":"Connection to your fields: "}{[...new Set(r.subjects.map(s=>CIP_FAMILIES[s.code]?.[zh?"zh":"en"]??s.code))].join(" · ")}</p>
    <ul className="mt-2 space-y-1 text-sm">{r.subjects.map((s,i)=><li key={`${s.code}-${i}`}><a href={s.url} target="_blank" rel="noopener noreferrer" className="break-words">{s.label} ↗</a></li>)}</ul>
    <p className="mt-2 text-xs text-ink-soft"><a href={r.sourceUrl} target="_blank" rel="noopener noreferrer">{zh?"官方本科目录":"Official undergraduate directory"} ↗</a> · {r.checkedAt.slice(0,10)}</p>
    <p className="mt-2 text-sm">{r.planningFit.basis==="student"?(zh?"学生自选分组。":"Student-selected group. "):r.planningFit.basis==="grade_rule"?(zh?"按所填课程要求与成绩暂分组。":"Provisional course/grade comparison. "):zh?"待补全评估资料。":"Complete the assessment. "}{r.planningFit.reason}</p>
    {r.planningFit.assessment?<p className="mt-1 text-xs"><a href={r.planningFit.assessment.source||r.sourceUrl} target="_blank" rel="noopener noreferrer">{r.planningFit.assessment.program} · {r.planningFit.assessment.entryYear} · {r.planningFit.assessment.metric.toUpperCase()} {r.planningFit.assessment.low}–{r.planningFit.assessment.high??r.planningFit.assessment.low}</a></p>:null}
    <div className="mt-3 space-y-2"><ProgrammeListChoice schoolId={r.school.id} onList={listed.has(r.school.id)} major={CIP_FAMILIES[r.subjects[0].code]?.[zh?"zh":"en"]??r.subjects[0].label} category={r.planningFit.category} zh={zh}/><Link className="btn btn-ghost btn-sm" href={`/my-list/resources?school=${r.school.slug}&field=${r.subjects[0].code}`}>{zh?"评估分组与预算 →":"Assess group & budget →"}</Link><Link className="btn btn-ghost btn-sm" href={`/schools/${r.school.slug}/research?program=${encodeURIComponent(r.subjects[0].label)}`}>{zh?"研究专业与申请要求 →":"Research programme & requirements →"}</Link></div>
   </li>;
 return <div className="mt-8 space-y-8">{results.map(result=>{
  const system=SYSTEMS[result.system];
  return <section key={result.system} id={`system-${result.system}`} aria-labelledby={`system-title-${result.system}`} className="rounded-2xl border border-line p-4 sm:p-6">
   <h2 id={`system-title-${result.system}`} className="text-2xl font-semibold">{system[zh?"zh":"en"]} · {zh?"学科匹配推荐":"Subject matches"} ({result.matches.length})</h2>
   <p className="mt-2 text-sm text-ink-soft">{zh?`已收录 ${result.total} 所；${result.matches.length} 所有与你所选学科相关的官方目录条目。按匹配学科数量、校名排序；目录条目不代表专业排名、当前招生开放或你已符合资格。`:`${result.total} schools in the directory; ${result.matches.length} have official catalogue listings related to your fields. Ordered by matched field count, then name. A listing is not a quality ranking, open intake or eligibility assessment.`}</p>
   <p className="mt-2 text-sm">{system[zh?"noteZh":"noteEn"]}</p>
   <p className="mt-2 text-sm">{zh?"各体系使用相同的三个规划分组，依据各自具体课程、学历和成绩要求；信息不足时保留待评估，不凑数。学术 Safety 不等于财务 Safety。":"Each system uses three planning groups based on its own course and qualification requirements. Missing evidence stays unassessed. Academic Safety is separate from financial affordability."} <Link href="/my-list/resources">{zh?"填写学历、成绩与课程条件 →":"Set qualification, results & course conditions →"}</Link></p>
   <div className="mt-4 grid gap-4 xl:grid-cols-3">{FIT_CATEGORIES.map(cat=><section key={cat} className="min-w-0 rounded-xl p-3" style={{background:BUCKET_STYLE[cat].soft}}><h3 className="font-semibold" style={{color:BUCKET_STYLE[cat].color}}>{names[cat]} ({result.buckets[cat].length})</h3>{result.buckets[cat].length?<ul className="mt-3 space-y-3">{result.buckets[cat].map(renderCard)}</ul>:<p className="mt-3 text-sm">{zh?"当前没有证据充分或由你指定的学校进入此组。":"No sufficiently assessed or student-assigned schools in this group yet."}</p>}</section>)}</div>
   {result.unassessed.length?<section className="mt-5"><h3 className="text-lg font-semibold">{zh?"待评估：补全课程与资格资料":"Unassessed: complete course / qualification evidence"} ({result.unassessed.length})</h3><ul className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{result.unassessed.map(renderCard)}</ul></section>:null}
   {!result.matches.length?<p className="notice mt-4">{zh?"尚无已核实的学科条目，请继续研究本体系学校；不代表没有该专业。":"No verified subject listing yet; explore this system below. This does not mean the subject is unavailable."}</p>:null}
   {result.explore.length?<details className="mt-4 rounded-xl bg-surface p-3"><summary>{zh?`展开其余 ${result.explore.length} 所已收录学校（学科待核实）`:`Show the other ${result.explore.length} recorded schools (subject unverified)`}</summary><ul className="mt-3 grid gap-3 sm:grid-cols-2">{result.explore.map(r=><li key={r.school.id} className="min-w-0 text-sm"><Link href={`/schools/${r.school.slug}`}>{zh&&r.school.nameZh?r.school.nameZh:r.school.name}</Link> · <Link href={`/schools/${r.school.slug}/research`}>{zh?"研究专业与资格":"Research programme & eligibility"}</Link></li>)}</ul></details>:null}
   <p className="mt-4 text-sm">{zh?`${result.unverified} 所尚无该学科的已核实目录匹配。`:`${result.unverified} schools have no verified catalogue match for these fields. `}<Link href={`/schools?country=${result.system}`}>{zh?"查看本体系全部已收录学校 →":"Explore every school recorded in this system →"}</Link></p>
  </section>;
 })}</div>;
}
