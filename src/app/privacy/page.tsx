import Link from "next/link";
import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { getPrivacyFacts } from "@/config/deployment";
import { getT } from "@/i18n/server";
import { formatDate } from "@/i18n/translate";
import { getCurrentUser } from "@/server/session";
import { getPrivacySettings } from "@/server/services/account";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("privacy.title") };
}

export default async function PrivacyPage() {
  const { t, messages, locale } = await getT();
  const facts = getPrivacyFacts();
  const user = await getCurrentUser();
  const settings = user ? await getPrivacySettings(user.id) : null;
  const m = messages.privacy;

  const providerValue = !facts.aiConfigured
    ? t("privacy.status.aiNotConfigured")
    : facts.aiIsMock
      ? t("privacy.status.aiMock")
      : facts.providerDisplayName;

  const rows: [string, React.ReactNode][] = [
    [t("privacy.status.draftStorage"), t("privacy.status.enabledEncrypted")],
    [t("privacy.status.aiProvider"), providerValue],
    [t("privacy.status.trainingApp"), t("privacy.status.trainingAppValue")],
    [
      t("privacy.status.trainingProvider"),
      facts.aiConfigured && !facts.aiIsMock
        ? facts.providerNoTrainingConfirmed
          ? t("privacy.status.trainingProviderConfirmed")
          : t("privacy.status.trainingProviderUnconfirmed")
        : "—",
    ],
    [t("privacy.status.providerRetention"), facts.providerRetentionNote ?? t("privacy.status.unknown")],
    [
      t("privacy.status.retention"),
      settings ? t(`settings.retentionOptions.${settings.retentionPreference}` as never) : t("privacy.status.retentionSignedOut"),
    ],
    [t("privacy.status.region"), facts.storageRegion ?? t("privacy.status.unknown")],
    [t("privacy.status.lastUpdated"), formatDate(facts.privacyLastUpdated, locale)],
    [t("privacy.status.controls"), <Link key="s" href="/settings">{t("privacy.status.controlsLink")}</Link>],
  ];

  return (
    <div className="container-prose py-12">
      <h1 className="text-4xl font-semibold">{t("privacy.title")}</h1>
      <p className="mt-4 text-lg text-ink-soft">{t("privacy.intro")}</p>

      <section className="mt-10" aria-labelledby="status">
        <h2 id="status" className="text-2xl font-semibold">{t("privacy.statusTitle")}</h2>
        <dl className="card mt-4 divide-y divide-line">
          {rows.map(([k, v]) => (
            <div key={k} className="grid gap-1 p-4 sm:grid-cols-[14rem_1fr] sm:gap-4">
              <dt className="font-semibold">{k}</dt>
              <dd className="text-ink-soft">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-12" aria-labelledby="summary">
        <h2 id="summary" className="text-2xl font-semibold">{t("privacy.summaryTitle")}</h2>
        <div className="mt-4 space-y-4">
          {m.summary.map((item, i) => (
            <div key={i} className="card p-5">
              <h3 className="text-lg font-semibold">{item.q}</h3>
              <p className="mt-2 text-ink-soft">{item.a.replace("{brand}", brand.name)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12" aria-labelledby="controls">
        <h2 id="controls" className="text-2xl font-semibold">{t("privacy.controlsTitle")}</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5">
          {m.controls.map((c, i) => <li key={i}>{c}</li>)}
        </ul>
      </section>

      <section className="mt-12" aria-labelledby="human">
        <h2 id="human" className="text-2xl font-semibold">{t("privacy.humanTitle")}</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5">
          {m.human.map((c, i) => <li key={i}>{c.replace("{brand}", brand.name)}</li>)}
        </ul>
      </section>

      <section className="mt-12" aria-labelledby="security">
        <h2 id="security" className="text-2xl font-semibold">{t("privacy.securityTitle")}</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5">
          {m.security.map((c, i) => <li key={i}>{c}</li>)}
        </ul>
        <p className="mt-4 text-ink-soft">{t("privacy.securityNote")}</p>
      </section>

      <p className="notice notice-warn mt-12" role="note">{t("privacy.legalNote")}</p>
      {brand.supportEmail ? <p className="mt-4">{t("privacy.contact", { email: brand.supportEmail })}</p> : null}
    </div>
  );
}
