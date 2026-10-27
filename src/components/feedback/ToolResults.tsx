"use client";
import { useI18n } from "@/i18n/client";
import type { FinalRead, PromptDecoder, SentenceFeedback, WordCountHelp } from "@/server/ai/schemas";
import { BoundaryNote, QuoteBlock } from "./bits";

function List({ items }: { items: string[] }) {
  return (
    <ul className="mt-2 list-disc space-y-1 pl-5">
      {items.map((x, i) => (
        <li key={i}>{x}</li>
      ))}
    </ul>
  );
}

export function PromptDecoderView({ data }: { data: PromptDecoder }) {
  const { t } = useI18n();
  return (
    <div className="space-y-5">
      <div>
        <h4 className="font-semibold">{t("tools.promptDecoder.whatItAsks")}</h4>
        <p className="mt-1">{data.what_it_asks}</p>
      </div>
      {data.key_terms.length ? (
        <div>
          <h4 className="font-semibold">{t("tools.promptDecoder.keyTerms")}</h4>
          <dl className="mt-2 space-y-2">
            {data.key_terms.map((k, i) => (
              <div key={i}>
                <dt className="font-medium">{k.term}</dt>
                <dd className="text-sm text-ink-soft">{k.meaning}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
      <div>
        <h4 className="font-semibold">{t("tools.promptDecoder.possible")}</h4>
        <List items={data.possible_experiences} />
      </div>
      <div>
        <h4 className="font-semibold">{t("tools.promptDecoder.notRequired")}</h4>
        <List items={data.not_required} />
      </div>
      <div>
        <h4 className="font-semibold">{t("tools.promptDecoder.misunderstandings")}</h4>
        <List items={data.common_misunderstandings} />
      </div>
      <div>
        <h4 className="font-semibold">{t("tools.promptDecoder.questions")}</h4>
        <List items={data.reflective_questions} />
      </div>
      <p className="text-sm text-ink-soft">{data.limitations}</p>
    </div>
  );
}

export type SentenceResult = SentenceFeedback & { removedAlternatives?: number };

export function SentenceView({ data }: { data: SentenceResult }) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <BoundaryNote text={data.boundary_note} />
      <div>
        <h4 className="font-semibold">{t("tools.sentence.diagnosis")}</h4>
        <p className="mt-1">{data.diagnosis}</p>
      </div>
      {data.translation ? (
        <div>
          <h4 className="font-semibold">{t("tools.sentence.translation")}</h4>
          <p className="mt-1 whitespace-pre-wrap">{data.translation}</p>
        </div>
      ) : null}
      <div>
        <h4 className="font-semibold">{t("tools.sentence.alternatives")}</h4>
        {data.alternatives.length ? (
          <ol className="mt-2 space-y-2">
            {data.alternatives.map((a, i) => (
              <li key={i} className="card p-3">
                <p className="font-serif">{a.text}</p>
                <p className="mt-1 text-sm text-ink-soft">{a.explanation}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-1 text-sm text-ink-soft">{t("tools.sentence.noAlternatives")}</p>
        )}
        {data.removedAlternatives ? <p className="mt-2 text-sm text-amber">{t("tools.sentence.removed", { count: data.removedAlternatives })}</p> : null}
      </div>
      {data.tradeoffs ? (
        <div>
          <h4 className="font-semibold">{t("tools.sentence.tradeoffs")}</h4>
          <p className="mt-1 text-sm">{data.tradeoffs}</p>
        </div>
      ) : null}
      {data.zh_explanation ? (
        <p className="rounded-md bg-sage-soft px-3 py-2 text-sm" lang="zh-Hans">
          {data.zh_explanation}
        </p>
      ) : null}
      <p className="notice text-sm">{data.voice_reminder || t("tools.sentence.reminder")}</p>
    </div>
  );
}

type WithLocated<T> = T & { located?: boolean };
export type WordCountResult = Omit<WordCountHelp, "repeated_ideas" | "unnecessary_setup" | "redundant_modifiers" | "condensable_passages" | "preserve"> & {
  repeated_ideas: WithLocated<WordCountHelp["repeated_ideas"][number]>[];
  unnecessary_setup: WithLocated<WordCountHelp["unnecessary_setup"][number]>[];
  redundant_modifiers: WithLocated<WordCountHelp["redundant_modifiers"][number]>[];
  condensable_passages: WithLocated<WordCountHelp["condensable_passages"][number]>[];
  preserve: WithLocated<WordCountHelp["preserve"][number]>[];
  computed?: { wordCount: number; wordLimit: number | null };
};

export function WordCountView({ data }: { data: WordCountResult }) {
  const { t } = useI18n();
  const groups = [
    ["tools.wordCount.repeated", data.repeated_ideas],
    ["tools.wordCount.setup", data.unnecessary_setup],
    ["tools.wordCount.modifiers", data.redundant_modifiers],
    ["tools.wordCount.condense", data.condensable_passages],
  ] as const;
  return (
    <div className="space-y-5">
      {data.computed ? (
        <p className="badge badge-neutral">
          {data.computed.wordLimit
            ? t("tools.wordCount.status", { count: data.computed.wordCount, limit: data.computed.wordLimit })
            : t("tools.wordCount.statusNoLimit", { count: data.computed.wordCount })}
        </p>
      ) : null}
      <p>{data.overview}</p>
      {groups.map(([key, items]) => (
        <div key={key}>
          <h4 className="font-semibold">{t(key)}</h4>
          {items.length ? (
            <ul className="mt-2 space-y-3">
              {items.map((item, i) => (
                <li key={i} className="card p-3">
                  <QuoteBlock quote={item.quote} located={item.located ?? true} />
                  <p className="mt-2 text-sm">{item.suggestion}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-ink-soft">{t("tools.wordCount.none")}</p>
          )}
        </div>
      ))}
      <div className="rounded-xl border border-[#c4dcd7] bg-teal-soft/60 p-4">
        <h4 className="font-semibold text-teal-dark">{t("tools.wordCount.preserve")}</h4>
        <ul className="mt-2 space-y-3">
          {data.preserve.map((p, i) => (
            <li key={i}>
              <QuoteBlock quote={p.quote} located={p.located ?? true} />
              <p className="mt-1 text-sm">{p.reason}</p>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-sm text-ink-soft">{data.limitations}</p>
    </div>
  );
}

export type FinalReadResult = Omit<FinalRead, "clarity_issues" | "grammar_issues"> & {
  clarity_issues: WithLocated<FinalRead["clarity_issues"][number]>[];
  grammar_issues: WithLocated<FinalRead["grammar_issues"][number]>[];
  computed?: { wordCount: number; wordLimit: number | null };
};

export function FinalReadView({ data }: { data: FinalReadResult }) {
  const { t } = useI18n();
  const issues = (items: FinalReadResult["clarity_issues"]) =>
    items.length ? (
      <ul className="mt-2 space-y-3">
        {items.map((it, i) => (
          <li key={i} className="card p-3">
            <QuoteBlock quote={it.quote} located={it.located ?? true} />
            <p className="mt-2 text-sm">{it.issue}</p>
            <p className="mt-1 text-sm text-ink-soft">{it.suggestion}</p>
          </li>
        ))}
      </ul>
    ) : (
      <p className="mt-1 text-sm text-ink-soft">{t("tools.finalRead.none")}</p>
    );
  return (
    <div className="space-y-5">
      <p className="notice notice-warn text-sm">{t("tools.finalRead.notReady")}</p>
      {data.computed ? (
        <p className="badge badge-neutral">
          {data.computed.wordLimit
            ? t("common.wordsOfLimit", { count: data.computed.wordCount, limit: data.computed.wordLimit })
            : t("common.wordsShort", { count: data.computed.wordCount })}
        </p>
      ) : null}
      <div>
        <h4 className="font-semibold">{t("feedback.promptAlignment")}</h4>
        <p className="mt-1">
          <span className="badge badge-neutral mr-2">{t(`feedback.alignment.${data.prompt_alignment.status}` as never)}</span>
          {data.prompt_alignment.explanation}
        </p>
      </div>
      <div>
        <h4 className="font-semibold">{t("tools.finalRead.clarity")}</h4>
        {issues(data.clarity_issues)}
      </div>
      <div>
        <h4 className="font-semibold">{t("tools.finalRead.repeated")}</h4>
        {data.repeated_words.length ? (
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {data.repeated_words.map((r, i) => (
              <li key={i}>
                <strong>{r.word}</strong> — {r.note}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-ink-soft">{t("tools.finalRead.none")}</p>
        )}
      </div>
      <div>
        <h4 className="font-semibold">{t("tools.finalRead.grammar")}</h4>
        {issues(data.grammar_issues)}
      </div>
      <div>
        <h4 className="font-semibold">{t("tools.finalRead.checklist")}</h4>
        <ul className="mt-2 space-y-1">
          {data.checklist.map((c, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden="true">☐</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-sm text-ink-soft">{data.limitations}</p>
    </div>
  );
}
