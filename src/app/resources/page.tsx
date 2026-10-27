import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { listPublishedResources } from "@/server/services/resources";
import { ResourceList } from "@/components/ResourceList";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("resources.title") };
}

export default async function ResourcesPage() {
  const { t, locale } = await getT();
  const resources = await listPublishedResources(null, locale);
  return (
    <div className="container-page py-12">
      <h1 className="text-4xl font-semibold">{t("resources.title")}</h1>
      <p className="mt-4 max-w-2xl text-lg text-ink-soft">{t("resources.intro")}</p>
      <ResourceList resources={resources} t={t} basePath="/resources" />
    </div>
  );
}
