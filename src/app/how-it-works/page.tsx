import Link from "next/link";
import type { Metadata } from "next";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("how.title") };
}

export default async function HowItWorksPage() {
  const { t, messages } = await getT();
  return (
    <div className="container-prose py-12">
      <h1 className="text-4xl font-semibold">{t("how.title")}</h1>
      <p className="mt-4 text-lg text-ink-soft">{t("how.intro")}</p>
      <ol className="mt-10 space-y-6">
        {messages.how.sections.map((s, i) => (
          <li key={i} className="card p-6">
            <h2 className="text-xl font-semibold">{s.title}</h2>
            <p className="mt-2 text-ink-soft">{s.body}</p>
          </li>
        ))}
      </ol>
      <section className="mt-10">
        <h2 className="text-xl font-semibold">{t("how.labelsTitle")}</h2>
        <p className="mt-2 text-ink-soft">{t("how.labelsBody")}</p>
      </section>
      <p className="notice mt-10">{t("disclaimer.main")}</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/sign-in" className="btn btn-accent">{t("home.ctaPrimary")}</Link>
        <Link href="/responsible-ai" className="btn btn-secondary">{t("nav.integrity")}</Link>
      </div>
    </div>
  );
}
