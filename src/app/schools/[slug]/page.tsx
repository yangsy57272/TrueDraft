import { AdmissionRoundDates } from "@/components/schools/AdmissionRoundDates";
import { admissionDeadlinesFor } from "@/server/services/admission-deadlines";
import { applicationSystem } from "@/lib/application-systems";
import Link from "next/link";
import { CIP_CODES, CIP_FAMILIES } from "@/lib/planning";
import { SchoolRankings } from "@/components/schools/SchoolRankings";
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
import { FitPanel } from "@/components/schools/FitBadge";
import { SupplementsSection } from "@/components/schools/SupplementsSection";
import { getSupplements } from "@/server/services/supplements";
import { schoolFacts } from "@/lib/federal";
import { scoreRanges, studentScores, suggestFit } from "@/lib/fit";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const found = await getSchoolBySlug((await params).slug);
  return { title: found?.school.name ?? "School" };
}

export default async function SchoolPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ year?: string; field?: string }> }) {
  const { slug } = await params;
  const { year, field: fieldQuery } = await searchParams;
  const field = fieldQuery && CIP_CODES.includes(fieldQuery) ? fieldQuery : undefined;
  const found = await getSchoolBySlug(slug);
  if (!found) notFound();
  const { t, locale } = await getT();
  const user = await getCurrentUser();
  const { school: s, datasets, federal } = found;
  const dataset = datasets.find((d) => d.academicYear === year) ?? datasets[0] ?? null;
  const supplements = await getSupplements(s.id);
  const onList = user ? (await listedSchoolIds(user.id)).has(s.id) : false;
  const profile = user ? await getProfile(user.id) : null;
  const tests = profile?.tests ?? null;
  const fit = profile && s.country === "US"
    ? suggestFit(schoolFacts(dataset, federal?.data ?? null).admitRate?.value ?? null, scoreRanges(dataset?.data ?? null, federal?.data ?? null), {
        ...studentScores(profile.tests),
        testPlan: profile.preferences.testPlan,
      })
    : null;
  const zh = locale === "zh-CN";
  const system = applicationSystem(s.country);
  const selectedField = field ?? profile?.intendedMajors.find(m => m.cipFamily)?.cipFamily ?? undefined;
  const fieldName = selectedField ? CIP_FAMILIES[selectedField]?.[zh ? "zh" : "en"] : undefined;
  const intendedMajor = selectedField ? profile?.intendedMajors.find(m => m.cipFamily === selectedField)?.name ?? fieldName : undefined;
  const fieldShare = selectedField ? schoolFacts(dataset, federal?.data ?? null).degreesByField?.value[selectedField] : undefined;

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
        <AddToListButton
          schoolId={s.id}
          onList={onList}
          signedIn={Boolean(user)}
          category={fit?.category}
          intendedMajor={intendedMajor}
          label={fit ? t("recommend.addAs", { category: t(`recommend.buckets.${fit.category}.title`) }) : undefined}
        />
      </div>
      <section className="card mt-4 p-4" aria-label={zh ? "学校与专业" : "School and major"}>
        <form method="get" className="flex flex-wrap items-end gap-3">
          {year ? <input type="hidden" name="year" value={year} /> : null}
          <div><label htmlFor="school-field" className="field-label">{zh ? "我想申请的学科" : "My intended field"}</label>
            <select id="school-field" name="field" defaultValue={selectedField ?? ""} className="input">
              <option value="">{zh ? "全部学科" : "All fields"}</option>
              {CIP_CODES.map(c => <option key={c} value={c}>{CIP_FAMILIES[c][zh ? "zh" : "en"]}</option>)}
            </select>
          </div>
          <button className="btn btn-secondary btn-sm">{zh ? "查看匹配" : "Check this field"}</button>
        </form>
        {fieldName ? <p className="mt-3 text-sm"><strong>{intendedMajor}</strong> · {fieldShare != null ? `${fieldShare}% ${zh ? "本科毕业生占比（不代表质量）" : "of bachelor’s degrees (prevalence, not quality)"}` : (zh ? "该学科毕业数据未报告；请核实是否开设此专业。" : "Field data not reported; confirm that this major is offered.")}</p> : null}
        <SchoolRankings unitid={s.unitid} field={selectedField} zh={zh} />
      </section>
      {user ? <p className="mt-3 text-sm"><Link href="/schools/recommended">{zh ? "按我的专业推荐学校 →" : "Recommend schools for my majors →"}</Link></p> : null}
      {fit ? <FitPanel fit={fit} t={t} /> : null}
      {fit ? <p className="mt-2 text-xs text-ink-soft">{zh ? "分组依据全校数据；专业及国际生录取率尚未核实。Safety 不保证录取或可负担。" : "Grouping uses university-wide data; major-specific and international admission rates are not verified. Safety is not an admission or affordability guarantee."}</p> : null}
      <section className="card mt-6 p-5"><h2 className="text-xl font-semibold">{zh ? "学校研究与申请体系" : "School research & application system"}</h2>
        {system ? <><p className="mt-2 font-semibold">{zh ? system.zh : system.en} · {system.route}</p><p className="mt-2 text-sm">{zh ? system.noteZh : system.noteEn}</p><a href={system.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm">{zh ? "官方申请说明" : "Official application guidance"} ↗</a></> : null}
        <Link href={`/schools/${s.slug}/research`} className="btn btn-primary mt-4">{zh ? "研究课程、教授、社团并规划 Why School →" : "Research courses, faculty, communities & Why School →"}</Link>
        {s.country !== "US" ? <p className="mt-3 text-xs text-ink-soft">{zh ? "不套用美国录取率分组或美元费用；请按具体项目和学历核对资格。" : "U.S. admission-rate groups and dollar fees are not applied here; check eligibility for your programme and qualification."}</p> : null}
      </section>
      <AdmissionRoundDates catalog={admissionDeadlinesFor(s.slug)} zh={zh} />
      <SupplementsSection supplements={supplements} slug={s.slug} signedIn={Boolean(user)} t={t} locale={locale} />

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

      {s.country !== "US" ? null : dataset ? (
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
