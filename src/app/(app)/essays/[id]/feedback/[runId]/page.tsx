import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { formatDate } from "@/i18n/translate";
import { requirePageUser } from "@/server/session";
import { getEssay, getVersionById } from "@/server/services/essays";
import { getRun } from "@/server/services/feedback";
import { isUuid, orNotFound } from "@/server/page-data";
import { FeedbackView, type FullFeedbackResult } from "@/components/feedback/FeedbackView";
import { FinalReadView, PromptDecoderView, SentenceView, WordCountView } from "@/components/feedback/ToolResults";
import { HighlightedEssay } from "@/components/feedback/HighlightedEssay";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("feedback.title"), robots: { index: false } };
}

export default async function FeedbackPage({ params }: { params: Promise<{ id: string; runId: string }> }) {
  const { id, runId } = await params;
  if (!isUuid(id) || !isUuid(runId)) notFound();
  const user = await requirePageUser();
  const { t, locale } = await getT();
  const essay = await orNotFound(getEssay(user.id, id));
  const run = await orNotFound(getRun(user.id, id, runId));
  if (run.status !== "completed" || !run.result) notFound();
  const version = run.essayVersionId ? await orNotFound(getVersionById(user.id, id, run.essayVersionId)) : null;
  const result = run.result as never;

  const quotes =
    run.kind === "full_feedback"
      ? (run.result as FullFeedbackResult).passage_comments.filter((c) => c.located).map((c) => ({ quote: c.quote, priority: c.priority }))
      : [];

  return (
    <div className="container-page py-8">
      <Link href={`/essays/${id}`} className="text-sm">← {t("feedback.backToEditor")}</Link>
      <h1 className="mt-2 text-3xl font-semibold">{t(`feedback.kind.${run.kind}` as never)}</h1>
      <p className="mt-1 text-ink-soft">{essay.title}</p>
      <p className="mt-1 text-sm text-ink-soft">
        {version
          ? t("feedback.meta", { version: version.versionNumber, date: formatDate(run.createdAt, locale, true), model: run.modelName })
          : t("feedback.metaNoVersion", { date: formatDate(run.createdAt, locale, true), model: run.modelName })}
        {` · ${run.promptVersion}`}
      </p>
      {run.provider === "mock" ? <p className="notice notice-warn mt-3" role="note">{t("feedback.mockBanner")}</p> : null}
      {run.redactionCount ? <p className="mt-2 text-sm text-ink-soft">{t("feedback.redactedNote", { count: run.redactionCount })}</p> : null}
      <p className="notice mt-3 text-sm">{t("feedback.aiNote")}</p>

      <div className={`mt-6 grid gap-8 ${version ? "lg:grid-cols-[1fr_1.15fr]" : ""}`}>
        {version ? (
          <section aria-labelledby="essay-version" className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto">
            <h2 id="essay-version" className="text-lg font-semibold">{t("common.version", { n: version.versionNumber })}</h2>
            <HighlightedEssay text={version.content} quotes={quotes} />
          </section>
        ) : null}
        <section aria-label={t("feedback.title")}>
          {run.kind === "full_feedback" ? <FeedbackView data={result} /> : null}
          {run.kind === "prompt_decoder" ? <PromptDecoderView data={result} /> : null}
          {run.kind === "sentence" ? (
            <>
              {(run.request as { selection?: string } | null)?.selection ? (
                <blockquote className="quote mb-4">“{(run.request as { selection: string }).selection}”</blockquote>
              ) : null}
              <SentenceView data={result} />
            </>
          ) : null}
          {run.kind === "word_count" ? <WordCountView data={result} /> : null}
          {run.kind === "final_read" ? <FinalReadView data={result} /> : null}
          {run.kind === "brainstorm" ? <p className="text-ink-soft">{t("tools.brainstorm.desc")}</p> : null}
        </section>
      </div>
      <p className="mt-10 text-sm text-ink-soft">{t("disclaimer.main")}</p>
    </div>
  );
}
