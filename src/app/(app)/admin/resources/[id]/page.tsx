import { notFound } from "next/navigation";
import { getT } from "@/i18n/server";
import { requireAdminPage } from "@/server/admin";
import { adminGetResource } from "@/server/services/resources";
import { isUuid, orNotFound } from "@/server/page-data";
import { ResourceForm } from "./ResourceForm";

export const metadata = { title: "Admin · Resource", robots: { index: false } };

export default async function AdminResourcePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const { t } = await getT();
  if (id !== "new" && !isUuid(id)) notFound();
  const row = id === "new" ? null : await orNotFound(adminGetResource(id));
  return (
    <div className="container-prose py-10">
      <h1 className="text-3xl font-semibold">{row ? t("admin.editResource") : t("admin.newResource")}</h1>
      <ResourceForm
        id={row?.id ?? null}
        initial={
          row
            ? {
                slug: row.slug,
                title: row.title,
                summary: row.summary,
                contentOrUrl: row.contentOrUrl,
                contentType: row.contentType as "article" | "external_link",
                language: row.language as "en",
                category: row.category as "craft",
                source: row.source,
                author: row.author,
                licenseStatus: row.licenseStatus as "original",
                permissionNotes: row.permissionNotes ?? "",
                collection: row.collection as "original",
                access: row.access as "public",
                retrievalAllowed: row.retrievalAllowed,
                published: row.published,
              }
            : null
        }
      />
    </div>
  );
}
