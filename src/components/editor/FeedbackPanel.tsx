"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { formatDate } from "@/i18n/translate";
import { apiFetch } from "@/lib/api-client";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toaster";
import { FeedbackView, type FullFeedbackResult } from "@/components/feedback/FeedbackView";
import { ProgressStages } from "./ProgressStages";
import type { WorkspaceRun, WorkspaceVersion } from "./types";

export type LatestFeedback = {
  runId: string;
  result: FullFeedbackResult;
  createdAt: string;
  modelName: string;
  versionNumber: number | null;
  isMock: boolean;
  redactionCount: number;
};

type Props = {
  essayId: string;
  feedback: LatestFeedback | null;
  runs: WorkspaceRun[];
  versions: WorkspaceVersion[];
  activeRun: { kind: string; stage: string } | null;
  error: string | null;
  onRetry: () => void;
  aiConfigured: boolean;
  onDeletedAll: () => void;
};

export function FeedbackPanel({ essayId, feedback, runs, versions, activeRun, error, onRetry, aiConfigured, onDeletedAll }: Props) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const notify = useToast();
  const [confirmAll, setConfirmAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const versionById = new Map(versions.map((v) => [v.id, v.versionNumber]));

  async function deleteAll() {
    setBusy(true);
    const res = await apiFetch(`/api/essays/${essayId}/feedback`, { method: "DELETE" });
    setBusy(false);
    setConfirmAll(false);
    if (res.ok) {
      notify(t("feedback.deletedAll"));
      onDeletedAll();
      router.refresh();
    } else notify(t(`errors.${res.code}` as never), "error");
  }

  async function deleteOne(runId: string) {
    const res = await apiFetch(`/api/essays/${essayId}/feedback/${runId}`, { method: "DELETE" });
    if (res.ok) {
      notify(t("feedback.deleted"));
      if (feedback?.runId === runId) onDeletedAll();
      router.refresh();
    } else notify(t(`errors.${res.code}` as never), "error");
  }

  return (
    <div className="space-y-4">
      {activeRun?.kind === "full_feedback" ? <ProgressStages stage={activeRun.stage} kind="full_feedback" /> : null}
      {error ? (
        <div className="notice notice-error" role="alert">
          <p>{error}</p>
          {aiConfigured ? (
            <button type="button" className="btn btn-secondary btn-sm mt-2" onClick={onRetry}>{t("common.tryAgain")}</button>
          ) : null}
        </div>
      ) : null}

      {feedback && !activeRun ? (
        <div>
          {feedback.isMock ? <p className="notice notice-warn mb-3 text-sm" role="note">{feedback.isMock ? t("feedback.mockBanner") : null}</p> : null}
          <p className="text-xs text-ink-soft">
            {feedback.versionNumber
              ? t("feedback.meta", { version: feedback.versionNumber, date: formatDate(feedback.createdAt, locale, true), model: feedback.modelName })
              : t("feedback.metaNoVersion", { date: formatDate(feedback.createdAt, locale, true), model: feedback.modelName })}
          </p>
          {feedback.redactionCount ? <p className="mt-1 text-xs text-ink-soft">{t("feedback.redactedNote", { count: feedback.redactionCount })}</p> : null}
          <p className="notice mt-2 text-sm">{t("feedback.aiNote")}</p>
          <div className="mt-4">
            <FeedbackView data={feedback.result} compact />
          </div>
          <Link href={`/essays/${essayId}/feedback/${feedback.runId}`} className="btn btn-secondary btn-sm mt-4">{t("feedback.viewFull")}</Link>
        </div>
      ) : null}

      {!feedback && !activeRun && !error ? (
        <div className="card p-5">
          <h2 className="text-lg font-semibold">{t("feedback.emptyTitle")}</h2>
          <p className="mt-2 text-sm text-ink-soft">{t("feedback.emptyBody")}</p>
        </div>
      ) : null}

      <section className="card p-4" aria-labelledby="fb-history">
        <h2 id="fb-history" className="text-base font-semibold">{t("feedback.history")}</h2>
        {runs.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">{t("feedback.historyEmpty")}</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {runs.map((r) => {
              const v = r.essayVersionId ? versionById.get(r.essayVersionId) : null;
              return (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {t(`feedback.kind.${r.kind}` as never)}
                      {v ? ` · ${t("common.version", { n: v })}` : ""}
                    </p>
                    <p className="text-xs text-ink-soft">
                      {formatDate(r.createdAt, locale, true)}
                      {r.status === "failed" ? ` · ${t("feedback.failed")}` : r.status === "pending" ? ` · ${t("feedback.pending")}` : ""}
                      {r.provider === "mock" ? " · mock" : ""}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {r.status === "completed" ? (
                      <Link href={`/essays/${essayId}/feedback/${r.id}`} className="btn btn-ghost btn-sm">{t("feedback.open")}</Link>
                    ) : null}
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => deleteOne(r.id)} aria-label={`${t("feedback.deleteRun")}: ${t(`feedback.kind.${r.kind}` as never)}, ${formatDate(r.createdAt, locale, true)}`}>
                      {t("common.delete")}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {runs.length ? (
          <button type="button" className="btn btn-danger btn-sm mt-3" onClick={() => setConfirmAll(true)}>{t("feedback.deleteAll")}</button>
        ) : null}
      </section>
      <ConfirmDialog
        open={confirmAll}
        onOpenChange={setConfirmAll}
        title={t("feedback.deleteAll")}
        body={t("feedback.deleteAllConfirm")}
        confirmLabel={t("common.delete")}
        busy={busy}
        onConfirm={deleteAll}
      />
    </div>
  );
}
