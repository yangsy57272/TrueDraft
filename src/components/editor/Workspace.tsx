"use client";
import Link from "next/link";
import { DropdownMenu, Tabs } from "radix-ui";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useI18n } from "@/i18n/client";
import { formatDate } from "@/i18n/translate";
import { apiFetch, runAiTool } from "@/lib/api-client";
import { ESSAY_STATUSES } from "@/lib/constants";
import { countWords } from "@/lib/wordcount";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toaster";
import { ConsentDialog } from "./ConsentDialog";
import { EssayForm, type EssayFormValues } from "./EssayForm";
import { FeedbackPanel, type LatestFeedback } from "./FeedbackPanel";
import { VersionsPanel } from "./VersionsPanel";
import { ToolsPanel } from "@/components/tools/ToolsPanel";
import type { SavedNote, WorkspaceAi, WorkspaceEssay, WorkspaceRun, WorkspaceVersion } from "./types";

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export type RunToolFn = (
  kind: string,
  body: Record<string, unknown>,
) => Promise<{ ok: true; runId: string; result: unknown; isMock: boolean; redactionCount: number } | { ok: false; code: string }>;

type Props = {
  essay: WorkspaceEssay;
  versions: WorkspaceVersion[];
  runs: WorkspaceRun[];
  latestFeedback: LatestFeedback | null;
  ai: WorkspaceAi;
  notes: SavedNote[];
};

export function Workspace({ essay, versions, runs, latestFeedback, ai, notes }: Props) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const notify = useToast();
  const uid = useId();

  const [draft, setDraft] = useState(essay.draft);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [selection, setSelection] = useState("");
  const [showPrompt, setShowPrompt] = useState(true);
  const [tab, setTab] = useState("feedback");
  const [consentCurrent, setConsentCurrent] = useState(ai.consentCurrent);
  const [consentOpen, setConsentOpen] = useState(false);
  const pendingRun = useRef<null | { run: () => void; cancel: () => void }>(null);
  const [versionDialog, setVersionDialog] = useState(false);
  const [versionNote, setVersionNote] = useState("");
  const [savingVersion, setSavingVersion] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [status, setStatus] = useState(essay.status);
  const [activeRun, setActiveRun] = useState<{ kind: string; stage: string } | null>(null);
  const [feedback, setFeedback] = useState<LatestFeedback | null>(latestFeedback);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // After a run completes the server re-renders with the stored result (incl. model and version).
  useEffect(() => {
    if (latestFeedback) setFeedback(latestFeedback);
  }, [latestFeedback?.runId]); // eslint-disable-line react-hooks/exhaustive-deps

  const draftRef = useRef(draft);
  draftRef.current = draft;
  const lastSaved = useRef(essay.draft);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const words = countWords(draft);
  const limit = essay.wordLimit;
  const latestVersion = versions[0];

  /* ------------------------------ autosave ------------------------------ */
  const save = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    const content = draftRef.current;
    if (content === lastSaved.current) {
      setSaveState((s) => (s === "dirty" ? "idle" : s));
      return true;
    }
    setSaveState("saving");
    const res = await apiFetch<{ savedAt: string }>(`/api/essays/${essay.id}/draft`, { method: "PUT", body: { draft: content } });
    if (res.ok) {
      lastSaved.current = content;
      setSavedAt(new Date(res.data.savedAt));
      setSaveState(draftRef.current === content ? "saved" : "dirty");
      return true;
    }
    setSaveState("error");
    return false;
  }, [essay.id]);

  useEffect(() => {
    if (draft === lastSaved.current) return;
    setSaveState("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(), 1200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [draft, save]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (draftRef.current !== lastSaved.current) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  // Grow the textarea with its content so the page scrolls naturally on every device.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 420)}px`;
  }, [draft]);

  function captureSelection() {
    const el = textareaRef.current;
    if (!el) return;
    const text = el.value.slice(el.selectionStart, el.selectionEnd).trim();
    if (text) setSelection(text);
  }

  /* ------------------------------ versions ------------------------------ */
  async function saveVersion(note: string | null) {
    setSavingVersion(true);
    await save();
    const res = await apiFetch<{ versionNumber: number; unchanged?: boolean }>(`/api/essays/${essay.id}/versions`, {
      method: "POST",
      body: { content: draftRef.current, note },
    });
    setSavingVersion(false);
    if (res.ok) {
      lastSaved.current = draftRef.current;
      setVersionDialog(false);
      setVersionNote("");
      notify(res.data.unchanged ? t("editor.noChangesSinceVersion") : t("editor.versionSaved", { n: res.data.versionNumber }), res.data.unchanged ? "info" : "success");
      router.refresh();
      return true;
    }
    notify(t(`errors.${res.code}` as never), "error");
    return false;
  }

  /* ------------------------------ AI runs ------------------------------- */
  const executeTool = useCallback(
    async (kind: string, body: Record<string, unknown>): ReturnType<RunToolFn> => {
      await save();
      setActiveRun({ kind, stage: "checking" });
      const result = await runAiTool(essay.id, kind, body, (stage) => setActiveRun({ kind, stage }));
      setActiveRun(null);
      if (!result.ok && result.code === "consent_required") setConsentCurrent(false);
      router.refresh();
      return result.ok ? result : { ok: false, code: result.code };
    },
    [essay.id, router, save],
  );

  /** Run an AI tool, first asking for consent if this account has not agreed to the current policy. */
  const runTool: RunToolFn = useCallback(
    async (kind, body) => {
      if (!ai.configured) return { ok: false, code: "ai_not_configured" };
      if (consentCurrent) return executeTool(kind, body);
      return new Promise((resolve) => {
        pendingRun.current = {
          run: () => void executeTool(kind, body).then(resolve),
          cancel: () => resolve({ ok: false, code: "cancelled" }),
        };
        setConsentOpen(true);
      });
    },
    [ai.configured, consentCurrent, executeTool],
  );

  async function getFeedback() {
    setFeedbackError(null);
    setTab("feedback");
    const result = await runTool("full_feedback", { content: draftRef.current });
    if (result.ok) {
      setFeedback({
        runId: result.runId,
        result: result.result as LatestFeedback["result"],
        createdAt: new Date().toISOString(),
        modelName: "",
        versionNumber: null,
        isMock: result.isMock,
        redactionCount: result.redactionCount,
      });
      lastSaved.current = draftRef.current;
    } else if (result.code !== "cancelled") {
      setFeedbackError(t(`errors.${result.code}` as never));
    }
  }

  async function agreeToConsent() {
    const res = await apiFetch("/api/consent", { method: "POST", body: { consentType: "ai_processing", action: "grant" } });
    if (!res.ok) {
      notify(t(`errors.${res.code}` as never), "error");
      return;
    }
    setConsentCurrent(true);
    const pending = pendingRun.current;
    pendingRun.current = null;
    setConsentOpen(false);
    pending?.run();
  }

  async function saveWithoutAi() {
    pendingRun.current?.cancel();
    pendingRun.current = null;
    setConsentOpen(false);
    if (draftRef.current.trim()) await saveVersion(null);
  }

  /* ------------------------------ meta ---------------------------------- */
  async function changeStatus(next: string) {
    setStatus(next);
    const res = await apiFetch(`/api/essays/${essay.id}`, { method: "PATCH", body: { status: next } });
    if (!res.ok) notify(t(`errors.${res.code}` as never), "error");
  }

  async function deleteEssay() {
    setDeleting(true);
    const res = await apiFetch(`/api/essays/${essay.id}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      lastSaved.current = draftRef.current;
      notify(t("dashboard.deleted"));
      router.push("/dashboard");
      router.refresh();
    } else notify(t(`errors.${res.code}` as never), "error");
  }

  async function duplicate() {
    const res = await apiFetch<{ id: string }>(`/api/essays/${essay.id}/duplicate`, { method: "POST" });
    if (res.ok) {
      notify(t("dashboard.duplicated"));
      router.push(`/essays/${res.data.id}`);
    } else notify(t(`errors.${res.code}` as never), "error");
  }

  function loadVersion(content: string) {
    setDraft(content);
    textareaRef.current?.focus();
  }

  const saveLabel =
    saveState === "saving"
      ? t("editor.autosave.saving")
      : saveState === "dirty"
        ? t("editor.autosave.unsaved")
        : saveState === "error"
          ? t("editor.autosave.error")
          : saveState === "saved" && savedAt
            ? t("editor.autosave.saved", { time: savedAt.toLocaleTimeString(locale === "zh-CN" ? "zh-CN" : "en-US", { hour: "2-digit", minute: "2-digit" }) })
            : t("editor.autosave.idle");

  const formInitial: Partial<EssayFormValues> = {
    title: essay.title,
    applicationType: essay.applicationType as EssayFormValues["applicationType"],
    promptText: essay.promptText,
    targetSchool: essay.targetSchool ?? "",
    wordLimit: essay.wordLimit ? String(essay.wordLimit) : "",
    feedbackLanguage: essay.feedbackLanguage,
    focusAreas: essay.focusAreas as EssayFormValues["focusAreas"],
    context: essay.context,
  };

  const busy = activeRun !== null;
  const menuItem = "cursor-pointer rounded-md px-3 py-2 text-sm outline-none data-[highlighted]:bg-paper-2";

  return (
    <div className="container-page py-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link href="/dashboard" className="text-sm">← {t("editor.backToDashboard")}</Link>
          <h1 className="mt-1 truncate text-2xl font-semibold sm:text-3xl">{essay.title}</h1>
          <p className="text-sm text-ink-soft">
            {t(`appType.${essay.applicationType}` as never)}
            {essay.targetSchool ? ` · ${essay.targetSchool}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={`${uid}-status`} className="sr-only">{t("editor.statusLabel")}</label>
          <select id={`${uid}-status`} className="input !min-h-9 !w-auto !py-1 text-sm" value={status} onChange={(e) => changeStatus(e.target.value)}>
            {ESSAY_STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}` as never)}</option>)}
          </select>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger className="btn btn-secondary btn-sm">{t("editor.export")} ▾</DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content align="end" sideOffset={4} className="z-40 min-w-56 rounded-lg border border-line bg-card p-1 shadow-lg">
                <DropdownMenu.Item className={menuItem} onSelect={async () => { await save(); window.location.href = `/api/essays/${essay.id}/export?format=md`; }}>
                  {t("editor.exportMd")}
                </DropdownMenu.Item>
                <DropdownMenu.Item className={menuItem} onSelect={async () => { await save(); window.location.href = `/api/essays/${essay.id}/export?format=txt`; }}>
                  {t("editor.exportTxt")}
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-1 h-px bg-line" />
                <DropdownMenu.Item className={menuItem} onSelect={duplicate}>{t("editor.duplicate")}</DropdownMenu.Item>
                <DropdownMenu.Item className={`${menuItem} text-coral-dark`} onSelect={() => setDeleteOpen(true)}>{t("editor.deleteEssay")}</DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>

      {!ai.configured ? <p className="notice notice-warn mt-4 text-sm">{t("editor.aiDisabled")}</p> : null}
      {ai.configured && ai.isMock ? <p className="notice notice-warn mt-4 text-sm">{t("editor.aiMock")}</p> : null}

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_26rem] xl:grid-cols-[minmax(0,1fr)_30rem]">
        {/* Editor column */}
        <div className="min-w-0">
          <section className="card p-4" aria-labelledby={`${uid}-prompt`}>
            <div className="flex items-center justify-between gap-2">
              <h2 id={`${uid}-prompt`} className="font-sans text-sm font-semibold uppercase tracking-wide text-ink-soft">{t("editor.promptHeading")}</h2>
              <button type="button" className="btn btn-ghost btn-sm" aria-expanded={showPrompt} aria-controls={`${uid}-prompt-body`} onClick={() => setShowPrompt((v) => !v)}>
                {showPrompt ? t("editor.hidePrompt") : t("editor.showPrompt")}
              </button>
            </div>
            <p id={`${uid}-prompt-body`} hidden={!showPrompt} className="mt-2 whitespace-pre-wrap">{essay.promptText}</p>
          </section>

          <div className="mt-4">
            <label htmlFor={`${uid}-editor`} className="sr-only">{t("editor.editorLabel")}</label>
            <textarea
              id={`${uid}-editor`}
              ref={textareaRef}
              className="paper-lines block w-full resize-none rounded-[var(--radius-card)] border border-line bg-card px-4 py-4 font-serif text-[1.075rem] leading-8 text-ink focus-visible:outline-3 focus-visible:outline-focus sm:px-6"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onSelect={captureSelection}
              onKeyUp={captureSelection}
              onMouseUp={captureSelection}
              onBlur={() => void save()}
              spellCheck
              aria-describedby={`${uid}-wc ${uid}-save`}
            />
          </div>

          <div className="sticky bottom-0 z-10 -mx-1 mt-3 rounded-xl border border-line bg-paper/95 px-3 py-3 shadow-[0_-4px_12px_rgba(27,40,56,0.04)] backdrop-blur-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm">
                <p id={`${uid}-wc`} aria-live="polite" className="font-medium">
                  {limit ? t("editor.wordCountOf", { count: words, limit }) : t("editor.wordCount", { count: words })}
                  {limit ? (
                    <span className={`ml-2 ${words > limit ? "text-amber" : "text-ink-soft"}`}>
                      ({words > limit ? t("editor.overBy", { count: words - limit }) : t("editor.remaining", { count: limit - words })})
                    </span>
                  ) : null}
                </p>
                <p id={`${uid}-save`} className={`text-xs ${saveState === "error" ? "text-coral-dark" : "text-ink-soft"}`} role="status">
                  {saveLabel}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setVersionDialog(true)} disabled={!draft.trim()}>
                  {t("editor.saveVersion")}
                </button>
                <button type="button" className="btn btn-accent btn-sm" onClick={getFeedback} disabled={!ai.configured || busy || !draft.trim()} aria-describedby={`${uid}-privacy`}>
                  {busy && activeRun?.kind === "full_feedback" ? t("tools.running") : t("editor.getFeedback")}
                </button>
              </div>
            </div>
            {ai.configured ? (
              <p id={`${uid}-privacy`} className="mt-2 text-xs text-ink-soft">
                {t("editor.feedbackPrivacy", { provider: ai.providerName ?? "—" })}{" "}
                <Link href="/privacy">{t("editor.feedbackPrivacyLink")}</Link>
              </p>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-ink-faint">{t("editor.wordCountNote")}</p>
          <a href={`#${uid}-panel`} className="btn btn-secondary btn-sm mt-3 lg:hidden">{t("editor.openPanel")} ↓</a>
        </div>

        {/* Side panel */}
        <aside id={`${uid}-panel`} aria-label={t("editor.panelLabel")} className="min-w-0 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto">
          <Tabs.Root value={tab} onValueChange={setTab}>
            <Tabs.List className="flex gap-1 overflow-x-auto rounded-xl border border-line bg-paper-2 p-1" aria-label={t("editor.panelLabel")}>
              {(["feedback", "tools", "versions", "details"] as const).map((k) => (
                <Tabs.Trigger
                  key={k}
                  value={k}
                  className="min-h-10 flex-1 whitespace-nowrap rounded-lg px-3 text-sm font-semibold text-ink-soft data-[state=active]:bg-card data-[state=active]:text-ink data-[state=active]:shadow-sm"
                >
                  {t(`editor.tabs.${k}` as never)}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
            <Tabs.Content value="feedback" className="mt-4 focus-visible:outline-none">
              <FeedbackPanel
                essayId={essay.id}
                feedback={feedback}
                runs={runs}
                versions={versions}
                activeRun={activeRun}
                error={feedbackError}
                onRetry={getFeedback}
                aiConfigured={ai.configured}
                onDeletedAll={() => setFeedback(null)}
              />
            </Tabs.Content>
            <Tabs.Content value="tools" className="mt-4 focus-visible:outline-none" forceMount hidden={tab !== "tools"}>
              <ToolsPanel
                essayId={essay.id}
                runTool={runTool}
                activeRun={activeRun}
                selection={selection}
                onUseSelection={captureSelection}
                words={words}
                wordLimit={limit}
                aiConfigured={ai.configured}
                notes={notes}
                getDraft={() => draftRef.current}
              />
            </Tabs.Content>
            <Tabs.Content value="versions" className="mt-4 focus-visible:outline-none">
              <VersionsPanel essayId={essay.id} versions={versions} onLoad={loadVersion} />
            </Tabs.Content>
            <Tabs.Content value="details" className="mt-4 focus-visible:outline-none">
              <div className="card p-4">
                <h2 className="text-lg font-semibold">{t("essayForm.editTitle")}</h2>
                <div className="mt-4">
                  <EssayForm mode={{ kind: "edit", essayId: essay.id }} initial={formInitial} defaultLanguage={essay.feedbackLanguage} />
                </div>
              </div>
              <div className="card mt-4 p-4">
                <button type="button" className="btn btn-danger w-full" onClick={() => setDeleteOpen(true)}>
                  {t("editor.deleteEssay")}
                </button>
              </div>
            </Tabs.Content>
          </Tabs.Root>
          <p className="mt-4 text-xs text-ink-soft">{t("disclaimer.main")}</p>
          <p className="mt-2 text-xs text-ink-faint">{t("common.lastEdited", { date: formatDate(essay.updatedAt, locale, true) })}</p>
        </aside>
      </div>

      <ConsentDialog
        open={consentOpen}
        onOpenChange={(o) => {
          setConsentOpen(o);
          if (!o) {
            pendingRun.current?.cancel();
            pendingRun.current = null;
          }
        }}
        ai={ai}
        onAgree={agreeToConsent}
        onSaveOnly={saveWithoutAi}
      />

      <Dialog
        open={versionDialog}
        onOpenChange={setVersionDialog}
        title={t("editor.saveVersion")}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setVersionDialog(false)}>{t("common.cancel")}</button>
            <button type="button" className="btn btn-primary" disabled={savingVersion} onClick={() => saveVersion(versionNote.trim() || null)}>
              {savingVersion ? t("common.saving") : t("editor.saveVersion")}
            </button>
          </>
        }
      >
        <label htmlFor={`${uid}-note`} className="field-label">{t("editor.versionNote")} <span className="font-normal text-ink-faint">({t("common.optional")})</span></label>
        <input id={`${uid}-note`} className="input" maxLength={200} value={versionNote} onChange={(e) => setVersionNote(e.target.value)} aria-describedby={`${uid}-note-help`} />
        <p id={`${uid}-note-help`} className="field-help">{t("editor.versionNoteHelp")}</p>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("dashboard.deleteTitle")}
        body={t("dashboard.deleteBody", { title: essay.title })}
        confirmLabel={t("dashboard.deleteConfirm")}
        busy={deleting}
        onConfirm={deleteEssay}
      />
    </div>
  );
}
