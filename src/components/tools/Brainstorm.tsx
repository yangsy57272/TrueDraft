"use client";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useI18n } from "@/i18n/client";
import { formatDate } from "@/i18n/translate";
import { apiFetch } from "@/lib/api-client";
import type { Brainstorm as BrainstormResult } from "@/server/ai/schemas";
import { BoundaryNote } from "@/components/feedback/bits";
import { ProgressStages } from "@/components/editor/ProgressStages";
import { useToast } from "@/components/ui/Toaster";
import type { RunToolFn } from "@/components/editor/Workspace";
import type { BrainstormTurn, SavedNote } from "@/components/editor/types";

type Props = {
  essayId: string;
  runTool: RunToolFn;
  activeRun: { kind: string; stage: string } | null;
  aiConfigured: boolean;
  notes: SavedNote[];
};

/** Brainstorming conversation. Nothing is stored unless the student clicks "Save notes". */
export function Brainstorm({ essayId, runTool, activeRun, aiConfigured, notes }: Props) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const notify = useToast();
  const uid = useId();
  const [turns, setTurns] = useState<BrainstormTurn[]>([]);
  const [threads, setThreads] = useState<string[]>([]);
  const [boundary, setBoundary] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isMock, setIsMock] = useState(false);
  const busy = activeRun !== null;

  async function ask(conversation: BrainstormTurn[]) {
    setError(null);
    const res = await runTool("brainstorm", { conversation });
    if (!res.ok) {
      if (res.code !== "cancelled") setError(t(`errors.${res.code}` as never));
      return false;
    }
    const data = res.result as BrainstormResult;
    setIsMock(res.isMock);
    const coachText = [data.acknowledgement, ...data.questions].filter(Boolean).join("\n\n");
    setTurns([...conversation, { role: "coach", text: coachText }]);
    setThreads(data.threads_noticed);
    setBoundary(data.boundary_note);
    return true;
  }

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const text = answer.trim();
    if (!text) return;
    const next = [...turns, { role: "student" as const, text }];
    setTurns(next);
    setAnswer("");
    const ok = await ask(next);
    if (!ok) {
      setTurns(turns);
      setAnswer(text);
    }
  }

  async function saveNotes() {
    const res = await apiFetch(`/api/essays/${essayId}/brainstorm-notes`, { method: "POST", body: { turns } });
    if (res.ok) {
      notify(t("tools.brainstorm.saved"));
      router.refresh();
    } else notify(t(`errors.${res.code}` as never), "error");
  }

  async function deleteNote(id: string) {
    const res = await apiFetch(`/api/essays/${essayId}/brainstorm-notes/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
    else notify(t(`errors.${res.code}` as never), "error");
  }

  return (
    <div>
      {activeRun?.kind === "brainstorm" ? <div className="mb-3"><ProgressStages stage={activeRun.stage} kind="brainstorm" /></div> : null}
      {isMock ? <p className="notice notice-warn mb-3 text-sm">{t("feedback.mockBanner")}</p> : null}
      {turns.length === 0 ? (
        <button type="button" className="btn btn-primary btn-sm" disabled={!aiConfigured || busy} onClick={() => ask([])}>
          {t("tools.brainstorm.start")}
        </button>
      ) : (
        <>
          <ol className="space-y-3" aria-live="polite">
            {turns.map((turn, i) => (
              <li key={i} className={`rounded-lg p-3 text-sm ${turn.role === "coach" ? "bg-teal-soft/60" : "ml-6 border border-line bg-card"}`}>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  {turn.role === "coach" ? t("tools.brainstorm.coach") : t("tools.brainstorm.you")}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{turn.text}</p>
              </li>
            ))}
          </ol>
          <BoundaryNote text={boundary} />
          {threads.length ? (
            <div className="mt-3">
              <p className="text-sm font-semibold">{t("tools.brainstorm.threads")}</p>
              <ul className="mt-1 list-disc pl-5 text-sm">
                {threads.map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            </div>
          ) : null}
          <form onSubmit={send} className="mt-3">
            <label htmlFor={`${uid}-answer`} className="field-label">{t("tools.brainstorm.answerLabel")}</label>
            <textarea id={`${uid}-answer`} className="input" rows={4} maxLength={2000} value={answer} onChange={(e) => setAnswer(e.target.value)} aria-describedby={`${uid}-answer-help`} />
            <p id={`${uid}-answer-help`} className="field-help">{t("tools.brainstorm.answerHelp")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="submit" className="btn btn-primary btn-sm" disabled={!aiConfigured || busy || !answer.trim()}>{t("tools.brainstorm.send")}</button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={saveNotes} disabled={busy}>{t("tools.brainstorm.save")}</button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setTurns([]);
                  setThreads([]);
                  setBoundary(null);
                }}
              >
                {t("tools.brainstorm.reset")}
              </button>
            </div>
            <p className="mt-2 text-xs text-ink-soft">{t("tools.brainstorm.notSavedYet")}</p>
          </form>
        </>
      )}
      {error ? <p className="notice notice-error mt-3 text-sm" role="alert">{error}</p> : null}

      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-semibold">{t("tools.brainstorm.savedNotes")} ({notes.length})</summary>
        {notes.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">{t("tools.brainstorm.noSavedNotes")}</p>
        ) : (
          <ul className="mt-2 space-y-3">
            {notes.map((n) => (
              <li key={n.id} className="rounded-lg border border-line p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-ink-soft">{formatDate(n.createdAt, locale, true)}</span>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => deleteNote(n.id)}>{t("tools.brainstorm.deleteNote")}</button>
                </div>
                <ol className="mt-2 space-y-2">
                  {n.turns.map((turn, i) => (
                    <li key={i}>
                      <span className="font-semibold">{turn.role === "coach" ? t("tools.brainstorm.coach") : t("tools.brainstorm.you")}: </span>
                      <span className="whitespace-pre-wrap">{turn.text}</span>
                    </li>
                  ))}
                </ol>
              </li>
            ))}
          </ul>
        )}
      </details>
    </div>
  );
}
