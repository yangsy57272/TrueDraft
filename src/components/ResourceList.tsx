import Link from "next/link";
import type { Resource } from "@/db/schema";
import type { Translator } from "@/i18n/translate";

export function ResourceList({ resources, t, basePath }: { resources: Resource[]; t: Translator; basePath: string }) {
  if (!resources.length) return <p className="notice mt-8">{t("resources.empty")}</p>;
  return (
    <ul className="mt-8 grid gap-4 md:grid-cols-2">
      {resources.map((r) => (
        <li key={r.id} className="card flex flex-col p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal">{t(`resources.categories.${r.category}` as never)}</p>
          <h2 className="mt-2 text-lg font-semibold">
            {r.contentType === "external_link" ? (
              <a href={r.contentOrUrl} target="_blank" rel="noopener noreferrer" className="text-ink">
                {r.title} <span className="sr-only">{t("resources.opensNewTab")}</span>
                <span aria-hidden="true">↗</span>
              </a>
            ) : (
              <Link href={`${basePath}/${r.slug}`} className="text-ink">{r.title}</Link>
            )}
          </h2>
          <p className="mt-2 flex-1 text-sm text-ink-soft">{r.summary}</p>
          <p className="mt-3 text-xs text-ink-faint">
            {r.contentType === "external_link" ? `${t("resources.external")} · ` : ""}
            {t("resources.source")}: {r.source}
          </p>
        </li>
      ))}
    </ul>
  );
}
