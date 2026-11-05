import Link from "next/link";
import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { requirePageUser } from "@/server/session";
import { getProfile } from "@/server/services/profile";
import { listEntries } from "@/server/services/college-list";
import { listEssays } from "@/server/services/essays";
import { DeferStep } from "@/components/journey/DeferStep";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("journey.title"), robots: { index: false } };
}

type Status = "not_started" | "started" | "deferred" | "learn";

const STATUS_STYLE: Record<Status, { cls: string; icon: string; key: string }> = {
  not_started: { cls: "badge-neutral", icon: "○", key: "journey.statusNotStarted" },
  started: { cls: "badge-developing", icon: "◐", key: "journey.statusStarted" },
  deferred: { cls: "badge-neutral", icon: "↷", key: "journey.statusDeferred" },
  learn: { cls: "badge-neutral", icon: "◇", key: "journey.statusLearn" },
};

const SUBMITTED = ["submitted", "admitted", "waitlisted", "deferred", "denied", "withdrawn"];

export default async function JourneyPage() {
  const user = await requirePageUser();
  const { t } = await getT();
  const [profile, list, essays] = await Promise.all([getProfile(user.id), listEntries(user.id), listEssays(user.id)]);

  // Statuses only say whether a step has been started. Facts say what exists, without claiming
  // a step is "done" — an essay with a saved version, or a list with labels, isn't finished.
  const majorsDeferred = profile.deferredSteps.includes("majors");
  const directory = list.filter((e) => e.schoolId).length;
  const labelled = list.filter((e) => e.category !== "unsure" && e.round !== "undecided").length;
  const allDeadlines = list.flatMap((e) => e.deadlines);
  const versioned = essays.filter((e) => e.versionCount > 0).length;
  const hasProfile = profile.courses.length + profile.activities.length + profile.honors.length > 0 || Boolean(profile.interests.trim());
  const statuses: Record<string, Status> = {
    profile: hasProfile ? "started" : "not_started",
    majors: profile.intendedMajors.length ? "started" : majorsDeferred ? "deferred" : "not_started",
    cds: "learn",
    schools: directory ? "started" : "not_started",
    list: list.length ? "started" : "not_started",
    essays: essays.length ? "started" : "not_started",
    track: allDeadlines.length || list.some((e) => SUBMITTED.includes(e.status)) ? "started" : "not_started",
  };
  const facts: Record<string, string | null> = {
    profile: hasProfile
      ? t("journey.facts.profile", { courses: profile.courses.length, activities: profile.activities.length, honors: profile.honors.length }) +
        (profile.interests.trim() ? ` · ${t("journey.facts.interests")}` : "")
      : null,
    majors: profile.intendedMajors.length ? t("journey.facts.majors", { count: profile.intendedMajors.length }) : majorsDeferred ? t("journey.facts.majorsLater") : null,
    cds: null,
    schools: directory ? t("journey.facts.schools", { count: directory }) : null,
    list: list.length ? t("journey.facts.list", { labelled, total: list.length }) : null,
    essays: essays.length ? t("journey.facts.essays", { count: essays.length, versioned }) : null,
    track: list.length
      ? t("journey.facts.track", { deadlines: allDeadlines.length, done: allDeadlines.filter((d) => d.done).length, submitted: list.filter((e) => SUBMITTED.includes(e.status)).length, total: list.length })
      : null,
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
  const next = steps.find((s) => statuses[s.key] === "not_started");

  return (
    <div className="container-prose max-w-4xl py-10">
      <h1 className="text-3xl font-semibold">{t("journey.title")}</h1>
      <p className="mt-2 text-ink-soft">{t("journey.intro")}</p>

      {next ? (
        <div className="card mt-6 border-teal/30 bg-teal-soft/50 p-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-dark">{t("journey.nextSuggestion")}</p>
          <p className="mt-1 font-serif text-xl font-semibold">{t(`journey.steps.${next.key}.title` as never)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href={next.href} className="btn btn-primary btn-sm">{t("journey.open")}</Link>
            {next.key === "majors" ? <DeferStep step="majors" deferred={false} /> : null}
          </div>
        </div>
      ) : (
        <p className="notice notice-info mt-6">{t("journey.allStarted")}</p>
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
                {facts[s.key] ? <p className="mt-1 text-sm font-medium">{facts[s.key]}</p> : null}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <span className={`badge ${st.cls}`}>
                  <span aria-hidden="true">{st.icon}</span>
                  {t(st.key as never)}
                </span>
                {s.key === "majors" && !profile.intendedMajors.length ? <DeferStep step="majors" deferred={majorsDeferred} /> : null}
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
