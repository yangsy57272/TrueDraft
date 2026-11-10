"use client";
import { useI18n } from "@/i18n/client";
import type { AiProgress } from "@/lib/ai-progress";

const FULL = ["checking", "structure", "detail", "priorities"] as const;
const TOOL = ["checking", "reviewing", "preparing"] as const;

export function ProgressStages({ progress, kind }: { progress: AiProgress; kind: string }) {
  const { t, locale } = useI18n();
  const stages: readonly string[] = kind === "full_feedback" ? FULL : TOOL;
  const current = Math.max(0, stages.indexOf(progress.stage));
  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="font-semibold">{t("feedback.stages.title")}</p>
        <p className="text-sm tabular-nums text-ink-soft">
          {t("feedback.stages.generated", { count: progress.generatedChars.toLocaleString(locale) })}
        </p>
      </div>
      <ol className="mt-3 space-y-2" aria-live="polite">
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
