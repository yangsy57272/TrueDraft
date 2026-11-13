"use client";
import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { INITIAL_AI_PROGRESS, type AiProgress } from "@/lib/ai-progress";
import { runStreamingTool } from "@/lib/api-client";
import { useConsentGate } from "@/components/ai/useConsentGate";
import { ProgressStages } from "@/components/editor/ProgressStages";
import type { WorkspaceAi } from "@/components/editor/types";
import type { SchoolExplorer } from "@/server/ai/schemas";

export function SchoolAnalysis({ ai, field, tuition, priority, system, schools }: {
  ai: WorkspaceAi; field?: string; tuition?: string; priority: string; system?:string;
  schools: { id: string; name: string; slug: string; group: string }[];
}) {
  const { t, locale } = useI18n();
  const zh = locale === "zh-CN";
  const gate = useConsentGate(ai);
  const [progress, setProgress] = useState<AiProgress | null>(null);
  const [result, setResult] = useState<SchoolExplorer | null>(null);
  const [isMock, setMock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run() {
    if (!(await gate.ensure())) return;
    setError(null); setResult(null); setProgress(INITIAL_AI_PROGRESS);
    const res = await runStreamingTool<SchoolExplorer>("/api/planning/school_explorer", { field, tuition, priority, system }, setProgress);
    setProgress(null);
    if (!res.ok) {
      if (res.code === "consent_required") gate.revoke();
      setError(t(`errors.${res.code}` as never)); return;
    }
    setMock(res.isMock); setResult(res.result);
  }
  return <section className="card mt-6 p-5" aria-labelledby="school-ai-title">
    <h2 id="school-ai-title" className="text-xl font-semibold">{zh ? "AI 学校＋专业匹配分析" : "AI school + major matching"}</h2>
    <p className="mt-2 text-sm text-ink-soft">{zh ? "根据你的课程、活动、荣誉和兴趣，解释下面的学校为什么适合你、有哪些取舍，以及下一步该查什么。分数和 GPA 不会发送给 AI。" : "Connect your courses, activities, honors and interests to the shortlist below, with tradeoffs and research steps. Test scores and GPA stay out of the AI request."}</p>
    <button className="btn btn-primary mt-3" disabled={!ai.configured || !!progress || !schools.length} onClick={run}>{zh ? "分析适合我的学校 →" : "Find my school matches →"}</button>
    {!ai.configured ? <p className="mt-2 text-sm">{t("errors.ai_not_configured")}</p> : null}
    {progress ? <div className="mt-3"><ProgressStages progress={progress} kind="school_explorer" /></div> : null}
    {error ? <p role="alert" className="mt-3 text-sm">{error}</p> : null}
    {result ? <div className="mt-4 space-y-4" aria-live="polite">
      {isMock ? <p className="notice">{zh ? "开发演示：未执行真实 AI 分析。" : "Development mock: no real AI analysis."}</p> : null}
      {result.schools.map(s => {
        const school = schools.find(c => c.id === s.school_id);
        if (!school) return null;
        return <article key={s.school_id} className="rounded-xl border border-line p-4">
          <h3 className="font-semibold"><a href={`/schools/${school.slug}`}>{school.name}</a> · {school.group}</h3>
          <p className="mt-2 text-sm">{s.why_fit}</p>
          <p className="mt-2 text-sm text-ink-soft"><strong>{zh ? "需要权衡：" : "Tradeoff: "}</strong>{s.tradeoff}</p>
          <p className="mt-2 text-sm"><strong>{zh ? "下一步：" : "Next step: "}</strong>{s.next_step}</p>
        </article>;
      })}
      <p className="text-sm text-ink-soft">{result.limitations}</p>
    </div> : null}
    <p className="mt-3 text-xs text-ink-soft">{zh?"AI 每次解释最多 13 所，按所选体系统筹抽取；完整的学科匹配清单见本页各体系。它不会为待评估学校编造录取分组。":"AI explains up to 13 schools per run, balanced across the selected systems. Full subject matches remain in each system section. Unassessed admission groups must stay unassessed."}</p>
    {gate.dialog}
  </section>;
}
