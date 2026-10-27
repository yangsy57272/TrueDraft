import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { diffWordsWithSpace } from "diff";
import { getT } from "@/i18n/server";
import { formatDate } from "@/i18n/translate";
import { countWords } from "@/lib/wordcount";
import { requirePageUser } from "@/server/session";
import { getEssay, getVersion, listVersions } from "@/server/services/essays";
import { isUuid, orNotFound } from "@/server/page-data";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("compare.title"), robots: { index: false } };
}

export default async function ComparePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const user = await requirePageUser();
  const { t, locale } = await getT();
  const essay = await orNotFound(getEssay(user.id, id));
  const versions = await listVersions(user.id, id);
  const sp = await searchParams;

  if (versions.length < 2) {
    return (
      <div className="container-prose py-10">
        <Link href={`/essays/${id}`} className="text-sm">← {t("feedback.backToEditor")}</Link>
        <h1 className="mt-2 text-3xl font-semibold">{t("compare.title")}</h1>
        <p className="notice mt-6">{t("compare.needTwo")}</p>
      </div>
    );
  }

  const numbers = versions.map((v) => v.versionNumber);
  const parse = (value: string | undefined, fallback: number) => {
    const n = Number(value);
    return Number.isInteger(n) && numbers.includes(n) ? n : fallback;
  };
  const fromN = parse(sp.from, versions[1].versionNumber);
  const toN = parse(sp.to, versions[0].versionNumber);
  const same = fromN === toN;

  const [from, to] = same ? [null, null] : await Promise.all([getVersion(user.id, id, fromN), getVersion(user.id, id, toN)]);
  const changes = from && to ? diffWordsWithSpace(from.content, to.content) : [];
  const added = changes.filter((c) => c.added).reduce((n, c) => n + countWords(c.value), 0);
  const removed = changes.filter((c) => c.removed).reduce((n, c) => n + countWords(c.value), 0);

  const option = (v: (typeof versions)[number]) => (
    <option key={v.id} value={v.versionNumber}>
      {t("common.version", { n: v.versionNumber })} — {formatDate(v.createdAt, locale, true)}
      {v.versionNote ? ` — ${v.versionNote.slice(0, 40)}` : ""}
    </option>
  );

  return (
    <div className="container-page py-8">
      <Link href={`/essays/${id}`} className="text-sm">← {t("feedback.backToEditor")}</Link>
      <h1 className="mt-2 text-3xl font-semibold">{t("compare.title")}</h1>
      <p className="mt-1 text-ink-soft">{essay.title}</p>

      <form method="get" className="card mt-6 grid gap-4 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="from" className="field-label">{t("compare.from")}</label>
          <select id="from" name="from" defaultValue={fromN} className="input">{versions.map(option)}</select>
        </div>
        <div>
          <label htmlFor="to" className="field-label">{t("compare.to")}</label>
          <select id="to" name="to" defaultValue={toN} className="input">{versions.map(option)}</select>
        </div>
        <button type="submit" className="btn btn-primary">{t("compare.showChanges")}</button>
      </form>

      {same ? (
        <p className="notice mt-6">{t("compare.sameVersion")}</p>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <span className="badge badge-neutral">{t("compare.summary", { added, removed })}</span>
            <span className="badge badge-neutral">{t("compare.wordDelta", { from: from!.wordCount, to: to!.wordCount })}</span>
          </div>
          <p className="mt-3 text-sm text-ink-soft">{t("compare.legend")}</p>
          <div className="card mt-4 whitespace-pre-wrap p-5 font-serif text-[1.05rem] leading-relaxed" aria-label={t("compare.title")}>
            {changes.map((c, i) =>
              c.added ? (
                <ins key={i} className="diff-ins">
                  <span className="sr-only">[{t("compare.added")}: </span>
                  {c.value}
                  <span className="sr-only">]</span>
                </ins>
              ) : c.removed ? (
                <del key={i} className="diff-del">
                  <span className="sr-only">[{t("compare.removed")}: </span>
                  {c.value}
                  <span className="sr-only">]</span>
                </del>
              ) : (
                <span key={i}>{c.value}</span>
              ),
            )}
          </div>
        </>
      )}
    </div>
  );
}
