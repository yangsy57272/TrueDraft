import { CIP_FAMILIES } from "@/lib/planning";
import { federalTestPolicy, type FederalData, type FederalPeriod } from "@/lib/federal";

type T = (key: never, values?: Record<string, string | number>) => string;

/**
 * U.S. Department of Education (College Scorecard / IPEDS) figures for one school, each with the
 * period it describes. Server component: values are rendered as published, never estimated.
 */
export function FederalView({ data, unitid, fileDate, t, locale, compact = false }: { data: FederalData; unitid: string; fileDate: string; t: T; locale: string; compact?: boolean }) {
  const tt = t as unknown as (k: string, v?: Record<string, string | number>) => string;
  const nf = new Intl.NumberFormat(locale === "zh-CN" ? "zh-CN" : "en-US");
  const money = (v: number | null | undefined) => (v == null ? null : `$${nf.format(v)}`);
  const pct = (v: number | null | undefined) => (v == null ? null : `${v}%`);
  const range = (a: number | null | undefined, b: number | null | undefined) => (a == null || b == null ? null : `${a}–${b}`);
  const period = (p: FederalPeriod | undefined) =>
    p ? tt(`federal.period.${p.kind}`, { year: String(p.year) }) : null;
  const P = data.periods ?? {};
  const policy = federalTestPolicy(data.testRequirement ?? null);
  const topFields = Object.entries(data.degreesByField ?? {})
    .filter(([code]) => CIP_FAMILIES[code])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const rows: [string, string | null, string | null][] = [
    [tt("federal.admissionRate"), pct(data.admissionRate), period(P.admissions)],
    [tt("federal.testRequirement"), policy ? tt(`federal.testPolicies.${policy}`) : null, period(P.admissions)],
    [tt("federal.satEbrw"), range(data.satEbrw25, data.satEbrw75), period(P.admissions)],
    [tt("federal.satMath"), range(data.satMath25, data.satMath75), period(P.admissions)],
    [tt("federal.act"), data.actComposite25 != null && data.actComposite75 != null ? `${data.actComposite25}–${data.actComposite75}${data.actComposite50 != null ? ` (${tt("federal.midpoint")} ${data.actComposite50})` : ""}` : null, period(P.admissions)],
    [tt("federal.undergrads"), data.undergrads == null ? null : nf.format(data.undergrads), period(P.enrollment)],
    [tt("federal.intlShare"), pct(data.intlSharePct), period(P.enrollment)],
    [tt("federal.tuitionOut"), money(data.tuitionOutOfState), period(P.tuition)],
    [tt("federal.tuitionIn"), money(data.tuitionInState), period(P.tuition)],
    [tt("federal.costOfAttendance"), money(data.costOfAttendance), period(P.costOfAttendance)],
    [tt("federal.gradRate"), pct(data.gradRatePct), period(P.gradRate)],
    [tt("federal.retention"), pct(data.retentionRatePct), period(P.retention)],
  ];

  return (
    <section className="card p-5" aria-labelledby="federal-h">
      <h2 id="federal-h" className="font-serif text-xl font-semibold">{tt("federal.title")}</h2>
      <p className="mt-1 text-sm text-ink-soft">{tt("federal.intro")}</p>
      <dl className={`mt-4 grid gap-x-6 gap-y-2 text-sm ${compact ? "" : "md:grid-cols-2"}`}>
        {rows.map(([label, value, when]) => (
          <div key={label} className="flex items-baseline justify-between gap-3 border-t border-line pt-2">
            <dt>
              {label}
              {when ? <span className="block text-xs text-ink-faint">{when}</span> : null}
            </dt>
            <dd className={value ? "text-right font-semibold" : "text-right text-ink-faint"}>{value ?? tt("schools.notReported")}</dd>
          </div>
        ))}
      </dl>
      {data.testRequirement === 3 ? <p className="mt-2 text-xs text-ink-soft">{tt("federal.neitherNote")}</p> : null}
      {data.tuitionOutOfState != null ? <p className="mt-2 text-xs text-ink-soft">{tt("federal.tuitionNote")}</p> : null}
      {topFields.length ? (
        <div className="mt-5">
          <h3 className="text-sm font-semibold">{tt("federal.topFields")}</h3>
          <p className="text-xs text-ink-faint">{period(P.degrees)}</p>
          <ul className="mt-2 space-y-1.5">
            {topFields.map(([code, share]) => (
              <li key={code} className="grid grid-cols-[minmax(0,12rem)_1fr_3.5rem] items-center gap-3 text-sm">
                <span className="truncate">{CIP_FAMILIES[code][locale === "zh-CN" ? "zh" : "en"]}</span>
                <span className="h-2 rounded-full bg-paper-2" aria-hidden="true">
                  <span className="block h-2 rounded-full bg-teal" style={{ width: `${Math.min(100, share)}%` }} />
                </span>
                <span className="text-right font-semibold">{share}%</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="mt-4 text-xs text-ink-soft">
        {tt("federal.source", { date: fileDate })}{" "}
        <a href={`https://collegescorecard.ed.gov/school/?${encodeURIComponent(unitid)}`} target="_blank" rel="noopener noreferrer">
          {tt("federal.openScorecard")} <span className="sr-only">{tt("schools.opensNewTab")}</span>↗
        </a>
      </p>
    </section>
  );
}
