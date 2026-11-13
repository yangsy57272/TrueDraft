import Link from "next/link";
import { SchoolRankings } from "@/components/schools/SchoolRankings";
import { SchoolAnalysis } from "@/components/schools/SchoolAnalysis";
import { aiFactsFor } from "@/server/ai-facts";
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
  const priority = one(sp.priority) === "overall" ? "overall" : one(sp.priority) === "program" ? "program" : "balanced";
  const ai = await aiFactsFor(user.id);
  const tuition = one(sp.tuition);
  const tuitionKey = tuition && TUITION_BANDS[tuition] ? tuition : undefined;
  const [{ fields, buckets, candidates, noAdmitRate }, listed] = await Promise.all([
    recommendSchools(profile, { field, tuition: tuitionKey, priority }),
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
      <p className="mb-4 text-sm"><Link href="/schools?country=UK">UK</Link> · <Link href="/schools?country=HK">香港 / Hong Kong</Link> · <Link href="/schools?country=CA">Canada</Link> · <Link href="/schools?country=AU">Australia</Link> · <Link href="/schools?country=SG">Singapore</Link> — {locale === "zh-CN" ? "其他体系按课程与资格研究，不套用美国分组" : "Explore other systems by programme and qualification; U.S. groups do not apply"}</p>
        <h1 className="text-3xl font-semibold">{t("recommend.title")}</h1>
        <div className="card mt-6 max-w-2xl p-6">
          <h2 className="text-xl font-semibold">{t("recommend.noMajorsTitle")}</h2>
          <p className="mt-2 text-ink-soft">{t("recommend.noMajorsBody")}</p>
          <form method="get" className="mt-4 flex flex-wrap gap-3">
            <label htmlFor="choose-field">{zh ? "选择想申请的学科" : "Choose your academic field"}</label>
            <select id="choose-field" name="field" className="input" required defaultValue="">
              <option value="" disabled>{zh ? "请选择" : "Select a field"}</option>
              {CIP_CODES.map(c => <option key={c} value={c}>{fieldName(c)}</option>)}
            </select>
            <button className="btn btn-primary">{zh ? "推荐学校 →" : "Recommend colleges →"}</button>
          </form>
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
          <Link href={`/schools/${s.slug}?field=${r.field.code}`} className="text-ink">{zh && s.nameZh ? s.nameZh : s.name}</Link>
        </h3>
        <p className="text-xs text-ink-soft">
          {[s.city, s.state].filter(Boolean).join(", ")}
          {s.control ? ` · ${t(`schools.controls.${s.control}` as never)}` : ""}
          {r.facts.undergrads ? ` · ${t("recommend.undergrads", { count: nf.format(r.facts.undergrads.value) })}` : ""}
        </p>
        <p className="mt-2 text-sm font-medium" style={{ color: "#6d28d9" }}>
          {fieldName(r.field.code)} · {r.field.share}% {zh ? "本科毕业生占比（不代表专业质量）" : "of bachelor’s degrees (prevalence, not quality)"}
        </p>
        <SchoolRankings unitid={s.unitid} field={r.field.code} zh={zh} />
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
          <AddToListButton schoolId={s.id} onList={listed.has(s.id)} signedIn intendedMajor={profile.intendedMajors.find(m => m.cipFamily === r.field.code)?.name ?? fieldName(r.field.code)} category={r.fit.category} label={t("recommend.addAs", { category: catName(r.fit.category) })} />
          <Link href={`/schools/${s.slug}?field=${r.field.code}`} className="btn btn-ghost btn-sm">{t("schools.view")}</Link>
        </div>
      </li>
    );
  };

  return (
    <div className="container-page py-10">
      <p className="mb-4 text-sm"><Link href="/schools?country=UK">UK</Link> · <Link href="/schools?country=HK">香港 / Hong Kong</Link> · <Link href="/schools?country=CA">Canada</Link> · <Link href="/schools?country=AU">Australia</Link> · <Link href="/schools?country=SG">Singapore</Link> — {locale === "zh-CN" ? "其他体系按课程与资格研究，不套用美国分组" : "Explore other systems by programme and qualification; U.S. groups do not apply"}</p>
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
              {CIP_CODES.map((c) => <option key={c} value={c}>{fieldName(c)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="r-tuition" className="field-label text-sm">{t("recommend.tuition")}</label>
            <select id="r-tuition" name="tuition" defaultValue={tuitionKey ?? ""} className="input">
              <option value="">{t("schools.any")}</option>
              {Object.keys(TUITION_BANDS).map((b) => <option key={b} value={b}>{t(`schools.tuitionBands.${b}` as never)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="r-priority" className="field-label text-sm">{zh ? "推荐侧重" : "Recommendation priority"}</label>
            <select id="r-priority" name="priority" defaultValue={priority} className="input">
              <option value="balanced">{zh ? "综合匹配" : "Balanced fit"}</option>
              <option value="program">{zh ? "本科专业排名" : "Undergraduate program rank"}</option>
              <option value="overall">{zh ? "全国综合大学排名" : "National university rank"}</option>
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
        {t("recommend.candidates", { count: nf.format(candidates) })} {zh ? "排序参考学科规模、毕业率和已核实排名。未收录排名不代表质量较差；不同榜单类别不直接比较。" : "Ordering considers field prevalence, graduation rates and verified rankings. Missing ranks do not imply poor quality; ranking categories are kept separate."} {noAdmitRate ? t("recommend.noAdmitRate", { count: nf.format(noAdmitRate) }) : null}
      </p>

      <p className="mt-3 text-sm text-ink-soft">{zh ? "分组基于全校历史录取率，而非特定专业录取率。热门专业、国际生、奖助学金需求可能使申请更难。Safety 不是保证录取或可负担。请核实专业是否直录及转专业限制。" : "Groups use university-wide historical admission data, not major-specific rates. Competitive majors, international status and financial aid needs can make admission harder. Safety guarantees neither admission nor affordability. Check direct admission and major transfer restrictions."}</p>
      <SchoolAnalysis key={`${field}:${tuitionKey}:${priority}`} ai={ai} field={field} tuition={tuitionKey} priority={priority} schools={Object.values(buckets).flat().map(r => ({ id: r.school.id, name: zh && r.school.nameZh ? r.school.nameZh : r.school.name, slug: r.school.slug, group: catName(r.fit.category) }))} />
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
