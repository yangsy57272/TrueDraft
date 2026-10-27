import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { SAMPLE_ESSAY, SAMPLE_FEEDBACK, SAMPLE_PROMPT } from "@/content/sample";
import { countWords } from "@/lib/wordcount";
import { FeedbackView, type FullFeedbackResult } from "@/components/feedback/FeedbackView";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("sample.title") };
}

export default async function SampleFeedbackPage() {
  const { t } = await getT();
  const data = { ...SAMPLE_FEEDBACK, computed: { wordCount: countWords(SAMPLE_ESSAY), wordLimit: 650 } } as FullFeedbackResult;
  return (
    <div className="container-page py-12">
      <h1 className="text-4xl font-semibold">{t("sample.title")}</h1>
      <p className="notice notice-warn mt-4 max-w-3xl" role="note">
        <strong>{t("common.fictional")}. </strong>
        {t("sample.notice")}
      </p>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        <section aria-labelledby="sample-essay" className="lg:sticky lg:top-6 lg:self-start">
          <h2 id="sample-essay" className="text-xl font-semibold">{t("sample.essayHeading")}</h2>
          <div className="card mt-3 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{t("sample.promptLabel")}</p>
            <p className="mt-1 text-sm text-ink-soft">{SAMPLE_PROMPT}</p>
            <div className="mt-4 space-y-3 font-serif text-[1.05rem] leading-relaxed" lang="en">
              {SAMPLE_ESSAY.split("\n\n").map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <p className="mt-4 text-sm text-ink-soft">{t("common.wordsOfLimit", { count: data.computed!.wordCount, limit: 650 })}</p>
          </div>
        </section>
        <section aria-labelledby="sample-feedback">
          <h2 id="sample-feedback" className="text-xl font-semibold">{t("sample.feedbackHeading")}</h2>
          <div className="mt-3">
            <FeedbackView data={data} />
          </div>
        </section>
      </div>
    </div>
  );
}
