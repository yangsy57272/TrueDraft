import Link from "next/link";
import type { Translator } from "@/i18n/translate";
import { formatDate } from "@/i18n/translate";
import type { SchoolSupplements } from "@/db/schema";
import type { Locale } from "@/i18n/config";

/** This cycle's supplemental essay prompts for a school, each with a "Start this essay" link. */
export function SupplementsSection({
  supplements,
  slug,
  signedIn,
  t,
  locale,
}: {
  supplements: SchoolSupplements | null;
  slug: string;
  signedIn: boolean;
  t: Translator;
  locale: Locale;
}) {
  const cycle = supplements?.cycle.replace("-", "–") ?? "";
  return (
    <section id="supplements" className="card mt-6 scroll-mt-24 p-5" aria-labelledby="supp-h">
      <h2 id="supp-h" className="text-xl font-semibold">{t("supplements.title", { cycle: cycle || "2026–2027" })}</h2>
      {!supplements ? (
        <p className="mt-2 text-sm text-ink-soft">{t("supplements.notImported")}</p>
      ) : supplements.status !== "confirmed" ? (
        <p className="mt-2 text-sm">{t(`supplements.status.${supplements.status}` as never)}</p>
      ) : (
        <ol className="mt-3 space-y-3">
          {supplements.prompts.map((p) => (
            <li key={p.order} className="rounded-xl border border-line p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full px-2 py-0.5 font-semibold text-white" style={{ background: "#be185d" }}>#{p.order}</span>
                {p.requirement ? <span className="badge badge-neutral">{p.requirement}</span> : null}
                {p.limitText ? <span className="badge badge-strong">{p.limitText}</span> : null}
                {p.notes ? <span className="text-ink-soft">{p.notes}</span> : null}
              </div>
              <p className="mt-2 whitespace-pre-line text-sm">{p.prompt}</p>
              {signedIn ? (
                <Link href={`/essays/new?supp=${encodeURIComponent(slug)}&n=${p.order}`} className="btn btn-secondary btn-sm mt-3">
                  ✎ {t("supplements.start")}
                </Link>
              ) : null}
            </li>
          ))}
        </ol>
      )}
      {supplements ? (
        <p className="mt-4 text-xs text-ink-soft">
          {t("supplements.source", { date: supplements.listUpdated ? formatDate(new Date(`${supplements.listUpdated}T12:00:00Z`), locale) : "—" })}{" "}
          {supplements.sourceUrl ? (
            <a href={supplements.sourceUrl} target="_blank" rel="noopener noreferrer">
              {t("supplements.officialPage")} <span className="sr-only">{t("schools.opensNewTab")}</span>↗
            </a>
          ) : null}
        </p>
      ) : null}
      {supplements?.guideUrl ? (
        <p className="mt-1 text-xs text-ink-soft">
          <a href={supplements.guideUrl} target="_blank" rel="noopener noreferrer">
            {t("supplements.externalGuide")} <span className="sr-only">{t("schools.opensNewTab")}</span>↗
          </a>{" "}
          {t("supplements.externalNote")}
        </p>
      ) : null}
      <p className="mt-3 text-sm">
        <Link href="/guides/personal-statement">{t("supplements.psGuide")} →</Link>
      </p>
    </section>
  );
}
