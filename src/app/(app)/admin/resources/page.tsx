import Link from "next/link";
import { getT } from "@/i18n/server";
import { formatDate } from "@/i18n/translate";
import { requireAdminPage } from "@/server/admin";
import { adminListResources } from "@/server/services/resources";

export const metadata = { title: "Admin · Resources", robots: { index: false } };

export default async function AdminResourcesPage() {
  await requireAdminPage();
  const { t, locale } = await getT();
  const rows = await adminListResources();
  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">{t("admin.resources")}</h1>
        <Link href="/admin/resources/new" className="btn btn-primary">+ {t("admin.newResource")}</Link>
      </div>
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead className="border-b border-line bg-paper-2">
            <tr>
              {(["title", "collection", "license", "access", "retrieval", "published", "updated"] as const).map((k) => (
                <th key={k} scope="col" className="px-4 py-3 font-semibold">{t(`admin.table.${k}`)}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3"><Link href={`/admin/resources/${r.id}`}>{r.title}</Link></td>
                <td className="px-4 py-3">{r.collection}</td>
                <td className="px-4 py-3">{r.licenseStatus}</td>
                <td className="px-4 py-3">{r.access}</td>
                <td className="px-4 py-3">{r.retrievalAllowed ? t("common.yes") : t("common.no")}</td>
                <td className="px-4 py-3">{r.published ? t("common.yes") : t("common.no")}</td>
                <td className="px-4 py-3">{formatDate(r.updatedAt, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
