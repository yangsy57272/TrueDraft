import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { cdsDataset } from "@/db/schema";
import { getT } from "@/i18n/server";
import { requireAdminPage } from "@/server/admin";
import { adminGetSchool } from "@/server/services/schools";
import { isUuid, orNotFound } from "@/server/page-data";
import { DatasetEditor } from "@/components/cds/DatasetEditor";

export const metadata = { title: "Admin · CDS dataset", robots: { index: false } };

export default async function AdminDatasetPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ school?: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const { school: schoolParam } = await searchParams;
  const { t } = await getT();
  let schoolId: string;
  let initial = { academicYear: "", sourceUrl: "", data: {} as Record<string, unknown>, verificationStatus: "draft" as "draft" | "verified", published: false, notes: "" };
  if (id === "new") {
    if (!schoolParam || !isUuid(schoolParam)) notFound();
    schoolId = schoolParam;
  } else {
    if (!isUuid(id)) notFound();
    const [row] = await db.select().from(cdsDataset).where(eq(cdsDataset.id, id)).limit(1);
    if (!row) notFound();
    schoolId = row.schoolId;
    initial = {
      academicYear: row.academicYear,
      sourceUrl: row.sourceUrl,
      data: row.data,
      verificationStatus: row.verificationStatus === "verified" ? "verified" : "draft",
      published: row.published,
      notes: row.notes ?? "",
    };
  }
  const { school: s } = await orNotFound(adminGetSchool(schoolId));
  return (
    <div className="container-page py-10">
      <Link href={`/admin/schools/${s.id}`} className="text-sm">← {s.name}</Link>
      <h1 className="mt-2 text-3xl font-semibold">{id === "new" ? t("adminSchools.newDataset") : t("adminSchools.editDataset")}</h1>
      <p className="notice notice-info mt-4 text-sm">{t("adminSchools.intro")}</p>
      <div className="mt-6">
        <DatasetEditor schoolId={s.id} datasetId={id === "new" ? null : id} initial={initial} />
      </div>
    </div>
  );
}
