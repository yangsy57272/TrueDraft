import Link from "next/link";
import { notFound } from "next/navigation";
import { getT } from "@/i18n/server";
import { getCurrentUser } from "@/server/session";
import { getPublishedResource } from "@/server/services/resources";
import { Markdown } from "@/components/Markdown";

export default async function ResourcePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { t } = await getT();
  const user = await getCurrentUser();
  const resource = await getPublishedResource(user ? { email: user.email } : null, slug);
  if (!resource || resource.contentType !== "article") notFound();
  return (
    <article className="container-prose py-12" lang={resource.language === "zh-CN" ? "zh-Hans" : "en"}>
      <Link href={user ? "/library" : "/resources"} className="text-sm">← {t("resources.back")}</Link>
      <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-teal">{t(`resources.categories.${resource.category}` as never)}</p>
      <h1 className="mt-2 text-4xl font-semibold">{resource.title}</h1>
      <p className="mt-3 text-lg text-ink-soft">{resource.summary}</p>
      <p className="mt-2 text-sm text-ink-faint">
        {t("resources.author")}: {resource.author} · {t("resources.source")}: {resource.source}
      </p>
      <div className="mt-8 text-[1.05rem]">
        <Markdown>{resource.contentOrUrl}</Markdown>
      </div>
    </article>
  );
}
