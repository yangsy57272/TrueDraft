"use client";
import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { apiFetch, runStreamingTool } from "@/lib/api-client";
import { INITIAL_AI_PROGRESS, type AiProgress } from "@/lib/ai-progress";
import { RESEARCH_KINDS, WHY_SCHOOL_GUIDANCE, type ResearchEvidence } from "@/lib/school-research";
import type { SchoolResearch } from "@/server/ai/schemas";
import { useConsentGate } from "@/components/ai/useConsentGate";
import { ProgressStages } from "@/components/editor/ProgressStages";
import type { WorkspaceAi } from "@/components/editor/types";
export type ResearchResult = SchoolResearch & { evidence: ResearchEvidence; auditTotal:number; auditMax:number; rejectedItems:number };
const labels = {
 course:["课程与所学内容","Course content"], faculty:["教授与任课证据","Faculty / teaching evidence"], research:["研究及参与方式","Research / participation"], community:["社团与社区","Clubs / communities"], requirements:["入学及参与要求","Entry / access requirements"],
 factual_support:["事实依据","Evidence"],specificity:["具体程度","Specificity"],personal_fit:["与你的联系","Personal connection"],access:["参与资格","Access"],logic:["段落逻辑","Logic"],voice:["自然语气","Voice"],
} as const;
export function SchoolResearchWorkspace({school,ai,initialProgram,initialUrls=[],initial}: {school:{slug:string;name:string;country:string;website:string|null};ai:WorkspaceAi;initialProgram:string;initialUrls?:string[];initial:{id:string;result:ResearchResult;isMock:boolean}|null}) {
  const {locale,t} = useI18n(); const zh=locale==="zh-CN"; const gate=useConsentGate(ai);
  const [program,setProgram]=useState(initial?.result.evidence.program ?? initialProgram); const [urls,setUrls]=useState((initial?.result.evidence.requestedUrls ?? initialUrls).join("\n"));
  const [sources,setSources]=useState<ResearchEvidence|null>(initial?.result.evidence ?? null);
  const [current,setCurrent]=useState(initial); const [busy,setBusy]=useState(false); const [progress,setProgress]=useState<AiProgress|null>(null); const [error,setError]=useState("");
  const [copyState,setCopyState]=useState("");
  const officialUrls=urls.split(/\n/).map(u=>u.trim()).filter(Boolean);
  const changed=Boolean(current && (current.result.evidence.program!==program.trim() || JSON.stringify(current.result.evidence.requestedUrls ?? [])!==JSON.stringify(officialUrls)));
  async function discover() {
    setBusy(true);setError("");
    const res=await apiFetch<ResearchEvidence>(`/api/schools/${school.slug}/research`,{method:"POST",body:{program,officialUrls}});
    setBusy(false);if(res.ok) setSources(res.data);else setError(t(`errors.${res.code}` as never));
  }
  async function analyse() {
    if (!(await gate.ensure())) return;
    setError("");setProgress(INITIAL_AI_PROGRESS);
    const res=await runStreamingTool<ResearchResult>("/api/planning/school_research",{schoolSlug:school.slug,program,officialUrls},setProgress);
    setProgress(null);
    if (!res.ok) {if(res.code==="consent_required")gate.revoke();setError(t(`errors.${res.code}` as never));return;}
    setCurrent({id:res.runId,result:res.result,isMock:res.isMock});setSources(res.result.evidence);
  }
  const shownSources=sources?.program===program.trim() && JSON.stringify(sources.requestedUrls ?? [])===JSON.stringify(officialUrls)?sources:null;
  const result=!changed?current?.result:null;
  async function copy() {
    try { await navigator.clipboard.writeText(`${school.name} — ${program}\n${WHY_SCHOOL_GUIDANCE}\n\n${result ? JSON.stringify(result,null,2) : JSON.stringify(shownSources,null,2)}`);setCopyState(zh?"已复制":"Copied"); } catch {setCopyState(zh?"浏览器未允许复制，请选中文字复制。":"Copy unavailable; select the text to copy.");}
  }
  return <div className="mt-6 space-y-6">
    <section className="card p-5">
      <h2 className="text-xl font-semibold">{zh?"1. 查找具体专业的官方资料":"1. Find official evidence for your programme"}</h2>
      <label htmlFor="research-program" className="field-label mt-4">{zh?"专业／课程名称（建议用官网英文名称）":"Programme / subject (use its official name)"}</label>
      <input id="research-program" className="input w-full" value={program} onChange={e=>setProgram(e.target.value)} maxLength={160} placeholder="e.g. Psychology / Computer Science"/>
      <label htmlFor="research-urls" className="field-label mt-4">{zh?"课程、教授或社团官网链接（可选，每行一个，最多 6 个）":"Official course, faculty or club links (optional, one per line, up to 6)"}</label>
      <textarea id="research-urls" className="input min-h-24 w-full" value={urls} onChange={e=>setUrls(e.target.value)} aria-describedby="research-scope"/>
      <p id="research-scope" className="mt-2 text-xs text-ink-soft">{zh?"只读取该学校域名及子域名的公开 HTML 页面。自动检索最多 12 页；PDF、登录页面、受限或其他域名的页面需另行核实。不会向学校网站发送你的个人档案。":"Reads public HTML on the institution’s domain/subdomains only, up to 12 pages. PDFs, login/blocked pages and other domains need separate checking. Your profile is not sent to school websites."}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button className="btn btn-secondary" onClick={discover} disabled={busy||Boolean(progress)||program.trim().length<2||officialUrls.length>6}>{busy?(zh?"正在查找官网资料…":"Checking official pages…"):(zh?"查官网资料（无需 AI）":"Find official sources (no AI needed)")}</button>
        <button className="btn btn-primary" onClick={analyse} disabled={!ai.configured||busy||Boolean(progress)||program.trim().length<2||officialUrls.length>6}>{zh?"AI 整理研究、逻辑图与核查":"AI research, logic map & audit"}</button>
      </div>
      {!ai.configured?<p className="mt-3 text-sm"><Link href="/settings">{zh?"在设置中连接 AI，即可分析资料；官网查询仍可直接使用。":"Connect AI in Settings to analyse the evidence. Source lookup works without it."}</Link></p>:null}
      {progress?<div className="mt-4" role="status"><p className="mb-2 text-sm">{zh?"先读取官网资料，再分析；查资料阶段字数为 0。":"Reading official pages before analysis; generated characters stay at zero during discovery."}</p><ProgressStages progress={progress} kind="school_research"/></div>:null}
      {error?<p className="mt-3 text-sm text-red-700" role="alert">{error}</p>:null}
    </section>
    {changed?<p className="notice">{zh?"专业或链接已修改，请重新研究；旧结果不会当作新专业的依据。":"Programme or links changed. Run the research again; the old result does not support this programme."}</p>:null}
    {result?<>
      {current?.isMock?<p className="notice">{zh?"演示结果：未进行真实 AI 研究或评分。":"Mock result: no real AI research or scoring was performed."}</p>:null}
      <section className="card p-5"><h2 className="text-xl font-semibold">{zh?"2. 先看全文逻辑链":"2. Opening-to-ending logic map"}</h2><ol className="mt-4 list-decimal space-y-3 pl-6">{result.logic_chain.map((p,i)=><li key={i}><strong>{p.paragraph_purpose}</strong><p className="mt-1 text-sm">{p.connection}</p></li>)}</ol></section>
      <section className="card p-5"><h2 className="text-xl font-semibold">{zh?"3. 学校资源 → 所学 → 我的经历 → 行动":"3. Resource → learning → my experience → action"}</h2>
        {RESEARCH_KINDS.map(kind=><div key={kind} className="mt-5"><h3 className="font-semibold">{labels[kind][zh?0:1]}</h3>{result.items.filter(i=>i.kind===kind).length?result.items.filter(i=>i.kind===kind).map((item,i)=>{const source=result.evidence.sources.find(s=>s.id===item.source_id);return <article key={i} className="mt-3 rounded-xl border border-line p-4"><h4 className="font-semibold">{item.title}</h4><blockquote className="mt-2 border-l-2 pl-3 text-sm">{item.quote}</blockquote>{source?<a className="text-xs" href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗</a>:null}<dl className="mt-3 space-y-2 text-sm">{[[zh?"我会学到什么":"Learning",item.what_you_would_learn],[zh?"资格与限制":"Access / restrictions",item.eligibility],[zh?"我的真实联系":"My connection",item.personal_connection],[zh?"下一步":"Next action",item.next_step]].map(([l,v])=><div key={l}><dt className="font-semibold">{l}</dt><dd>{v}</dd></div>)}</dl></article>}):<p className="mt-2 text-sm text-ink-soft">{zh?"目前没有足够的原文依据；请补充该类别的官网链接。":"Insufficient source evidence. Add an official page for this category."}</p>}</div>)}
      </section>
      <section className="card p-5"><h2 className="text-xl font-semibold">{zh?"4. 严格核查与修改行动":"4. Strict audit & revision actions"}</h2><p className="mt-2 text-sm">{zh?"这是研究计划的 AI 自检，不是独立事实核查或录取评分。原文匹配无法证明当前任课与资格，事实项最高记 1/2。":"This is an AI self-check of the research plan, not independent fact-checking or an admission score. Matching excerpts do not prove current teaching/access; evidence is capped at 1/2."}</p><p className="mt-3 font-semibold">{result.auditTotal} / {result.auditMax}</p><ul className="mt-3 space-y-3">{result.audit.map(a=><li key={a.criterion}><strong>{labels[a.criterion][zh?0:1]} · {a.score}/2</strong><p className="text-sm">{a.reason}</p></li>)}</ul><ol className="mt-4 list-decimal space-y-2 pl-5">{result.revision_actions.map((v,i)=><li key={i}>{v}</li>)}</ol><h3 className="mt-5 font-semibold">{zh?"还需核实／补充":"Still to verify / answer"}</h3><ul className="mt-2 list-disc space-y-2 pl-5">{result.open_questions.map((v,i)=><li key={i}>{v}</li>)}</ul><p className="mt-4 text-sm text-ink-soft">{result.limitations}</p></section>
      <div className="flex flex-wrap gap-3"><Link className="btn btn-primary" href={`/essays/new?research=${encodeURIComponent(current!.id)}`}>{zh?"带着研究开始自己的文书":"Start my essay with this research"}</Link><button className="btn btn-secondary" onClick={copy}>{zh?"复制研究与写作要求":"Copy research & writing requirements"}</button><span role="status">{copyState}</span></div>
    </>:null}
    {shownSources?<section className="card p-5"><h2 className="text-xl font-semibold">{zh?"官方资料与核查范围":"Official sources & scope"}</h2><p className="mt-2 text-sm">{zh?`尝试 ${shownSources.attempted} 页，读取 ${shownSources.sources.length} 页，未能读取 ${shownSources.unavailable} 页。页面可访问不代表所有内容已验证。`:`Attempted ${shownSources.attempted}; read ${shownSources.sources.length}; unavailable ${shownSources.unavailable}. Reachability does not verify every claim.`}</p><ul className="mt-4 space-y-4">{shownSources.sources.map(s=><li key={s.id}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.id} · {s.title} ↗</a><p className="mt-1 text-xs text-ink-soft">{s.checkedAt}</p><details className="mt-2 text-sm"><summary>{zh?"查看原文片段（非摘要，可能含导航）":"Read captured excerpt (not a summary; may include navigation)"}</summary><p className="mt-2 whitespace-pre-line">{s.excerpt.slice(0,1500)}</p></details></li>)}</ul>{!shownSources.sources.length?<p className="mt-3">{zh?"未能读取资料；请直接打开官网查找并补充具体页面链接。不能据此判断学校没有这些机会。":"No pages could be read. Open the official site and add specific page links. This does not mean the school lacks these opportunities."}</p>:null}</section>:null}
    <section className="notice p-5"><h2 className="font-semibold">{zh?"最终修改检查":"Final revision check"}</h2><ul className="mt-3 list-disc space-y-2 pl-5">{(zh?["每个学校事实都有当前官网依据；核对课程年份、教授任课和本科生资格。","从真实经历出发，说明为何需要这项学习、如何参与，以及会作出什么贡献。","逐段写出作用：前一段的问题是否引出后一段？结尾是否回应开头？","保持自然一致的语气，精准变化动词，删掉空洞夸赞与重复；避免 not … but … 句式。","修改后重新对照原文与题目；不把 AI 自评分当作事实核查结论。"]:["Verify each named fact against current official evidence, including course year, instructor and undergraduate access.","Start from real experience: why this learning, how you would participate, and what you could contribute.","Name each paragraph’s purpose. Does its question lead to the next paragraph? Does the ending answer the opening?","Keep a natural, consistent voice; vary verbs precisely, remove empty praise and repetition, and avoid ‘not … but …’ constructions.","After revising, recheck sources and the actual prompt. AI self-scores do not establish factual accuracy."]).map((v,i)=><li key={i}>{v}</li>)}</ul></section>
    {gate.dialog}
  </div>;
}
