import Link from "next/link";
import { notFound } from "next/navigation";
import { getT } from "@/i18n/server";
import { requirePageUser } from "@/server/session";
import { getSchoolBySlug } from "@/server/services/schools";
import { getProfile, listPlanningRuns } from "@/server/services/profile";
import { aiFactsFor } from "@/server/ai-facts";
import { SchoolResearchWorkspace, type ResearchResult } from "@/components/schools/SchoolResearchWorkspace";
import { applicationSystem } from "@/lib/application-systems";
export const metadata = { title: "School research · Why School", robots: {index:false} };
export default async function ResearchPage({params}: {params:Promise<{slug:string}>}) {
  const user = await requirePageUser(); const {slug} = await params;
  const found = await getSchoolBySlug(slug); if (!found) notFound();
  const [{locale},profile,ai,{runs}] = await Promise.all([getT(),getProfile(user.id),aiFactsFor(user.id),listPlanningRuns(user.id,"school_research",{limit:50})]);
  const zh = locale === "zh-CN"; const system = applicationSystem(found.school.country);
  const latest = runs.find(r => r.status === "completed" && (r.result as ResearchResult | null)?.evidence?.schoolSlug === slug);
  return <div className="container-page py-10">
    <Link href={`/schools/${slug}`}>← {found.school.name}</Link>
    <h1 className="mt-3 text-3xl font-semibold">{zh ? "学校深度研究与 Why School" : "School research & Why School"}</h1>
    <p className="mt-3 max-w-3xl text-ink-soft">{zh ? "从具体专业出发：研究课程内容、教授与研究、参与资格和校园社群，再连接你的真实经历。先理清文章从开头到结尾的逻辑，再做严格核查与修改。" : "Start with your intended programme: investigate course content, faculty research, access requirements and campus communities, then connect them to your own experience. Map the opening-to-ending logic before auditing and revising."}</p>
    {system ? <aside className="notice mt-4"><strong>{zh?system.zh:system.en} · {system.route}</strong><p className="mt-2 text-sm">{zh?system.noteZh:system.noteEn}</p><a href={system.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm">{zh?"核对官方申请说明":"Check official application guidance"} ↗</a></aside> : null}
    <SchoolResearchWorkspace school={{slug,name:found.school.name,country:found.school.country,website:found.school.website}} ai={ai} initialProgram={profile.intendedMajors[0]?.name ?? ""} initial={latest ? {id:latest.id,result:latest.result as ResearchResult,isMock:latest.provider==="mock"}:null}/>
  </div>;
}
