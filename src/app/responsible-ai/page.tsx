import type { Metadata } from "next";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("integrity.title") };
}

export default async function ResponsibleAiPage() {
  const { t, messages } = await getT();
  const m = messages.integrity;
  return (
    <div className="container-prose py-12">
      <h1 className="text-4xl font-semibold">{t("integrity.title")}</h1>
      <p className="mt-4 text-lg text-ink-soft">{t("integrity.intro")}</p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <section className="card p-6" aria-labelledby="may">
          <h2 id="may" className="text-xl font-semibold">{m.mayTitle}</h2>
          <ul className="mt-3 space-y-2">
            {m.may.map((x, i) => (
              <li key={i} className="flex gap-2"><span aria-hidden="true" className="text-teal">✓</span><span>{x}</span></li>
            ))}
          </ul>
        </section>
        <section className="card p-6" aria-labelledby="mustnot">
          <h2 id="mustnot" className="text-xl font-semibold">{m.mustNotTitle}</h2>
          <ul className="mt-3 space-y-2">
            {m.mustNot.map((x, i) => (
              <li key={i} className="flex gap-2"><span aria-hidden="true" className="text-coral">✕</span><span>{x}</span></li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">{m.ghostTitle}</h2>
        <blockquote className="quote mt-3 text-lg">{m.ghostQuote}</blockquote>
      </section>

      <section className="notice notice-warn mt-10" aria-labelledby="policies">
        <h2 id="policies" className="font-sans text-lg font-semibold">{m.policiesTitle}</h2>
        <p className="mt-2">{m.policiesBody}</p>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">{m.howTitle}</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          {m.how.map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">{m.limitsTitle}</h2>
        <p className="mt-2 text-ink-soft">{m.limitsBody}</p>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">{m.ipTitle}</h2>
        <p className="mt-2 text-ink-soft">{m.ipBody}</p>
      </section>

      <p className="notice mt-10">{t("disclaimer.main")}</p>
    </div>
  );
}
