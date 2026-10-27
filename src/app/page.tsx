import Link from "next/link";
import { getT } from "@/i18n/server";
import { getCurrentUser } from "@/server/session";
import { listPublishedResources } from "@/server/services/resources";
import { SAMPLE_FEEDBACK } from "@/content/sample";
import { DiagnosticBadge } from "@/components/feedback/bits";

export default async function HomePage() {
  const { t, messages, locale } = await getT();
  const user = await getCurrentUser();
  const resources = (await listPublishedResources(null, locale).catch(() => [])).slice(0, 3);
  const startHref = user ? "/essays/new" : "/sign-in";
  const m = messages.home;

  return (
    <>
      <section className="paper-lines border-b border-line">
        <div className="container-page grid gap-10 py-14 md:grid-cols-[1.25fr_1fr] md:py-20">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-teal">{m.eyebrow}</p>
            <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">{m.heroTitle}</h1>
            {locale === "en" ? (
              <p className="mt-3 font-serif text-xl text-ink-soft" lang="zh-Hans">
                {m.heroZh}
              </p>
            ) : null}
            <p className="mt-5 max-w-xl text-lg text-ink-soft">{m.heroBody}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={startHref} className="btn btn-accent">
                {m.ctaPrimary}
              </Link>
              <Link href="/sample-feedback" className="btn btn-secondary">
                {m.ctaSecondary}
              </Link>
            </div>
            <p className="mt-6 max-w-xl text-sm text-ink-soft">{t("disclaimer.main")}</p>
          </div>
          <div className="card self-start p-5 shadow-sm" aria-label={t("common.fictional")}>
            <p className="badge badge-neutral">{t("common.fictional")}</p>
            <p className="mt-3 text-sm font-semibold uppercase tracking-wide text-coral-dark">{t("feedback.primaryPriority")}</p>
            <p className="mt-1 font-serif text-lg font-semibold">{SAMPLE_FEEDBACK.primary_priority.title}</p>
            <ul className="mt-4 space-y-2">
              {SAMPLE_FEEDBACK.categories.slice(1, 4).map((c) => (
                <li key={c.key} className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2 text-sm">
                  <span>{t(`feedback.category.${c.key}` as never)}</span>
                  <DiagnosticBadge label={c.label} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="container-prose py-14 text-center">
        <h2 className="text-3xl font-semibold">{m.ethicalTitle}</h2>
        <p className="mt-4 text-lg text-ink-soft">{t("home.ethicalBody")}</p>
      </section>

      <section className="container-page" aria-labelledby="steps-title">
        <h2 id="steps-title" className="text-2xl font-semibold">{m.stepsTitle}</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {m.steps.map((s, i) => (
            <li key={i} className="card p-6">
              <span className="font-serif text-3xl text-teal" aria-hidden="true">{i + 1}</span>
              <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-ink-soft">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="container-page mt-16 grid gap-6 md:grid-cols-2">
        <div className="card p-6">
          <h2 className="text-2xl font-semibold">{m.sampleTitle}</h2>
          <p className="mt-2 text-ink-soft">{m.sampleBody}</p>
          <blockquote className="quote mt-4">“{SAMPLE_FEEDBACK.passage_comments[0].quote}”</blockquote>
          <p className="mt-3">{SAMPLE_FEEDBACK.passage_comments[0].observation}</p>
          <p className="mt-2 text-sm">
            <strong>{t("feedback.tryThis")}:</strong> {SAMPLE_FEEDBACK.passage_comments[0].revision_question}
          </p>
          <Link href="/sample-feedback" className="btn btn-secondary mt-5">{m.sampleCta}</Link>
        </div>
        <div className="card bg-teal-soft/50 p-6">
          <h2 className="text-2xl font-semibold">{m.privacyTitle}</h2>
          <ul className="mt-4 space-y-3">
            {m.privacyPoints.map((p, i) => (
              <li key={i} className="flex gap-3">
                <span aria-hidden="true" className="text-teal">✓</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
          <Link href="/privacy" className="btn btn-secondary mt-5">{m.privacyCta}</Link>
        </div>
      </section>

      <section className="container-page mt-16 grid gap-6 md:grid-cols-2">
        <div className="card p-6">
          <h2 className="text-2xl font-semibold">{m.doTitle}</h2>
          <ul className="mt-4 space-y-2">
            {m.doList.map((x, i) => (
              <li key={i} className="flex gap-3"><span aria-hidden="true" className="text-teal">✓</span><span>{x}</span></li>
            ))}
          </ul>
        </div>
        <div className="card p-6">
          <h2 className="text-2xl font-semibold">{m.dontTitle}</h2>
          <ul className="mt-4 space-y-2">
            {m.dontList.map((x, i) => (
              <li key={i} className="flex gap-3"><span aria-hidden="true" className="text-coral">✕</span><span>{x}</span></li>
            ))}
          </ul>
        </div>
      </section>

      {resources.length ? (
        <section className="container-page mt-16">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">{m.resourcesTitle}</h2>
              <p className="mt-1 text-ink-soft">{m.resourcesBody}</p>
            </div>
            <Link href="/resources">{m.resourcesCta}</Link>
          </div>
          <ul className="mt-6 grid gap-4 md:grid-cols-3">
            {resources.map((r) => (
              <li key={r.id} className="card p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-teal">{t(`resources.categories.${r.category}` as never)}</p>
                <h3 className="mt-2 text-lg font-semibold">
                  <Link href={`/resources/${r.slug}`} className="text-ink">{r.title}</Link>
                </h3>
                <p className="mt-2 text-sm text-ink-soft">{r.summary}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="container-prose mt-16" aria-labelledby="faq-title">
        <h2 id="faq-title" className="text-2xl font-semibold">{m.faqTitle}</h2>
        <div className="mt-6 space-y-3">
          {m.faq.map((f, i) => (
            <details key={i} className="card group p-0">
              <summary className="cursor-pointer list-none rounded-[inherit] p-5 font-semibold marker:hidden">
                <span className="flex items-center justify-between gap-3">
                  {f.q}
                  <span aria-hidden="true" className="text-teal transition-transform group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="px-5 pb-5 text-ink-soft">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="container-prose mt-16 text-center">
        <div className="card p-8">
          <h2 className="text-2xl font-semibold">{m.finalTitle}</h2>
          <p className="mt-2 text-ink-soft">{m.finalBody}</p>
          <Link href={startHref} className="btn btn-accent mt-6">{m.ctaPrimary}</Link>
        </div>
      </section>
    </>
  );
}
