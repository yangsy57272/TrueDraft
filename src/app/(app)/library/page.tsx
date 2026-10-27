import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { requirePageUser } from "@/server/session";
import { listPublishedResources } from "@/server/services/resources";
import { ResourceList } from "@/components/ResourceList";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("resources.libraryTitle") };
}

export default async function LibraryPage() {
  const user = await requirePageUser();
  const { t } = await getT();
  const resources = await listPublishedResources({ email: user.email });
  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-semibold">{t("resources.libraryTitle")}</h1>
      <p className="mt-2 text-ink-soft">{t("resources.libraryIntro")}</p>
      <ResourceList resources={resources} t={t} basePath="/resources" />
    </div>
  );
}
