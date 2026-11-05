import Link from "next/link";
import { getT } from "@/i18n/server";
import { requireAdminPage } from "@/server/admin";
import { getAggregateMetrics } from "@/server/services/account";
import { aiLimitSettings, usageToday } from "@/server/ai/limits";

export const metadata = { title: "Admin", robots: { index: false } };

export default async function AdminPage() {
  await requireAdminPage();
  const { t } = await getT();
  const [m, today] = await Promise.all([getAggregateMetrics(), usageToday()]);
  const limits = aiLimitSettings();
  const usd = (micro: number) => "$" + (micro / 1_000_000).toFixed(2);
  const items = [
    [t("admin.metrics.users"), m.users],
    [t("admin.metrics.essays"), m.essays],
    [t("admin.metrics.versions"), m.versions],
    [t("admin.metrics.completed"), m.feedback_completed],
    [t("admin.metrics.failed"), m.feedback_failed],
  ] as const;
  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-semibold">{t("admin.title")}</h1>
      <p className="notice notice-info mt-4">{t("admin.note")}</p>
      <dl className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {items.map(([label, value]) => (
          <div key={label} className="card p-4">
            <dt className="text-sm text-ink-soft">{label}</dt>
            <dd className="mt-1 font-serif text-3xl font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      <section className="card mt-6 p-5" aria-labelledby="ai-usage">
        <h2 id="ai-usage" className="text-lg font-semibold">{t("admin.usage.title")}</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="text-ink-soft">{t("admin.usage.runs")}</dt><dd className="font-semibold">{today.runs}</dd></div>
          <div><dt className="text-ink-soft">{t("admin.usage.tokens")}</dt><dd className="font-semibold">{today.tokens.toLocaleString()}{limits.dailyTokenBudget != null ? " / " + limits.dailyTokenBudget.toLocaleString() : ""}</dd></div>
          <div><dt className="text-ink-soft">{t("admin.usage.cost")}</dt><dd className="font-semibold">{limits.priceInputPerMTokUsd != null && limits.priceOutputPerMTokUsd != null ? usd(today.costMicroUsd) : t("admin.usage.noPrices")}{limits.dailyBudgetUsd != null ? " / " + usd(limits.dailyBudgetUsd * 1_000_000) : ""}</dd></div>
          <div><dt className="text-ink-soft">{t("admin.usage.concurrency")}</dt><dd className="font-semibold">{limits.maxConcurrentPerUser}</dd></div>
        </dl>
        <p className="mt-3 text-xs text-ink-soft">{t("admin.usage.note")}</p>
      </section>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/admin/resources" className="btn btn-primary">{t("admin.resources")}</Link>
        <Link href="/admin/schools" className="btn btn-primary">{t("adminSchools.title")}</Link>
      </div>
    </div>
  );
}
