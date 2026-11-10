import Link from "next/link";
import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { FIT_CATEGORIES, studentScores, type FitCategory, type FitReason } from "@/lib/fit";
import { TUITION_BANDS } from "@/lib/federal";
import { CIP_CODES, CIP_FAMILIES } from "@/lib/planning";
import { requirePageUser } from "@/server/session";
import { getProfile } from "@/server/services/profile";
import { listedSchoolIds } from "@/server/services/college-list";
import { chosenFields, recommendSchools, type Recommendation } from "@/server/services/recommendations";
import { AddToListButton } from "@/components/cds/SchoolClientBits";
import { BUCKET_STYLE, fitReasonText } from "@/components/schools/FitBadge";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("recommend.metaTitle") };
}

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export default async function RecommendedPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requirePageUser();
  const sp = await searchParams;
  const { t, locale } = await getT();
  const zh = locale === "zh-CN";
  const nf = new Intl.NumberFormat(zh ? "zh-CN" : "en-US");
  const profile = await getProfile(user.id);
  const myFields = chosenFields(profile);
  const fieldParam = one(sp.field);
  const field = fieldParam && CIP_CODES.includes(fieldParam) ? fieldParam : undefined;
  const tuition = one(sp.tuition);
  const tuitionKey = tuition && TUITION_BANDS[tuition] ? tuition : undefined;
  const [{ fields, buckets, candidates, noAdmitRate }, listed] = await Promise.all([
    recommendSchools(profile, { field, tuition: tuitionKey }),
    listedSchoolIds(user.id),
  ]);
  const fieldName = (code: string) => CIP_FAMILIES[code]?.[zh ? "zh" : "en"] ?? code;
  const catName = (c: FitCategory) => t(`recommend.buckets.${c}.title`);

  const scores = studentScores(profile.tests);
  const prefs = profile.preferences;
  const scoreText =
    prefs.testPlan === "not_submit"
      ? t("recommend.notSubmitting")
      : [scores.sat != null ? `SAT ${scores.sat}` : null, scores.act != null ? `ACT ${scores.act}` : null].filter(Boolean).join(" · ") || t("recommend.noScores");
  const prefText =
    [...prefs.sizes.map((s) => t(`profile.sizes.${s}` as never)), ...prefs.regions.map((r) => t(`profile.regions.${r}` as never))].join(zh ? "、" : ", ") ||
    t("recommend.anyPrefs");

  const reasonText = (r: FitReason) => fitReasonText(t, r);

  if (!myFields.length && !field) {
    return (
      <div className="container-page py-10">
        <h1 className="text-3xl font-semibold">{t("recommend.title")}</h1>
        <div className="card mt-6 max-w-2xl p-6">
          <h2 className="text-xl font-semibold">{t("recommend.noMajorsTitle")}</h2>
          <p className="mt-2 text-ink-soft">{t("recommend.noMajorsBody")}</p>
          <Link href="/majors" className="btn btn-primary mt-4">{t("recommend.goMajors")} →</Link>
        </div>
      </div>
    );
  }

  const card = (r: Recommendation) => {
    const s = r.school;
    const style = BUCKET_STYLE[r.fit.category];
    return (
      <li key={s.id} className="card flex flex-col p-4" style={{ borderTop: `4px solid ${style.color}` }}>
        <h3 className="font-semibold">
          <Link href={`/schools/${s.slug}`} className="text-ink">{zh && s.nameZh ? s.nameZh : s.name}</Link>
        </h3>
        <p className="text-xs text-ink-soft">
          {[s.city, s.state].filter(Boolean).join(", ")}
          {s.control ? ` · ${t(`schools.controls.${s.control}` as never)}` : ""}
          {r.facts.undergrads ? ` · ${t("recommend.undergrads", { count: nf.format(r.facts.undergrads.value) })}` : ""}
        </p>
        <p className="mt-2 text-sm font-medium" style={{ color: "#6d28d9" }}>
          {t("recommend.strongIn", { share: r.field.share, field: fieldName(r.field.code) })}
        </p>
        {r.facts.gradRate ? <p className="text-xs text-ink-soft">{t("recommend.gradRate", { rate: Math.round(r.facts.gradRate.value) })}</p> : null}
        <ul className="mt-2 flex-1 space-y-1 text-sm text-ink-soft">
          {r.fit.reasons.map((reason, i) => (
            <li key={i} className="flex gap-1.5">
              <span aria-hidden="true" style={{ color: style.color }}>•</span>
              <span>{reasonText(reason)}</span>
            </li>
          ))}
        </ul>
        {r.outsidePreferences ? <p className="mt-2"><span className="badge badge-neutral">{t("recommend.outside")}</span></p> : null}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <AddToListButton schoolId={s.id} onList={listed.has(s.id)} signedIn category={r.fit.category} label={t("recommend.addAs", { category: catName(r.fit.category) })} />
          <Link href={`/schools/${s.slug}`} className="btn btn-ghost btn-sm">{t("schools.view")}</Link>
        </div>
      </li>
    );
  };

  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-semibold">{t("recommend.title")}</h1>
      <p className="mt-2 max-w-3xl text-ink-soft">{t("recommend.intro")}</p>

      <section className="card mt-6 p-4" aria-label={t("recommend.basedOn")}>
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="font-semibold">{t("recommend.majorsLabel")} <Link href="/majors" className="ml-1 text-xs font-normal">{t("recommend.edit")}</Link></dt>
            <dd className="text-ink-soft">{fields.map(fieldName).join(zh ? "、" : ", ")}</dd>
          </div>
          <div>
            <dt className="font-semibold">{t("recommend.scoresLabel")} <Link href="/profile" className="ml-1 text-xs font-normal">{t("recommend.edit")}</Link></dt>
            <dd className="text-ink-soft">{scoreText}</dd>
          </div>
          <div>
            <dt className="font-semibold">{t("recommend.prefsLabel")} <Link href="/profile" className="ml-1 text-xs font-normal">{t("recommend.edit")}</Link></dt>
            <dd className="text-ink-soft">{prefText}</dd>
          </div>
        </dl>
        <form method="get" className="mt-4 flex flex-wrap items-end gap-3 border-t border-line pt-4">
          <div>
            <label htmlFor="r-field" className="field-label text-sm">{t("recommend.field")}</label>
            <select id="r-field" name="field" defaultValue={field ?? ""} className="input">
              <option value="">{t("recommend.allMyFields")}</option>
              {(myFields.length ? myFields : CIP_CODES).map((c) => <option key={c} value={c}>{fieldName(c)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="r-tuition" className="field-label text-sm">{t("recommend.tuition")}</label>
            <select id="r-tuition" name="tuition" defaultValue={tuitionKey ?? ""} className="input">
              <option value="">{t("schools.any")}</option>
              {Object.keys(TUITION_BANDS).map((b) => <option key={b} value={b}>{t(`schools.tuitionBands.${b}` as never)}</option>)}
            </select>
          </div>
          <button type="submit" className="btn btn-secondary btn-sm">{t("recommend.update")}</button>
        </form>
      </section>

      <aside className="notice mt-4 text-sm" aria-labelledby="rec-how">
        <p id="rec-how" className="font-semibold">{t("recommend.disclaimerTitle")}</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>{t("recommend.disclaimer1")}</li>
          <li>{t("recommend.disclaimer2")}</li>
          <li>{t("recommend.disclaimer3")}</li>
        </ul>
      </aside>

      <p className="mt-4 text-sm text-ink-soft">
        {t("recommend.candidates", { count: nf.format(candidates) })} {t("recommend.ranking")} {noAdmitRate ? t("recommend.noAdmitRate", { count: nf.format(noAdmitRate) }) : null}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {FIT_CATEGORIES.map((cat) => {
          const style = BUCKET_STYLE[cat];
          return (
            <section key={cat} aria-labelledby={`bucket-${cat}`} className="rounded-2xl p-4" style={{ background: style.soft }}>
              <h2 id={`bucket-${cat}`} className="flex items-center gap-2 text-xl font-semibold" style={{ color: style.color }}>
                <span aria-hidden="true">{style.icon}</span>
                {catName(cat)}
                <span className="ml-auto rounded-full px-2 py-0.5 text-xs text-white" style={{ background: style.color }}>{buckets[cat].length}</span>
              </h2>
              <p className="mt-1 text-sm text-ink-soft">{t(`recommend.buckets.${cat}.body`)}</p>
              {buckets[cat].length ? (
                <ul className="mt-3 space-y-3">{buckets[cat].map(card)}</ul>
              ) : (
                <p className="mt-3 text-sm">{t("recommend.empty")}</p>
              )}
            </section>
          );
        })}
      </div>

      <p className="mt-6">
        <Link href={`/schools?field=${field ?? fields[0]}`}>{t("recommend.seeAll")} →</Link>
      </p>
    </div>
  );
}
