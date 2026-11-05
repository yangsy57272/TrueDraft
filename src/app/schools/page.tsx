import Link from "next/link";
import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { CIP_CODES, CIP_FAMILIES, REGIONS, SIZE_PREFS, TEST_POLICIES } from "@/lib/planning";
import { getCurrentUser } from "@/server/session";
import { searchSchools, type SchoolFilters } from "@/server/services/schools";
import { listedSchoolIds } from "@/server/services/college-list";
import { getProfile } from "@/server/services/profile";
import { AddToListButton, CompareBar, CompareProvider, CompareToggle } from "@/components/cds/SchoolClientBits";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("schools.title") };
}

type SP = Record<string, string | string[] | undefined>;
const arr = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? v.split(",") : []).filter(Boolean);
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export default async function SchoolsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { t, locale } = await getT();
  const user = await getCurrentUser();
  const filters: SchoolFilters = {
    q: one(sp.q),
    regions: arr(sp.region),
    sizes: arr(sp.size),
    control: one(sp.control),
    testPolicy: one(sp.testPolicy),
    admitRate: one(sp.admitRate),
    round: one(sp.round),
    intlAid: one(sp.intlAid),
    field: one(sp.field),
  };
  const { results, hiddenForMissingData } = await searchSchools(filters);
  const listed = user ? await listedSchoolIds(user.id) : new Set<string>();
  let prefsHref: string | null = null;
  if (user) {
    const prefs = (await getProfile(user.id)).preferences;
    const q = new URLSearchParams();
    for (const r of prefs.regions) q.append("region", r);
    for (const s of prefs.sizes) q.append("size", s);
    if (prefs.needAid === "yes") q.set("intlAid", "need");
    if (q.toString()) prefsHref = `/schools?${q.toString()}`;
  }
  const zh = locale === "zh-CN";
  const sel = (name: string, label: string, value: string | undefined, options: [string, string][]) => (
    <div>
      <label htmlFor={`f-${name}`} className="field-label text-sm">{label}</label>
      <select id={`f-${name}`} name={name} defaultValue={value ?? ""} className="input">
        <option value="">{t("schools.any")}</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">{t("schools.title")}</h1>
          <p className="mt-2 max-w-3xl text-ink-soft">{t("schools.intro")}</p>
        </div>
        <Link href="/cds" className="btn btn-secondary btn-sm">{t("nav.cdsGuide")}</Link>
      </div>

      <form method="get" className="card mt-6 p-4">
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <div>
            <label htmlFor="f-q" className="field-label text-sm">{t("schools.search")}</label>
            <input id="f-q" name="q" defaultValue={filters.q ?? ""} className="input" />
          </div>
          {sel("control", t("schools.control"), filters.control, [["public", t("schools.controls.public")], ["private", t("schools.controls.private")]])}
        </div>
        <details className="mt-3" open={Boolean(filters.regions?.length || filters.sizes?.length || filters.testPolicy || filters.admitRate || filters.round || filters.intlAid || filters.field)}>
          <summary className="cursor-pointer text-sm font-semibold">{t("schools.filters")}</summary>
          <div className="mt-3 grid gap-4 md:grid-cols-3">
            <fieldset>
              <legend className="field-label text-sm">{t("schools.region")}</legend>
              {REGIONS.map((r) => (
                <label key={r} className="flex min-h-9 items-center gap-2 text-sm">
                  <input type="checkbox" name="region" value={r} defaultChecked={filters.regions?.includes(r)} className="h-4 w-4 accent-teal" />
                  {t(`profile.regions.${r}` as never)}
                </label>
              ))}
            </fieldset>
            <fieldset>
              <legend className="field-label text-sm">{t("schools.size")}</legend>
              {SIZE_PREFS.map((s) => (
                <label key={s} className="flex min-h-9 items-center gap-2 text-sm">
                  <input type="checkbox" name="size" value={s} defaultChecked={filters.sizes?.includes(s)} className="h-4 w-4 accent-teal" />
                  {t(`profile.sizes.${s}` as never)}
                </label>
              ))}
            </fieldset>
            <div className="space-y-3">
              {sel("testPolicy", t("schools.testPolicy"), filters.testPolicy, TEST_POLICIES.map((p) => [p, t(`testPolicies.${p}` as never)]))}
              {sel("admitRate", t("schools.admitRate"), filters.admitRate, (["under10", "10to25", "25to50", "over50"] as const).map((b) => [b, t(`schools.admitRates.${b}` as never)]))}
            </div>
            {sel("round", t("schools.round"), filters.round, [["ed", t("schools.rounds.ed")], ["ea", t("schools.rounds.ea")]])}
            {sel("intlAid", t("schools.intlAid"), filters.intlAid, [["need", t("schools.intlAids.need")], ["any", t("schools.intlAids.any")]])}
            {sel("field", t("schools.field"), filters.field, CIP_CODES.map((c) => [c, CIP_FAMILIES[c][zh ? "zh" : "en"]]))}
          </div>
        </details>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="submit" className="btn btn-primary btn-sm">{t("schools.apply")}</button>
          <Link href="/schools" className="btn btn-ghost btn-sm">{t("schools.clear")}</Link>
          {prefsHref ? <Link href={prefsHref} className="btn btn-secondary btn-sm">{t("schools.usePreferences")}</Link> : null}
        </div>
      </form>

      <CompareProvider>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="font-semibold" role="status">{results.length === 1 ? t("schools.resultsOne") : t("schools.results", { count: results.length })}</p>
          <CompareBar />
        </div>
        {hiddenForMissingData ? <p className="notice mt-3 text-sm">{t("schools.hiddenNote", { count: hiddenForMissingData })}</p> : null}
        {results.length === 0 ? <p className="notice mt-4">{t("schools.noResults")}</p> : null}
        <ul className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {results.map(({ school: s, latest }) => (
            <li key={s.id} className="card flex flex-col p-5">
              <h2 className="text-lg font-semibold">
                <Link href={`/schools/${s.slug}`} className="text-ink">{zh && s.nameZh ? s.nameZh : s.name}</Link>
              </h2>
              <p className="text-sm text-ink-soft">
                {zh && s.nameZh ? `${s.name} · ` : ""}
                {[s.city, s.state].filter(Boolean).join(", ")}
                {s.control ? ` · ${t(`schools.controls.${s.control}` as never)}` : ""}
              </p>
              <div className="mt-3 flex-1 text-sm">
                {latest ? (
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
                    <dt className="text-ink-soft">{t("cdsFields.admitRate")}</dt>
                    <dd className="text-right font-semibold">{latest.derived.admitRate != null ? `${latest.derived.admitRate}%` : t("schools.notReported")}</dd>
                    <dt className="text-ink-soft">{t("cdsFields.testPolicy")}</dt>
                    <dd className="text-right font-semibold">{latest.data.testPolicy ? t(`testPolicies.${latest.data.testPolicy}` as never) : t("schools.notReported")}</dd>
                    <dt className="text-ink-soft">{t("cdsFields.undergradTotal")}</dt>
                    <dd className="text-right font-semibold">{typeof latest.data.undergradTotal === "number" ? latest.data.undergradTotal.toLocaleString() : t("schools.notReported")}</dd>
                    <dt className="col-span-2 mt-1 text-xs text-ink-faint">{t("schools.dataYear", { year: latest.academicYear })}</dt>
                  </dl>
                ) : (
                  <p><span className="badge badge-neutral">{t("schools.noData")}</span></p>
                )}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Link href={`/schools/${s.slug}`} className="btn btn-primary btn-sm">{t("schools.view")}</Link>
                <AddToListButton schoolId={s.id} onList={listed.has(s.id)} signedIn={Boolean(user)} />
                <CompareToggle schoolId={s.id} name={s.name} />
              </div>
              {s.cdsPageUrl ? (
                <a href={s.cdsPageUrl} target="_blank" rel="noopener noreferrer" className="mt-3 text-sm">
                  {t("schools.officialCds")} <span className="sr-only">{t("schools.opensNewTab")}</span>
                  <span aria-hidden="true">↗</span>
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      </CompareProvider>
    </div>
  );
}
