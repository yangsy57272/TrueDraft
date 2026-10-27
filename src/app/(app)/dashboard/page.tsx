import Link from "next/link";
import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { formatDate } from "@/i18n/translate";
import { requirePageUser } from "@/server/session";
import { listEssays } from "@/server/services/essays";
import { purgeExpiredEssays } from "@/server/services/account";
import { EssayActions } from "./EssayActions";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("dashboard.title") };
}

export default async function DashboardPage() {
  const user = await requirePageUser();
  const { t, messages, locale } = await getT();
  await purgeExpiredEssays({ userId: user.id });
  const essays = await listEssays(user.id);

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-ink-soft">{t("dashboard.greeting")}{user.displayName ? `, ${user.displayName}` : ""}</p>
          <h1 className="text-3xl font-semibold">{t("dashboard.title")}</h1>
        </div>
        {essays.length ? (
          <Link href="/essays/new" className="btn btn-accent">+ {t("dashboard.newEssay")}</Link>
        ) : null}
      </div>

      {essays.length === 0 ? (
        <div className="mt-8 grid gap-6 md:grid-cols-[1.4fr_1fr]">
          <div className="card paper-lines p-8">
            <h2 className="text-2xl font-semibold">{t("dashboard.emptyTitle")}</h2>
            <p className="mt-3 text-ink-soft">{t("dashboard.emptyBody")}</p>
            <Link href="/essays/new" className="btn btn-accent mt-6">{t("dashboard.emptyCta")}</Link>
          </div>
          <div className="card p-6">
            <h2 className="text-lg font-semibold">{t("dashboard.emptyTipsTitle")}</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-ink-soft">
              {messages.dashboard.emptyTips.map((tip, i) => <li key={i}>{tip}</li>)}
            </ul>
          </div>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {essays.map((e) => {
            const pct = e.wordLimit ? Math.min(100, Math.round((e.draftWordCount / e.wordLimit) * 100)) : null;
            const over = e.wordLimit ? e.draftWordCount > e.wordLimit : false;
            return (
              <li key={e.id} className="card flex flex-col p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold">
                      <Link href={`/essays/${e.id}`} className="text-ink">{e.title}</Link>
                    </h2>
                    <p className="text-sm text-ink-soft">
                      {t(`appType.${e.applicationType}` as never)}
                      {e.targetSchool ? ` · ${e.targetSchool}` : ""}
                    </p>
                  </div>
                  <span className="badge badge-neutral">{t(`status.${e.status}` as never)}</span>
                </div>
                <div className="mt-4">
                  <p className="text-sm">
                    {e.wordLimit ? t("common.wordsOfLimit", { count: e.draftWordCount, limit: e.wordLimit }) : `${t("common.wordsShort", { count: e.draftWordCount })} · ${t("dashboard.noLimit")}`}
                  </p>
                  {pct !== null ? (
                    <div
                      className="mt-2 h-2 overflow-hidden rounded-full bg-paper-2"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={e.wordLimit!}
                      aria-valuenow={e.draftWordCount}
                      aria-label={t("common.wordsOfLimit", { count: e.draftWordCount, limit: e.wordLimit! })}
                    >
                      <div className={`h-full ${over ? "bg-amber" : "bg-sage"}`} style={{ width: `${pct}%` }} />
                    </div>
                  ) : null}
                </div>
                <p className="mt-3 text-xs text-ink-faint">
                  {t("common.lastEdited", { date: formatDate(e.updatedAt, locale, true) })} ·{" "}
                  {e.versionCount === 0 ? t("dashboard.noVersions") : e.versionCount === 1 ? t("dashboard.oneVersion") : t("dashboard.versions", { count: e.versionCount })}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/essays/${e.id}`} className="btn btn-primary btn-sm">{t("dashboard.continue")}</Link>
                  {e.latestFeedbackId ? (
                    <Link href={`/essays/${e.id}/feedback/${e.latestFeedbackId}`} className="btn btn-secondary btn-sm">{t("dashboard.viewFeedback")}</Link>
                  ) : null}
                  <EssayActions essayId={e.id} title={e.title} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-10 text-sm text-ink-soft">{t("disclaimer.policies")}</p>
    </div>
  );
}
