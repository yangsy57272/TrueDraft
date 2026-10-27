import Link from "next/link";
import { getT } from "@/i18n/server";
import { requireAdminPage } from "@/server/admin";
import { getAggregateMetrics } from "@/server/services/account";

export const metadata = { title: "Admin", robots: { index: false } };

export default async function AdminPage() {
  await requireAdminPage();
  const { t } = await getT();
  const m = await getAggregateMetrics();
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
      <Link href="/admin/resources" className="btn btn-primary mt-8">{t("admin.resources")}</Link>
    </div>
  );
}
