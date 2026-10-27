"use client";
import { useI18n } from "@/i18n/client";

const FULL = ["checking", "structure", "detail", "priorities"] as const;
const TOOL = ["checking", "reviewing", "preparing"] as const;

/** Honest progress: shows which real processing stage is underway. No fake percentages. */
export function ProgressStages({ stage, kind }: { stage: string; kind: string }) {
  const { t } = useI18n();
  const stages: readonly string[] = kind === "full_feedback" ? FULL : TOOL;
  const current = Math.max(0, stages.indexOf(stage));
  return (
    <div className="card p-4" role="status" aria-live="polite">
      <p className="font-semibold">{t("feedback.stages.title")}</p>
      <ol className="mt-3 space-y-2">
        {stages.map((s, i) => {
          const state = i < current ? "done" : i === current ? "active" : "todo";
          return (
            <li key={s} className={`flex items-center gap-3 text-sm ${state === "todo" ? "text-ink-faint" : ""}`} aria-current={state === "active" ? "step" : undefined}>
              {state === "done" ? (
                <span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded-full bg-teal text-xs text-white">✓</span>
              ) : state === "active" ? (
                <span aria-hidden="true" className="spinner text-teal" />
              ) : (
                <span aria-hidden="true" className="h-5 w-5 rounded-full border border-line-strong" />
              )}
              <span className={state === "active" ? "font-semibold" : ""}>{t(`feedback.stages.${s}` as never)}</span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-xs text-ink-soft">{t("feedback.stages.note")}</p>
    </div>
  );
}
