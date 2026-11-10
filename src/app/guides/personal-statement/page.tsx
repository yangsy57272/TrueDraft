import Link from "next/link";
import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { getCurrentUser } from "@/server/session";
import { COMMON_APP_PROMPTS, FURTHER_READING, PERSONAL_STATEMENT_GUIDE } from "@/content/guides/personal-statement";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getT();
  return { title: PERSONAL_STATEMENT_GUIDE[locale].title };
}

const STEP_COLORS = ["#4338ca", "#6d28d9", "#0369a1", "#0f766e", "#c2410c", "#be185d"];

export default async function PersonalStatementGuide() {
  const { t, locale } = await getT();
  const g = PERSONAL_STATEMENT_GUIDE[locale];
  const user = await getCurrentUser();
  const startHref = user ? "/essays/new?type=personal_statement" : "/sign-in";

  return (
    <div className="container-prose py-10">
      <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: "#be185d" }}>{t("guide.kicker")}</p>
      <h1 className="mt-1 text-3xl font-semibold">{g.title}</h1>
      <p className="mt-3 text-lg text-ink-soft">{g.intro}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href={startHref} className="btn btn-primary">{g.startEssay} →</Link>
        <Link href="/sample-feedback" className="btn btn-secondary">{g.sample}</Link>
      </div>

      <nav aria-label={t("guide.contents")} className="card mt-8 p-4 text-sm">
        <p className="font-semibold">{t("guide.contents")}</p>
        <ol className="mt-2 grid list-decimal gap-1 pl-5 sm:grid-cols-2">
          {[
            ["basics", g.factsTitle],
            ["prompts", g.promptsTitle],
            ["steps", g.stepsTitle],
            ["shapes", g.structuresTitle],
            ["pitfalls", g.pitfallsTitle],
            ["intl", g.intlTitle],
            ["checklist", g.checklistTitle],
            ["further", g.furtherTitle],
          ].map(([id, label]) => (
            <li key={id}><a href={`#${id}`}>{label}</a></li>
          ))}
        </ol>
      </nav>

      <section id="basics" className="mt-10 scroll-mt-24">
        <h2 className="text-2xl font-semibold">{g.factsTitle}</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">{g.facts.map((f) => <li key={f}>{f}</li>)}</ul>
      </section>

      <section id="prompts" className="mt-10 scroll-mt-24">
        <h2 className="text-2xl font-semibold">{g.promptsTitle}</h2>
        <p className="mt-2 text-sm text-ink-soft">{g.promptsNote}</p>
        <ol className="mt-4 space-y-3" lang="en">
          {COMMON_APP_PROMPTS.map((p, i) => (
            <li key={i} className="card flex gap-3 p-4 text-sm">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: "#4338ca" }}>{i + 1}</span>
              <span>{p}</span>
            </li>
          ))}
        </ol>
        <p className="notice mt-3 text-sm">{g.promptsTip}</p>
      </section>

      <section id="steps" className="mt-10 scroll-mt-24">
        <h2 className="text-2xl font-semibold">{g.stepsTitle}</h2>
        <ol className="mt-4 space-y-4">
          {g.steps.map((s, i) => (
            <li key={s.title} className="card p-5" style={{ borderLeft: `5px solid ${STEP_COLORS[i % STEP_COLORS.length]}` }}>
              <h3 className="flex items-center gap-2 text-lg font-semibold" style={{ color: STEP_COLORS[i % STEP_COLORS.length] }}>
                <span className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: STEP_COLORS[i % STEP_COLORS.length] }}>{i + 1}</span>
                {s.title}
              </h3>
              {s.body.map((b) => <p key={b} className="mt-2">{b}</p>)}
              {s.tryThis ? (
                <div className="mt-3 rounded-lg p-3 text-sm" style={{ background: "#f5f3ff" }}>
                  <p className="font-semibold">{t("guide.tryThis")}</p>
                  <ul className="mt-1 list-disc pl-5">{s.tryThis.map((q) => <li key={q}>{q}</li>)}</ul>
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <section id="shapes" className="mt-10 scroll-mt-24">
        <h2 className="text-2xl font-semibold">{g.structuresTitle}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {g.structures.map((s, i) => (
            <div key={s.name} className="card p-5" style={{ borderTop: `4px solid ${i ? "#0f766e" : "#6d28d9"}` }}>
              <h3 className="font-semibold">{s.name}</h3>
              <p className="mt-1 text-sm text-ink-soft">{s.when}</p>
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">{s.shape.map((x) => <li key={x}>{x}</li>)}</ol>
            </div>
          ))}
        </div>
      </section>

      <section id="pitfalls" className="mt-10 scroll-mt-24">
        <h2 className="text-2xl font-semibold">{g.pitfallsTitle}</h2>
        <ul className="mt-4 space-y-3">
          {g.pitfalls.map((p) => (
            <li key={p.bad} className="card grid gap-2 p-4 text-sm sm:grid-cols-2">
              <p><span aria-hidden="true" style={{ color: "#be123c" }}>✕ </span><span className="sr-only">{t("guide.avoid")}: </span>{p.bad}</p>
              <p><span aria-hidden="true" style={{ color: "#15803d" }}>✓ </span><span className="sr-only">{t("guide.instead")}: </span>{p.better}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="intl" className="mt-10 scroll-mt-24">
        <h2 className="text-2xl font-semibold">{g.intlTitle}</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">{g.intl.map((x) => <li key={x}>{x}</li>)}</ul>
      </section>

      <section id="checklist" className="mt-10 scroll-mt-24">
        <h2 className="text-2xl font-semibold">{g.checklistTitle}</h2>
        <ul className="mt-3 space-y-2">
          {g.checklist.map((x) => (
            <li key={x} className="flex gap-2"><span aria-hidden="true" style={{ color: "#15803d" }}>☐</span>{x}</li>
          ))}
        </ul>
        <div className="notice notice-info mt-5 text-sm">
          <p className="font-semibold">{g.honestyTitle}</p>
          <p className="mt-1">{g.honesty}</p>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href={startHref} className="btn btn-primary">{g.startEssay} →</Link>
        </div>
      </section>

      <section id="further" className="mt-10 scroll-mt-24">
        <h2 className="text-2xl font-semibold">{g.furtherTitle}</h2>
        <p className="mt-1 text-sm text-ink-soft">{g.furtherNote}</p>
        <ul className="mt-3 space-y-2">
          {FURTHER_READING.map((r) => (
            <li key={r.url}>
              <a href={r.url} target="_blank" rel="noopener noreferrer">
                {r.name} <span className="sr-only">{t("schools.opensNewTab")}</span>↗
              </a>
              <span className="ml-2 text-xs text-ink-faint">{r.by}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
