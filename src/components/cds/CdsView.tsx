import type { ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import type { Translator } from "@/i18n/translate";
import { C7_ACADEMIC, C7_FACTORS, CDS_FIELDS, CIP_FAMILIES, derived as computeDerived, num, type CdsData } from "@/lib/planning";

const ITEM = new Map(CDS_FIELDS.map((f) => [f.key, f.item]));
const TYPE = new Map(CDS_FIELDS.map((f) => [f.key, f.type]));

export type ProfileTests = { satTotal?: number | null; actComposite?: number | null };

function fmt(locale: Locale, key: string, value: unknown, t: Translator): string | null {
  if (value === null || value === undefined) return null;
  const type = TYPE.get(key);
  const nf = new Intl.NumberFormat(locale === "zh-CN" ? "zh-CN" : "en-US");
  if (type === "bool") return value ? t("schools.school.yes") : t("schools.school.no");
  if (type === "money") return `$${nf.format(value as number)}`;
  if (type === "percent") return `${nf.format(value as number)}%`;
  if (type === "monthday") {
    const [m, d] = String(value).split("-").map(Number);
    return new Intl.DateTimeFormat(locale === "zh-CN" ? "zh-CN" : "en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(Date.UTC(2000, m - 1, d));
  }
  if (type === "enum" && key === "testPolicy") return t(`testPolicies.${value}` as never);
  if (key === "studentFacultyRatio") return `${nf.format(value as number)} : 1`;
  return typeof value === "number" ? nf.format(value) : String(value);
}

function Row({ label, value, item, notReported }: { label: string; value: string | null; item?: string; notReported: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-line py-2 first:border-t-0">
      <dt className="text-sm text-ink-soft">
        {label}
        {item ? <span className="ml-2 rounded bg-paper-2 px-1.5 py-0.5 font-mono text-[0.7rem] text-ink-faint">{item}</span> : null}
      </dt>
      <dd className={`text-right font-semibold ${value == null ? "font-normal text-ink-faint" : ""}`}>{value ?? notReported}</dd>
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card p-5">
      <h3 className="font-serif text-lg font-semibold">{title}</h3>
      <dl className="mt-3">{children}</dl>
    </section>
  );
}

const LEVEL_STYLE: Record<string, { cls: string; icon: string }> = {
  very_important: { cls: "badge-strong", icon: "●●" },
  important: { cls: "badge-strong", icon: "●" },
  considered: { cls: "badge-neutral", icon: "○" },
  not_considered: { cls: "badge-neutral", icon: "–" },
};

/** Range bar for 25th–75th percentile scores, with a text equivalent. */
function RangeBar({ lo, mid, hi, min, max, label }: { lo: number; mid: number | null; hi: number; min: number; max: number; label: string }) {
  const pct = (v: number) => `${Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100))}%`;
  return (
    <div className="mt-2" aria-hidden="true">
      <div className="relative h-2 rounded-full bg-paper-2" title={label}>
        <div className="absolute h-2 rounded-full bg-sage" style={{ left: pct(lo), width: `calc(${pct(hi)} - ${pct(lo)})` }} />
        {mid != null ? <div className="absolute -top-1 h-4 w-0.5 bg-ink" style={{ left: pct(mid) }} /> : null}
      </div>
    </div>
  );
}

export function CdsView({ data, t, locale, tests }: { data: CdsData; t: Translator; locale: Locale; tests?: ProfileTests | null }) {
  const d = computeDerived(data);
  const nr = t("schools.notReported");
  const v = (key: string) => fmt(locale, key, (data as Record<string, unknown>)[key], t);
  const r = (key: string) => <Row key={key} label={t(`cdsFields.${key}` as never)} value={v(key)} item={ITEM.get(key)} notReported={nr} />;
  const pct = (value: number | null) => (value == null ? null : `${value}%`);

  const satLo = num(data, "satComposite25");
  const satHi = num(data, "satComposite75");
  const actLo = num(data, "actComposite25");
  const actHi = num(data, "actComposite75");

  const context: string[] = [];
  const place = (test: string, score: number | null | undefined, lo: number | null, hi: number | null) => {
    if (score == null || lo == null || hi == null) return;
    const key = score < lo ? "belowRange" : score > hi ? "aboveRange" : "inRange";
    context.push(t(`schools.school.${key}` as never, { test, score, lo, hi }));
  };
  place("SAT", tests?.satTotal, satLo, satHi);
  place("ACT", tests?.actComposite, actLo, actHi);

  const c7 = data.c7 ?? {};
  const degrees = Object.entries(data.degreesByField ?? {})
    .filter(([code, share]) => CIP_FAMILIES[code] && share > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Block title={t("schools.school.admissions")}>
        {r("applicants")}
        {r("admitted")}
        {r("enrolled")}
        <Row label={t("cdsFields.admitRate")} value={pct(d.admitRate)} item="C1" notReported={nr} />
        <Row label={t("cdsFields.yieldRate")} value={pct(d.yieldRate)} item="C1" notReported={nr} />
        {r("waitlistOffered")}
        {r("waitlistAccepted")}
        {r("waitlistAdmitted")}
      </Block>

      <Block title={t("schools.school.tests")}>
        {r("testPolicy")}
        {r("satSubmitPct")}
        <Row label="SAT 25th–75th" value={satLo != null && satHi != null ? `${satLo}–${satHi}` : null} item="C9" notReported={nr} />
        {satLo != null && satHi != null ? <RangeBar lo={satLo} hi={satHi} mid={num(data, "satComposite50")} min={400} max={1600} label="SAT" /> : null}
        {r("actSubmitPct")}
        <Row label="ACT 25th–75th" value={actLo != null && actHi != null ? `${actLo}–${actHi}` : null} item="C9" notReported={nr} />
        {actLo != null && actHi != null ? <RangeBar lo={actLo} hi={actHi} mid={num(data, "actComposite50")} min={1} max={36} label="ACT" /> : null}
        {r("avgGpa")}
        {r("gpaSubmitPct")}
        {context.length ? (
          <div className="mt-4 rounded-lg bg-paper-2 p-3 text-sm">
            <p className="font-semibold">{t("schools.school.yourContext")}</p>
            <ul className="mt-1 list-disc pl-5">{context.map((c, i) => <li key={i}>{c}</li>)}</ul>
            <p className="mt-2 text-xs text-ink-soft">{t("schools.school.yourContextNote")}</p>
          </div>
        ) : null}
      </Block>

      <section className="card p-5 lg:col-span-2">
        <h3 className="font-serif text-lg font-semibold">
          {t("c7.title")}
        </h3>
        <p className="mt-1 text-sm text-ink-soft">{t("c7.note")}</p>
        {Object.keys(c7).length === 0 ? (
          <p className="mt-3 text-sm text-ink-faint">{nr}</p>
        ) : (
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            {[true, false].filter((academic) => C7_FACTORS.some((f) => C7_ACADEMIC.has(f) === academic && c7[f])).map((academic) => (
              <div key={String(academic)}>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">{academic ? t("c7.academic") : t("c7.nonAcademic")}</h4>
                <dl className="mt-2">
                  {C7_FACTORS.filter((f) => C7_ACADEMIC.has(f) === academic && c7[f]).map((f) => {
                    const level = c7[f];
                    const style = level ? LEVEL_STYLE[level] : null;
                    return (
                      <div key={f} className="flex items-center justify-between gap-3 border-t border-line py-1.5 text-sm first:border-t-0">
                        <dt>{t(`c7.factors.${f}` as never)}</dt>
                        <dd>
                          {level && style ? (
                            <span className={`badge ${style.cls}`}>
                              <span aria-hidden="true">{style.icon}</span>
                              {t(`c7.levels.${level}` as never)}
                            </span>
                          ) : (
                            <span className="text-ink-faint">{nr}</span>
                          )}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
            ))}
          </div>
        )}
        {Object.keys(c7).length > 0 && C7_FACTORS.some((f) => !c7[f]) ? (
          <p className="mt-3 text-xs text-ink-faint">{t("c7.unreported", { count: C7_FACTORS.filter((f) => !c7[f]).length })}</p>
        ) : null}
      </section>

      <Block title={t("schools.school.deadlines")}>
        {r("appFee")}
        {r("regularDeadline")}
        {r("earlyDecision")}
        {r("edDeadline")}
        {r("edApplicants")}
        {r("edAdmitted")}
        <Row label={t("cdsFields.edAdmitRate")} value={pct(d.edAdmitRate)} item="C21" notReported={nr} />
        {r("earlyAction")}
        {r("eaDeadline")}
        {r("eaRestrictive")}
      </Block>

      <Block title={t("schools.school.international")}>
        {r("intlUndergrads")}
        <Row label={t("cdsFields.intlShare")} value={pct(d.intlShare)} item="B2" notReported={nr} />
        {r("intlAidNeedBased")}
        {r("intlAidNonNeed")}
        {r("intlAidNotAvailable")}
        {r("intlAidRecipients")}
        {r("intlAidAverage")}
      </Block>

      <Block title={t("schools.school.cost")}>
        {r("tuition")}
        {r("requiredFees")}
        {r("foodHousing")}
      </Block>

      <Block title={t("schools.school.outcomes")}>
        {r("undergradTotal")}
        {r("retentionRate")}
        {r("gradRate6yr")}
        {r("studentFacultyRatio")}
      </Block>

      <section className="card p-5 lg:col-span-2">
        <h3 className="font-serif text-lg font-semibold">{t("schools.school.degrees")}</h3>
        <p className="mt-1 text-sm text-ink-soft">{t("schools.school.degreesNote")}</p>
        {degrees.length === 0 ? (
          <p className="mt-3 text-sm text-ink-faint">{nr}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {degrees.map(([code, share]) => (
              <li key={code} className="grid grid-cols-[minmax(0,12rem)_1fr_3.5rem] items-center gap-3 text-sm">
                <span className="truncate">{CIP_FAMILIES[code][locale === "zh-CN" ? "zh" : "en"]}</span>
                <span className="h-2 rounded-full bg-paper-2" aria-hidden="true">
                  <span className="block h-2 rounded-full bg-teal" style={{ width: `${Math.min(100, share)}%` }} />
                </span>
                <span className="text-right font-semibold">{share}%</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
