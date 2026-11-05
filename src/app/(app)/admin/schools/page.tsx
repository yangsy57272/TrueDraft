import Link from "next/link";
import { getT } from "@/i18n/server";
import { requireAdminPage } from "@/server/admin";
import { adminListSchools } from "@/server/services/schools";
import { CsvImport, EMPTY_SCHOOL, SchoolForm } from "@/components/cds/AdminSchoolForms";

export const metadata = { title: "Admin · Schools", robots: { index: false } };

export default async function AdminSchoolsPage() {
  await requireAdminPage();
  const { t } = await getT();
  const rows = await adminListSchools();
  return (
    <div className="container-page py-10">
      <Link href="/admin" className="text-sm">← {t("admin.title")}</Link>
      <h1 className="mt-2 text-3xl font-semibold">{t("adminSchools.title")}</h1>
      <p className="notice notice-info mt-4 text-sm">{t("adminSchools.intro")}</p>
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="border-b border-line bg-paper-2">
            <tr>
              <th scope="col" className="px-4 py-3">{t("adminSchools.fields.name")}</th>
              <th scope="col" className="px-4 py-3">{t("adminSchools.fields.state")}</th>
              <th scope="col" className="px-4 py-3">{t("adminSchools.datasets")}</th>
              <th scope="col" className="px-4 py-3">{t("adminSchools.fields.published")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.school.id}>
                <td className="px-4 py-2"><Link href={`/admin/schools/${r.school.id}`}>{r.school.name}</Link></td>
                <td className="px-4 py-2">{r.school.state}</td>
                <td className="px-4 py-2">{t("adminSchools.count", { published: r.published, total: r.datasets })}</td>
                <td className="px-4 py-2">{r.school.published ? t("common.yes") : t("common.no")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="text-xl font-semibold">{t("adminSchools.newSchool")}</h2>
          <div className="mt-3"><SchoolForm id={null} initial={EMPTY_SCHOOL} /></div>
        </section>
        <CsvImport />
      </div>
    </div>
  );
}
