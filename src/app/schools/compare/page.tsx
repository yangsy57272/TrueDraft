import Link from "next/link";
import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { getSchoolsByIds } from "@/server/services/schools";
import { isUuid } from "@/server/page-data";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("schools.compareTitle") };
}

const ROWS: { key: string; item: string; format: "pct" | "money" | "num" | "policy" | "bool" | "range" }[] = [
  { key: "admitRate", item: "C1", format: "pct" },
  { key: "applicants", item: "C1", format: "num" },
  { key: "edAdmitRate", item: "C21", format: "pct" },
  { key: "testPolicy", item: "C8", format: "policy" },
  { key: "satRange", item: "C9", format: "range" },
  { key: "actRange", item: "C9", format: "range" },
  { key: "earlyDecision", item: "C21", format: "bool" },
  { key: "earlyAction", item: "C22", format: "bool" },
  { key: "undergradTotal", item: "B1", format: "num" },
  { key: "intlShare", item: "B2", format: "pct" },
  { key: "intlAidNeedBased", item: "H6", format: "bool" },
  { key: "intlAidAverage", item: "H6", format: "money" },
  { key: "tuition", item: "G1", format: "money" },
  { key: "gradRate6yr", item: "B11", format: "pct" },
];

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const { ids } = await searchParams;
  const { t, locale } = await getT();
  const list = (ids ?? "").split(",").filter(isUuid).slice(0, 4);
  const schools = await getSchoolsByIds(list);
  const nf = new Intl.NumberFormat(locale === "zh-CN" ? "zh-CN" : "en-US");
  const zh = locale === "zh-CN";

  const cell = (entry: (typeof schools)[number], row: (typeof ROWS)[number]) => {
    const latest = entry.latest;
    if (!latest) return null;
    const d = latest.data as Record<string, unknown>;
    const derived = latest.derived as Record<string, number | null>;
    if (row.format === "range") {
      const prefix = row.key === "satRange" ? "satComposite" : "actComposite";
      const lo = d[prefix + "25"];
      const hi = d[prefix + "75"];
      return typeof lo === "number" && typeof hi === "number" ? lo + "–" + hi : null;
    }
    const v = row.key in derived ? derived[row.key] : d[row.key];
    if (v === null || v === undefined) return null;
    if (row.format === "pct") return v + "%";
    if (row.format === "money") return "$" + nf.format(v as number);
    if (row.format === "num") return nf.format(v as number);
    if (row.format === "policy") return t(("testPolicies." + v) as never);
    if (row.format === "bool") return v ? t("schools.school.yes") : t("schools.school.no");
    return String(v);
  };
  const label = (key: string) => (key === "satRange" ? "SAT 25th–75th" : key === "actRange" ? "ACT 25th–75th" : t(("cdsFields." + key) as never));

  return (
    <div className="container-page py-10">
      <Link href="/schools" className="text-sm">← {t("schools.title")}</Link>
      <h1 className="mt-2 text-3xl font-semibold">{t("schools.compareTitle")}</h1>
      {schools.length === 0 ? (
        <p className="notice mt-6">{t("schools.compareEmpty")}</p>
      ) : (
        <div className="card mt-6 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <caption className="sr-only">{t("schools.compareTitle")}</caption>
            <thead className="border-b border-line bg-paper-2">
              <tr>
                <th scope="col" className="px-4 py-3">CDS</th>
                {schools.map((e) => (
                  <th key={e.school.id} scope="col" className="px-4 py-3">
                    <Link href={"/schools/" + e.school.slug}>{zh && e.school.nameZh ? e.school.nameZh : e.school.name}</Link>
                    <span className="block text-xs font-normal text-ink-faint">{e.latest ? t("schools.dataYear", { year: e.latest.academicYear }) : t("schools.noData")}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {ROWS.map((row) => (
                <tr key={row.key}>
                  <th scope="row" className="px-4 py-2 font-normal text-ink-soft">
                    {label(row.key)} <span className="ml-1 font-mono text-[0.7rem] text-ink-faint">{row.item}</span>
                  </th>
                  {schools.map((e) => {
                    const value = cell(e, row);
                    return (
                      <td key={e.school.id} className={value ? "px-4 py-2 font-semibold" : "px-4 py-2 text-ink-faint"}>
                        {value ?? t("schools.notReported")}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-6 text-sm text-ink-soft">{t("journey.disclaimer")}</p>
    </div>
  );
}
