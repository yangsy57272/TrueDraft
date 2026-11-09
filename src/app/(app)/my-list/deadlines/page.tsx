import Link from "next/link";
import type { Metadata } from "next";
import { DeadlineOverview } from "@/components/journey/Deadlines";
import { getT } from "@/i18n/server";
import { requirePageUser } from "@/server/session";
import { listEntries } from "@/server/services/college-list";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("journey.steps.track.title"), robots: { index: false } };
}

export default async function ApplicationTrackerPage() {
  const user = await requirePageUser();
  const { t, locale } = await getT();
  const entries = await listEntries(user.id);

  return (
    <div className="container-prose py-10">
      <h1 className="text-3xl font-semibold">{t("journey.steps.track.title")}</h1>
      <p className="mt-2 text-ink-soft">{t("list.trackerIntro")}</p>
      <section className="card mt-6 border-t-4 border-t-sage p-5 sm:p-6" aria-labelledby="tracker-deadlines">
        <h2 id="tracker-deadlines" className="text-xl font-semibold">{t("list.upcoming")}</h2>
        <DeadlineOverview entries={entries.map(({ id, schoolName, schoolNameZh, deadlines }) => ({
          id,
          name: locale === "zh-CN" && schoolNameZh ? schoolNameZh : schoolName,
          deadlines,
        }))} />
      </section>
      <Link href="/my-list" className="btn btn-primary mt-6">{t("list.manageInList")}</Link>
    </div>
  );
}
