import Link from "next/link";
import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { EXAMPLE_CDS, EXAMPLE_SCHOOL } from "@/content/cds-example";
import { CdsView } from "@/components/cds/CdsView";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("cds.title") };
}

export default async function CdsGuidePage() {
  const { t, messages, locale } = await getT();
  const m = messages.cds;
  return (
    <div className="container-page py-12">
      <div className="max-w-3xl">
        <h1 className="text-4xl font-semibold">{m.title}</h1>
        <p className="mt-4 text-lg text-ink-soft">{m.intro}</p>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="text-xl font-semibold">{m.whatTitle}</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            {m.what.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </section>
        <section className="card p-6">
          <h2 className="text-xl font-semibold">{m.whereTitle}</h2>
          <p className="mt-3">{m.where}</p>
          <Link href="/schools" className="btn btn-primary btn-sm mt-4">
            {m.exploreCta}
          </Link>
        </section>
      </div>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">{m.sectionsTitle}</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {Object.entries(m.sections).map(([letter, text]) => (
            <div key={letter} className="card flex gap-3 p-4">
              <dt className="font-serif text-2xl font-semibold text-teal">{letter}</dt>
              <dd className="text-sm">{text}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">{m.keyTitle}</h2>
        <dl className="mt-4 space-y-3">
          {m.key.map((k) => (
            <div key={k.item} className="card grid gap-2 p-4 sm:grid-cols-[6rem_1fr]">
              <dt className="font-mono font-semibold text-teal-dark">{k.item}</dt>
              <dd>{k.text}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="notice notice-warn mt-10">
        <h2 className="font-sans text-lg font-semibold">{m.caveatsTitle}</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {m.caveats.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      </section>

      <section className="mt-12" aria-labelledby="example">
        <h2 id="example" className="text-2xl font-semibold">{m.exampleTitle}</h2>
        <p className="notice notice-warn mt-3" role="note">
          <strong>{t("common.fictional")}. </strong>
          {m.exampleNote}
        </p>
        <p className="mt-4 font-serif text-xl font-semibold">{EXAMPLE_SCHOOL.name}</p>
        <div className="mt-4">
          <CdsView data={EXAMPLE_CDS} t={t} locale={locale} />
        </div>
      </section>

      <p className="mt-10 text-sm text-ink-soft">{m.attribution}</p>
    </div>
  );
}
