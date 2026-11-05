import Link from "next/link";
import { notFound } from "next/navigation";
import { getT } from "@/i18n/server";
import { formatDate } from "@/i18n/translate";
import { requireAdminPage } from "@/server/admin";
import { adminGetSchool } from "@/server/services/schools";
import { isUuid, orNotFound } from "@/server/page-data";
import { DeleteDatasetButton, SchoolForm } from "@/components/cds/AdminSchoolForms";

export const metadata = { title: "Admin · School", robots: { index: false } };

export default async function AdminSchoolPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { t, locale } = await getT();
  const { school: s, datasets } = await orNotFound(adminGetSchool(id));
  return (
    <div className="container-page py-10">
      <Link href="/admin/schools" className="text-sm">← {t("adminSchools.title")}</Link>
      <h1 className="mt-2 text-3xl font-semibold">{s.name}</h1>
      {s.cdsPageUrl ? (
        <a href={s.cdsPageUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm">{t("schools.officialCds")} ↗</a>
      ) : null}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="text-xl font-semibold">{t("adminSchools.editSchool")}</h2>
          <div className="mt-3">
            <SchoolForm
              id={s.id}
              initial={{
                slug: s.slug,
                name: s.name,
                nameZh: s.nameZh ?? "",
                city: s.city ?? "",
                state: s.state ?? "",
                control: (s.control as "public" | "private" | null) ?? "",
                website: s.website ?? "",
                cdsPageUrl: s.cdsPageUrl ?? "",
                latestCdsYearListed: s.latestCdsYearListed ?? "",
                published: s.published,
              }}
            />
          </div>
        </section>
        <section>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">{t("adminSchools.datasets")}</h2>
            <Link href={`/admin/cds/new?school=${s.id}`} className="btn btn-primary btn-sm">+ {t("adminSchools.newDataset")}</Link>
          </div>
          {datasets.length === 0 ? <p className="notice mt-3 text-sm">{t("adminSchools.noDatasets")}</p> : null}
          <ul className="mt-3 space-y-2">
            {datasets.map((d) => (
              <li key={d.id} className="card flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                <div>
                  <p className="font-semibold">{d.academicYear}</p>
                  <p className="text-ink-soft">
                    {d.verificationStatus === "verified" ? t("adminSchools.statusVerified") : t("adminSchools.statusDraft")}
                    {d.published ? ` · ${t("adminSchools.publishDataset")}` : ""}
                    {d.verifiedAt ? ` · ${formatDate(d.verifiedAt, locale)}` : ""}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Link href={`/admin/cds/${d.id}`} className="btn btn-secondary btn-sm">{t("common.edit")}</Link>
                  <DeleteDatasetButton datasetId={d.id} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
