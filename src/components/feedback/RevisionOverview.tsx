"use client";
import { useId, useState } from "react";
import { useI18n } from "@/i18n/client";
import { formatDate } from "@/i18n/translate";
import { apiFetch } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toaster";
import { DiagnosticBadge, ZhNote } from "./bits";
import type { FullFeedbackResult } from "./FeedbackView";

type TaskState = "todo" | "doing" | "done";
const STATES: TaskState[] = ["todo", "doing", "done"];
const RANK: Record<string, number> = { needs_attention: 0, developing: 1, strong_foundation: 2 };

type Props = {
  essayId: string;
  runId: string;
  data: FullFeedbackResult;
  versionNumber: number | null;
  /** Text the feedback was given on; compared with the live draft to flag stale feedback. */
  versionContent: string | null | undefined;
  draft: string;
  taskStates?: Record<string, TaskState>;
  previous?: { createdAt: string; versionNumber: number | null; categories: { key: string; label: string }[] } | null;
  onRequestNew?: () => void;
  canRequestNew: boolean;
};

/**
 * The compact, actionable top of the feedback panel: is this feedback still about the current text,
 * what to do first, the revision tasks with the student's own progress, and how the diagnosis
 * changed since the previous report. Full detail stays available in the collapsible sections below.
 */
export function RevisionOverview({ essayId, runId, data, versionNumber, versionContent, draft, taskStates = {}, previous, onRequestNew, canRequestNew }: Props) {
  const { t, locale } = useI18n();
  const notify = useToast();
  const uid = useId();
  const [states, setStates] = useState<Record<string, TaskState>>(taskStates);
  const stale = versionContent != null && versionContent !== draft;
  const done = data.revision_plan.filter((_, i) => states[String(i)] === "done").length;
  const prevLabel = new Map(previous?.categories.map((c) => [c.key, c.label]) ?? []);

  async function setState(index: number, state: TaskState) {
    const key = String(index);
    const before = states[key] ?? "todo";
    setStates((cur) => ({ ...cur, [key]: state }));
    const res = await apiFetch<{ taskStates: Record<string, TaskState> }>(`/api/essays/${essayId}/feedback/${runId}/tasks/${index}`, {
      method: "PUT",
      body: { state },
    });
    if (res.ok) {
      // Keep any newer local choice for other tasks; take the server's value for this one.
      setStates((cur) => ({ ...cur, [key]: res.data.taskStates[key] ?? state }));
    } else {
      setStates((cur) => (cur[key] === state ? { ...cur, [key]: before } : cur));
      notify(t(`errors.${res.code}` as never), "error");
    }
  }

  if (data.material === "insufficient") return null;

  return (
    <div className="space-y-4">
      {stale ? (
        <div className="notice notice-warn text-sm" role="status">
          <p>{versionNumber ? t("feedback.staleVersion", { n: versionNumber }) : t("feedback.staleDraft")}</p>
          {canRequestNew && onRequestNew ? (
            <button type="button" className="btn btn-secondary btn-sm mt-2" onClick={onRequestNew}>{t("feedback.refreshForCurrent")}</button>
          ) : null}
        </div>
      ) : null}

      <div className="card border-coral/40 bg-coral-soft/40 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-coral-dark">{t("feedback.primaryPriority")}</h3>
        <p className="mt-1 font-serif text-lg font-semibold">{data.primary_priority.title}</p>
        <p className="mt-1 text-sm">{data.primary_priority.explanation}</p>
        <ZhNote text={data.primary_priority.zh_note} />
      </div>

      <section className="card p-4" aria-labelledby={`${uid}-tasks`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id={`${uid}-tasks`} className="font-serif text-base font-semibold">{t("feedback.yourTasks")}</h3>
          <p className="text-xs text-ink-soft" role="status">{t("feedback.tasksDone", { done, total: data.revision_plan.length })}</p>
        </div>
        <ol className="mt-3 space-y-3">
          {data.revision_plan.map((r, i) => {
            const state = states[String(i)] ?? "todo";
            return (
              <li key={i} className="flex gap-3">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${state === "done" ? "bg-teal text-white" : "bg-paper-2 text-ink"}`} aria-hidden="true">
                  {state === "done" ? "✓" : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`font-medium ${state === "done" ? "text-ink-soft line-through" : ""}`}>{r.task}</p>
                  <p className="mt-0.5 text-sm text-ink-soft">{t("feedback.whyTask")}: {r.why}</p>
                  <label htmlFor={`${uid}-t${i}`} className="sr-only">{t("feedback.taskStateLabel", { n: i + 1 })}</label>
                  <select id={`${uid}-t${i}`} className="input mt-2 !min-h-9 !w-auto !py-1 text-sm" value={state} onChange={(e) => void setState(i, e.target.value as TaskState)}>
                    {STATES.map((s) => <option key={s} value={s}>{t(`feedback.taskState.${s}` as never)}</option>)}
                  </select>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="card p-4" aria-labelledby={`${uid}-glance`}>
        <h3 id={`${uid}-glance`} className="font-serif text-base font-semibold">{t("feedback.atAGlance")}</h3>
        {previous ? (
          <p className="mt-1 text-xs text-ink-soft">
            {previous.versionNumber
              ? t("feedback.comparedWith", { n: previous.versionNumber, date: formatDate(previous.createdAt, locale) })
              : t("feedback.comparedWithNoVersion", { date: formatDate(previous.createdAt, locale) })}
          </p>
        ) : null}
        <ul className="mt-2 divide-y divide-line">
          {data.categories.map((c) => {
            const before = prevLabel.get(c.key);
            const change = before == null || before === c.label ? null : RANK[c.label] > RANK[before] ? "up" : "down";
            return (
              <li key={c.key} className="flex flex-wrap items-center justify-between gap-2 py-1.5 text-sm">
                <span>{t(`feedback.category.${c.key}` as never)}</span>
                <span className="flex items-center gap-2">
                  {change ? (
                    <span className={`text-xs ${change === "up" ? "text-teal" : "text-amber"}`}>
                      <span aria-hidden="true">{change === "up" ? "↑ " : "↓ "}</span>
                      {t("feedback.wasLabel", { label: t(`feedback.label.${before}` as never) })}
                    </span>
                  ) : null}
                  <DiagnosticBadge label={c.label} />
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-xs text-ink-faint">{t("feedback.labelsNote")}</p>
      </section>
    </div>
  );
}
