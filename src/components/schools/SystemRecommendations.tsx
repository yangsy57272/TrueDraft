import Link from "next/link";
import { SYSTEMS } from "@/lib/application-systems";
import { CIP_FAMILIES } from "@/lib/planning";
import type { SystemRecommendations as Result } from "@/server/services/recommendations";
import { AddToListButton } from "@/components/cds/SchoolClientBits";

export function SystemRecommendations({results,listed,zh}:{results:Result[];listed:Set<string>;zh:boolean}) {
 return <div className="mt-8 space-y-8">{results.map(result=>{
  const system=SYSTEMS[result.system];
  return <section key={result.system} id={`system-${result.system}`} aria-labelledby={`system-title-${result.system}`} className="rounded-2xl border border-line p-4 sm:p-6">
   <h2 id={`system-title-${result.system}`} className="text-2xl font-semibold">{system[zh?"zh":"en"]} · {zh?"学科匹配推荐":"Subject matches"} ({result.matches.length})</h2>
   <p className="mt-2 text-sm text-ink-soft">{zh?`已收录 ${result.total} 所；${result.matches.length} 所有与你所选学科相关的官方目录条目。按匹配学科数量、校名排序；目录条目不代表专业排名、当前招生开放或你已符合资格。`:`${result.total} schools in the directory; ${result.matches.length} have official catalogue listings related to your fields. Ordered by matched field count, then name. A listing is not a quality ranking, open intake or eligibility assessment.`}</p>
   <p className="mt-2 text-sm">{system[zh?"noteZh":"noteEn"]}</p>
   <p className="mt-2 text-sm font-medium">{zh?"Reach / Target / Safety 待评估：需要核对你的学历、预估成绩、先修科目与具体课程要求，不使用美国全校录取率推算。":"Reach / Target / Safety: not assessed. Compare your qualification, predicted grades and subjects with the exact course requirements; U.S. university-wide rates are not applied."}</p>
   {result.matches.length?<ul className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{result.matches.map(r=><li key={r.school.id} className="card min-w-0 p-4">
    <h3 className="font-semibold"><Link href={`/schools/${r.school.slug}`}>{zh&&r.school.nameZh?r.school.nameZh:r.school.name}</Link></h3>
    <p className="mt-2 text-sm font-medium">{zh?"与你所选学科的关联：":"Connection to your fields: "}{[...new Set(r.subjects.map(s=>CIP_FAMILIES[s.code]?.[zh?"zh":"en"]??s.code))].join(" · ")}</p>
    <ul className="mt-2 space-y-1 text-sm">{r.subjects.map((s,i)=><li key={`${s.code}-${i}`}><a href={s.url} target="_blank" rel="noopener noreferrer" className="break-words">{s.label} ↗</a></li>)}</ul>
    <p className="mt-2 text-xs text-ink-soft"><a href={r.sourceUrl} target="_blank" rel="noopener noreferrer">{zh?"官方本科目录":"Official undergraduate directory"} ↗</a> · {r.checkedAt.slice(0,10)}</p>
    <p className="mt-2 text-xs text-ink-soft">{zh?"专业质量排名、费用与个人录取分组尚未核实。下一步：核对具体专业的学历／科目／英语要求及申请渠道。":"Programme quality rank, cost and personal admission group are unverified. Next: check qualification, subject and English requirements and your application route."}</p>
    <div className="mt-3 flex flex-wrap gap-2"><AddToListButton schoolId={r.school.id} onList={listed.has(r.school.id)} signedIn intendedMajor={CIP_FAMILIES[r.subjects[0].code]?.[zh?"zh":"en"]} label={zh?"加入清单（分组待定）":"Add to list (group undecided)"}/><Link className="btn btn-ghost btn-sm" href={`/schools/${r.school.slug}/research?program=${encodeURIComponent(r.subjects[0].label)}`}>{zh?"研究专业与申请要求 →":"Research programme & requirements →"}</Link></div>
   </li>)}</ul>:<p className="notice mt-4">{zh?"该体系暂未核实与你所选学科相关的本科目录条目。可查看下方学校继续研究；这不代表它们不开设该专业。":"No related undergraduate catalogue listing has been verified in this system yet. Explore its schools below; this does not mean they lack the subject."}</p>}
   {result.explore.length?<details className="mt-4 rounded-xl bg-surface p-3"><summary>{zh?`展开其余 ${result.explore.length} 所已收录学校（学科待核实）`:`Show the other ${result.explore.length} recorded schools (subject unverified)`}</summary><ul className="mt-3 grid gap-3 sm:grid-cols-2">{result.explore.map(r=><li key={r.school.id} className="min-w-0 text-sm"><Link href={`/schools/${r.school.slug}`}>{zh&&r.school.nameZh?r.school.nameZh:r.school.name}</Link> · <Link href={`/schools/${r.school.slug}/research`}>{zh?"研究专业与资格":"Research programme & eligibility"}</Link></li>)}</ul></details>:null}
   <p className="mt-4 text-sm">{zh?`${result.unverified} 所尚无该学科的已核实目录匹配。`:`${result.unverified} schools have no verified catalogue match for these fields. `}<Link href={`/schools?country=${result.system}`}>{zh?"查看本体系全部已收录学校 →":"Explore every school recorded in this system →"}</Link></p>
  </section>;
 })}</div>;
}
