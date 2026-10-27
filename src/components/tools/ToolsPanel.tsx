"use client";
import { Accordion } from "radix-ui";
import { useId, useState, type ReactNode } from "react";
import { useI18n } from "@/i18n/client";
import type { PromptDecoder } from "@/server/ai/schemas";
import { SENTENCE_MODES, type SentenceMode } from "@/lib/constants";
import { PromptDecoderView, SentenceView, WordCountView, FinalReadView, type SentenceResult, type WordCountResult, type FinalReadResult } from "@/components/feedback/ToolResults";
import { ProgressStages } from "@/components/editor/ProgressStages";
import type { RunToolFn } from "@/components/editor/Workspace";
import type { SavedNote } from "@/components/editor/types";
import { Brainstorm } from "./Brainstorm";

type Props = {
  essayId: string;
  runTool: RunToolFn;
  activeRun: { kind: string; stage: string } | null;
  selection: string;
  onUseSelection: () => void;
  words: number;
  wordLimit: number | null;
  aiConfigured: boolean;
  notes: SavedNote[];
  getDraft: () => string;
};

const MAX_SELECTION = 1200;

function ToolShell({ value, title, desc, children }: { value: string; title: string; desc: string; children: ReactNode }) {
  return (
    <Accordion.Item value={value} className="card overflow-hidden">
      <Accordion.Header>
        <Accordion.Trigger className="group flex w-full items-start justify-between gap-3 p-4 text-left hover:bg-paper-2">
          <span>
            <span className="block font-semibold">{title}</span>
            <span className="mt-0.5 block text-sm text-ink-soft">{desc}</span>
          </span>
          <span aria-hidden="true" className="mt-1 text-teal transition-transform group-data-[state=open]:rotate-45">+</span>
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Content className="border-t border-line p-4">{children}</Accordion.Content>
    </Accordion.Item>
  );
}

function useToolRun<T>(runTool: RunToolFn, kind: string) {
  const { t } = useI18n();
  const [result, setResult] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMock, setIsMock] = useState(false);
  async function run(body: Record<string, unknown>) {
    setError(null);
    const res = await runTool(kind, body);
    if (res.ok) {
      setResult(res.result as T);
      setIsMock(res.isMock);
    } else if (res.code !== "cancelled") setError(t(`errors.${res.code}` as never));
  }
  return { result, error, isMock, run };
}

export function ToolsPanel({ essayId, runTool, activeRun, selection, onUseSelection, words, wordLimit, aiConfigured, notes, getDraft }: Props) {
  const { t } = useI18n();
  const uid = useId();
  const decoder = useToolRun<PromptDecoder>(runTool, "prompt_decoder");
  const sentence = useToolRun<SentenceResult>(runTool, "sentence");
  const wordCount = useToolRun<WordCountResult>(runTool, "word_count");
  const finalRead = useToolRun<FinalReadResult>(runTool, "final_read");
  const [mode, setMode] = useState<SentenceMode>("clearer");
  const busy = activeRun !== null;
  const tooLong = selection.length > MAX_SELECTION;

  const Progress = ({ kind }: { kind: string }) => (activeRun?.kind === kind ? <div className="mb-3"><ProgressStages stage={activeRun.stage} kind={kind} /></div> : null);
  const Err = ({ msg }: { msg: string | null }) => (msg ? <p className="notice notice-error mt-3 text-sm" role="alert">{msg}</p> : null);
  const Mock = ({ on }: { on: boolean }) => (on ? <p className="notice notice-warn mb-3 text-sm">{t("feedback.mockBanner")}</p> : null);

  return (
    <div>
      <p className="text-sm text-ink-soft">{t("tools.intro")}</p>
      <Accordion.Root type="multiple" className="mt-3 space-y-3">
        <ToolShell value="decoder" title={t("tools.promptDecoder.title")} desc={t("tools.promptDecoder.desc")}>
          <Progress kind="prompt_decoder" />
          <button type="button" className="btn btn-primary btn-sm" disabled={!aiConfigured || busy} onClick={() => decoder.run({})}>
            {t("tools.promptDecoder.button")}
          </button>
          <Err msg={decoder.error} />
          {decoder.result ? (
            <div className="mt-4">
              <Mock on={decoder.isMock} />
              <PromptDecoderView data={decoder.result} />
            </div>
          ) : null}
        </ToolShell>

        <ToolShell value="brainstorm" title={t("tools.brainstorm.title")} desc={t("tools.brainstorm.desc")}>
          <Brainstorm essayId={essayId} runTool={runTool} activeRun={activeRun} aiConfigured={aiConfigured} notes={notes} />
        </ToolShell>

        <ToolShell value="sentence" title={t("tools.sentence.title")} desc={t("tools.sentence.desc")}>
          <Progress kind="sentence" />
          <div>
            <p className="field-label">{t("tools.sentence.selected")}</p>
            {selection ? (
              <blockquote className="quote max-h-40 overflow-y-auto">“{selection}”</blockquote>
            ) : (
              <p className="text-sm text-ink-soft">{t("tools.sentence.noSelection")}</p>
            )}
            {tooLong ? <p className="field-error">{t("tools.sentence.tooLong", { max: MAX_SELECTION })}</p> : null}
            <button type="button" className="btn btn-ghost btn-sm mt-1" onClick={onUseSelection}>{t("tools.sentence.useSelection")}</button>
          </div>
          <fieldset className="mt-3">
            <legend className="field-label">{t("tools.sentence.modeLabel")}</legend>
            <div className="space-y-1">
              {SENTENCE_MODES.map((m) => (
                <label key={m} className="flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-2 hover:bg-paper-2">
                  <input type="radio" name={`${uid}-mode`} value={m} checked={mode === m} onChange={() => setMode(m)} className="h-4 w-4 accent-teal" />
                  <span className="text-sm">{t(`tools.sentence.modes.${m}` as never)}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <button
            type="button"
            className="btn btn-primary btn-sm mt-3"
            disabled={!aiConfigured || busy || !selection || tooLong}
            onClick={() => sentence.run({ selection, sentenceMode: mode, content: getDraft() })}
          >
            {t("tools.run")}
          </button>
          <Err msg={sentence.error} />
          {sentence.result ? (
            <div className="mt-4">
              <Mock on={sentence.isMock} />
              <SentenceView data={sentence.result} />
            </div>
          ) : null}
        </ToolShell>

        <ToolShell value="wordcount" title={t("tools.wordCount.title")} desc={t("tools.wordCount.desc")}>
          <Progress kind="word_count" />
          <p className="text-sm">
            {wordLimit ? t("tools.wordCount.status", { count: words, limit: wordLimit }) : t("tools.wordCount.statusNoLimit", { count: words })}
          </p>
          <button type="button" className="btn btn-primary btn-sm mt-2" disabled={!aiConfigured || busy || words === 0} onClick={() => wordCount.run({ content: getDraft() })}>
            {t("tools.wordCount.button")}
          </button>
          <Err msg={wordCount.error} />
          {wordCount.result ? (
            <div className="mt-4">
              <Mock on={wordCount.isMock} />
              <WordCountView data={wordCount.result} />
            </div>
          ) : null}
        </ToolShell>

        <ToolShell value="final" title={t("tools.finalRead.title")} desc={t("tools.finalRead.desc")}>
          <Progress kind="final_read" />
          <button type="button" className="btn btn-primary btn-sm" disabled={!aiConfigured || busy || words === 0} onClick={() => finalRead.run({ content: getDraft() })}>
            {t("tools.finalRead.button")}
          </button>
          <Err msg={finalRead.error} />
          {finalRead.result ? (
            <div className="mt-4">
              <Mock on={finalRead.isMock} />
              <FinalReadView data={finalRead.result} />
            </div>
          ) : null}
        </ToolShell>
      </Accordion.Root>
      <p className="mt-3 text-xs text-ink-soft">{t("editor.selectionHint")}</p>
    </div>
  );
}
