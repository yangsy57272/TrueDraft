import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { formatDate } from "@/i18n/translate";
import { getCurrentUser } from "@/server/session";
import { getSchoolBySlug } from "@/server/services/schools";
import { listedSchoolIds } from "@/server/services/college-list";
import { getProfile } from "@/server/services/profile";
import { CdsView } from "@/components/cds/CdsView";
import { FederalView } from "@/components/cds/FederalView";
import { AddToListButton } from "@/components/cds/SchoolClientBits";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const found = await getSchoolBySlug((await params).slug);
  return { title: found?.school.name ?? "School" };
}

export default async function SchoolPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ year?: string }> }) {
  const { slug } = await params;
  const { year } = await searchParams;
  const found = await getSchoolBySlug(slug);
  if (!found) notFound();
  const { t, locale } = await getT();
  const user = await getCurrentUser();
  const { school: s, datasets, federal } = found;
  const dataset = datasets.find((d) => d.academicYear === year) ?? datasets[0] ?? null;
  const onList = user ? (await listedSchoolIds(user.id)).has(s.id) : false;
  const tests = user ? (await getProfile(user.id)).tests : null;
  const zh = locale === "zh-CN";

  return (
    <div className="container-page py-10">
      <Link href="/schools" className="text-sm">← {t("schools.title")}</Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{zh && s.nameZh ? s.nameZh : s.name}</h1>
          <p className="mt-1 text-ink-soft">
            {zh && s.nameZh ? `${s.name} · ` : ""}
            {[s.city, s.state].filter(Boolean).join(", ")}
            {s.control ? ` · ${t(`schools.controls.${s.control}` as never)}` : ""}
          </p>
        </div>
        <AddToListButton schoolId={s.id} onList={onList} signedIn={Boolean(user)} />
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        {s.cdsPageUrl ? (
          <a href={s.cdsPageUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
            {t("schools.officialCds")} <span className="sr-only">{t("schools.opensNewTab")}</span>
            <span aria-hidden="true">↗</span>
          </a>
        ) : null}
        {s.website ? (
          <a href={s.website} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
            {t("schools.school.website")} <span className="sr-only">{t("schools.opensNewTab")}</span>
            <span aria-hidden="true">↗</span>
          </a>
        ) : null}
        {s.latestCdsYearListed ? <span className="badge badge-neutral">{t("schools.latestListed", { year: s.latestCdsYearListed })}</span> : null}
      </div>

      {dataset ? (
        <>
          <section className="notice notice-info mt-6 text-sm" aria-labelledby="src">
            <h2 id="src" className="font-sans font-semibold">{t("schools.school.sourceTitle")}</h2>
            <p className="mt-1">
              {t("schools.school.source", { year: dataset.academicYear })}{" "}
              <a href={dataset.sourceUrl} target="_blank" rel="noopener noreferrer">
                {t("schools.school.openDocument")} <span className="sr-only">{t("schools.opensNewTab")}</span>↗
              </a>
            </p>
            {dataset.sourcePageRef ? <p className="mt-1">{t("schools.school.pageRef", { ref: dataset.sourcePageRef })}</p> : null}
            {dataset.sourceExceptionReason ? <p className="mt-1">{t("schools.school.hostedElsewhere", { reason: dataset.sourceExceptionReason })}</p> : null}
            {dataset.verifiedAt ? (
              dataset.reviewedByPerson ? (
                <p className="mt-1">{t("schools.school.verified", { date: formatDate(dataset.verifiedAt, locale) })}</p>
              ) : (
                <p className="mt-1">
                  <span className="badge badge-developing mr-1">
                    <span aria-hidden="true">◐</span>
                    {t("schools.school.automatedBadge")}
                  </span>
                  {t("schools.school.automated", { date: formatDate(dataset.verifiedAt, locale) })}
                </p>
              )
            ) : null}
            {datasets.length > 1 ? (
              <p className="mt-2">
                {t("schools.school.older")}:{" "}
                {datasets.map((d) => (
                  <Link key={d.id} href={`/schools/${s.slug}?year=${d.academicYear}`} className="mr-3" aria-current={d.id === dataset.id ? "page" : undefined}>
                    {d.academicYear}
                  </Link>
                ))}
              </p>
            ) : null}
          </section>
          <div className="mt-6">
            <CdsView data={dataset.data} t={t} locale={locale} tests={tests} />
          </div>
          {federal ? (
            <div className="mt-8">
              <FederalView data={federal.data} unitid={federal.unitid} fileDate={federal.fileDate} t={t} locale={locale} />
            </div>
          ) : null}
        </>
      ) : (
        <>
          {federal ? (
            <div className="mt-6">
              <FederalView data={federal.data} unitid={federal.unitid} fileDate={federal.fileDate} t={t} locale={locale} />
            </div>
          ) : null}
          <section className="card mt-6 p-6">
            <h2 className="text-xl font-semibold">{t("schools.school.noDataTitle")}</h2>
            <p className="mt-2 text-ink-soft">{federal ? t("schools.school.noCdsWithFederal") : t("schools.school.noDataBody")}</p>
            <Link href="/cds" className="mt-4 inline-block">{t("nav.cdsGuide")} →</Link>
          </section>
        </>
      )}
      <p className="mt-8 text-sm text-ink-soft">{t("journey.disclaimer")}</p>
    </div>
  );
}
