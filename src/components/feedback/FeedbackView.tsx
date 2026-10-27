"use client";
import { useId } from "react";
import { useI18n } from "@/i18n/client";
import type { FullFeedback } from "@/server/ai/schemas";
import { DiagnosticBadge, PriorityBadge, QuoteBlock, Section, ZhNote } from "./bits";

type Located = { located?: boolean };
export type FullFeedbackResult = Omit<FullFeedback, "strengths" | "categories" | "passage_comments"> & {
  strengths: (FullFeedback["strengths"][number] & Located)[];
  categories: (FullFeedback["categories"][number] & Located)[];
  passage_comments: (FullFeedback["passage_comments"][number] & Located)[];
  computed?: { wordCount: number; wordLimit: number | null };
};

const ALIGNMENT_ICON: Record<string, string> = { responds: "✓", partly: "◐", not_yet: "○", unclear: "?" };

/** Renders the five-part structured feedback. All text is rendered as React text (escaped). */
export function FeedbackView({ data, compact = false }: { data: FullFeedbackResult; compact?: boolean }) {
  const { t } = useI18n();
  const uid = useId();
  const pad = compact ? "p-4" : "p-5";

  return (
    <div className="text-[0.975rem]">
      <Section title={`A. ${t("feedback.overall")}`} id={`${uid}-a`}>
        <p>{data.summary}</p>
        <h4 className="mt-4 font-semibold">{t("feedback.strengths")}</h4>
        <ul className="mt-2 space-y-3">
          {data.strengths.map((s, i) => (
            <li key={i} className={`card ${pad}`}>
              <p>{s.point}</p>
              <QuoteBlock quote={s.evidence_quote} located={s.located ?? true} />
            </li>
          ))}
        </ul>
        <div className={`card mt-4 border-coral/40 bg-coral-soft/40 ${pad}`}>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-coral-dark">{t("feedback.primaryPriority")}</h4>
          <p className="mt-1 font-serif text-lg font-semibold">{data.primary_priority.title}</p>
          <p className="mt-1">{data.primary_priority.explanation}</p>
          <ZhNote text={data.primary_priority.zh_note} />
        </div>
        <div className="mt-4">
          <h4 className="font-semibold">{t("feedback.promptAlignment")}</h4>
          <p className="mt-1">
            <span className="badge badge-neutral mr-2">
              <span aria-hidden="true">{ALIGNMENT_ICON[data.prompt_alignment.status] ?? "?"}</span>
              {t(`feedback.alignment.${data.prompt_alignment.status}` as never)}
            </span>
            {data.prompt_alignment.explanation}
          </p>
        </div>
      </Section>

      <Section title={`B. ${t("feedback.diagnostic")}`} id={`${uid}-b`}>
        <p className="text-sm text-ink-soft">{t("feedback.diagnosticNote")}</p>
        <ul className="mt-3 grid gap-3 md:grid-cols-2">
          {data.categories.map((c) => (
            <li key={c.key} className={`card ${pad}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-semibold">{t(`feedback.category.${c.key}` as never)}</h4>
                <DiagnosticBadge label={c.label} />
              </div>
              <p className="mt-2 text-sm">{c.explanation}</p>
              <p className="mt-2 text-sm">
                <strong>{t("feedback.nextStep")}:</strong> {c.next_step}
              </p>
              <QuoteBlock quote={c.passage_quote} located={c.located ?? true} />
              <ZhNote text={c.zh_note} />
            </li>
          ))}
        </ul>
      </Section>

      <Section title={`C. ${t("feedback.passages")}`} id={`${uid}-c`}>
        <ol className="space-y-3">
          {data.passage_comments.map((p, i) => (
            <li key={i} className={`card ${pad}`}>
              <div className="flex flex-wrap items-center gap-2">
                <PriorityBadge priority={p.priority} />
              </div>
              <QuoteBlock quote={p.quote} located={p.located ?? true} />
              <p className="mt-3">{p.observation}</p>
              <p className="mt-2 text-sm">
                <strong>{t("feedback.whyItMatters")}:</strong> {p.why_it_matters}
              </p>
              <p className="mt-2 text-sm">
                <strong>{t("feedback.tryThis")}:</strong> {p.revision_question}
              </p>
              <ZhNote text={p.zh_note} />
            </li>
          ))}
        </ol>
      </Section>

      <Section title={`D. ${t("feedback.revisionPlan")}`} id={`${uid}-d`}>
        <ol className="space-y-2">
          {data.revision_plan.map((r, i) => (
            <li key={i} className={`card flex gap-3 ${pad}`}>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal text-sm font-bold text-white" aria-hidden="true">
                {i + 1}
              </span>
              <div>
                <p className="font-medium">{r.task}</p>
                <p className="mt-1 text-sm text-ink-soft">
                  {t("feedback.whyTask")}: {r.why}
                </p>
                <ZhNote text={r.zh_note} />
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section title={`E. ${t("feedback.voiceCheck")}`} id={`${uid}-e`}>
        <ul className="space-y-2">
          {data.voice_check.map((v, i) => (
            <li key={i} className={`card ${pad}`}>
              <p className="font-medium">{v.question}</p>
              {v.note ? <p className="mt-1 text-sm text-ink-soft">{v.note}</p> : null}
            </li>
          ))}
        </ul>
        {data.questions_for_student.length ? (
          <>
            <h4 className="mt-5 font-semibold">{t("feedback.questions")}</h4>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {data.questions_for_student.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </>
        ) : null}
        <h4 className="mt-5 font-semibold">{t("feedback.limitations")}</h4>
        <p className="mt-1 text-sm text-ink-soft">{data.limitations}</p>
      </Section>
    </div>
  );
}
