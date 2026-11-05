import Link from "next/link";
import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { requirePageUser } from "@/server/session";
import { getProfile } from "@/server/services/profile";
import { listEntries } from "@/server/services/college-list";
import { listEssays } from "@/server/services/essays";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("journey.title"), robots: { index: false } };
}

type Status = "not_started" | "in_progress" | "done" | "learn";

const STATUS_STYLE: Record<Status, { cls: string; icon: string; key: string }> = {
  not_started: { cls: "badge-neutral", icon: "○", key: "journey.statusNotStarted" },
  in_progress: { cls: "badge-developing", icon: "◐", key: "journey.statusInProgress" },
  done: { cls: "badge-strong", icon: "●", key: "journey.statusDone" },
  learn: { cls: "badge-neutral", icon: "◇", key: "journey.statusLearn" },
};

export default async function JourneyPage() {
  const user = await requirePageUser();
  const { t } = await getT();
  const [profile, list, essays] = await Promise.all([getProfile(user.id), listEntries(user.id), listEssays(user.id)]);

  const profileItems = profile.courses.length + profile.activities.length + profile.honors.length;
  const statuses: Record<string, Status> = {
    profile: profileItems === 0 && !profile.interests.trim() ? "not_started" : profile.courses.length && profile.activities.length && profile.interests.trim() ? "done" : "in_progress",
    majors: profile.intendedMajors.length ? "done" : "not_started",
    cds: "learn",
    schools: list.some((e) => e.schoolId) ? "done" : "not_started",
    list: list.length === 0 ? "not_started" : list.every((e) => e.category !== "unsure" && e.round !== "undecided") ? "done" : "in_progress",
    essays: essays.length === 0 ? "not_started" : essays.some((e) => e.versionCount > 0) ? "done" : "in_progress",
    track: list.length === 0 ? "not_started" : list.some((e) => e.deadlines.length > 0) ? (list.every((e) => ["submitted", "admitted", "waitlisted", "deferred", "denied", "withdrawn"].includes(e.status)) ? "done" : "in_progress") : "not_started",
  };
  const steps = [
    { key: "profile", href: "/profile" },
    { key: "majors", href: "/majors" },
    { key: "cds", href: "/cds" },
    { key: "schools", href: "/schools" },
    { key: "list", href: "/my-list" },
    { key: "essays", href: "/dashboard" },
    { key: "track", href: "/my-list" },
  ] as const;
  const next = steps.find((s) => statuses[s.key] === "not_started" || statuses[s.key] === "in_progress");

  return (
    <div className="container-prose max-w-4xl py-10">
      <h1 className="text-3xl font-semibold">{t("journey.title")}</h1>
      <p className="mt-2 text-ink-soft">{t("journey.intro")}</p>

      {next ? (
        <div className="card mt-6 border-teal/30 bg-teal-soft/50 p-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-dark">{t("journey.nextSuggestion")}</p>
          <p className="mt-1 font-serif text-xl font-semibold">{t(`journey.steps.${next.key}.title` as never)}</p>
          <Link href={next.href} className="btn btn-primary btn-sm mt-3">{t("journey.open")}</Link>
        </div>
      ) : (
        <p className="notice notice-info mt-6">{t("journey.allDone")}</p>
      )}

      <ol className="mt-8 space-y-3">
        {steps.map((s, i) => {
          const st = STATUS_STYLE[statuses[s.key]];
          return (
            <li key={s.key} className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-paper-2 font-serif text-lg font-semibold text-teal" aria-hidden="true">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold">
                  <span className="sr-only">{i + 1}. </span>
                  {t(`journey.steps.${s.key}.title` as never)}
                </h2>
                <p className="mt-1 text-sm text-ink-soft">{t(`journey.steps.${s.key}.body` as never)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className={`badge ${st.cls}`}>
                  <span aria-hidden="true">{st.icon}</span>
                  {t(st.key as never)}
                </span>
                <Link href={s.href} className="btn btn-secondary btn-sm" aria-label={`${t("journey.open")}: ${t(`journey.steps.${s.key}.title` as never)}`}>
                  {t("journey.open")}
                </Link>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-8 text-sm text-ink-soft">{t("journey.disclaimer")}</p>
    </div>
  );
}
