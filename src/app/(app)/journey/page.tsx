import Link from "next/link";
import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { requirePageUser } from "@/server/session";
import { getProfile } from "@/server/services/profile";
import { listEntries } from "@/server/services/college-list";
import { listEssays } from "@/server/services/essays";
import { DeferStep } from "@/components/journey/DeferStep";
import { JOURNEY_STEPS } from "@/lib/journey-steps";

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
  const steps = JOURNEY_STEPS;
  const next = steps.find((s) => statuses[s.key] === "not_started");

  const startedCount = steps.filter((s) => statuses[s.key] === "started").length;
  const nextStep = next ? steps.findIndex((s) => s.key === next.key) : -1;

  return (
    <div className="container-prose max-w-4xl py-10">
      <h1 className="text-3xl font-semibold">{t("journey.title")}</h1>
      <p className="mt-2 text-ink-soft">{t("journey.intro")}</p>

      {/* Progress: one coloured segment per step, filled once started. */}
      <div className="mt-6">
        <p className="text-sm font-semibold text-ink-soft">{t("journey.progress", { started: startedCount, total: steps.length })}</p>
        <div className="mt-2 flex gap-1" aria-hidden="true">
          {steps.map((s) => (
            <span key={s.key} className="h-2.5 flex-1 rounded-full" style={{ background: statuses[s.key] === "started" ? s.color : "#e5e7eb" }} />
          ))}
        </div>
      </div>

      {next ? (
        <div className="mt-6 overflow-hidden rounded-[var(--radius-card)] text-white shadow-md" style={{ background: `linear-gradient(120deg, ${next.color}, ${next.color}cc)` }}>
          <div className="p-5 sm:p-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-white/85">
              {t("journey.youAreHere")} · {t("journey.stepLabel", { n: nextStep + 1 })}
            </p>
            <p className="mt-1 font-serif text-2xl font-semibold">{t(`journey.steps.${next.key}.title` as never)}</p>
            <p className="mt-1 max-w-2xl text-white/90">{t(`journey.steps.${next.key}.body` as never)}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={next.href} className="btn btn-sm bg-white no-underline" style={{ color: next.color }}>{t("journey.open")} →</Link>
              {next.key === "majors" ? <DeferStep step="majors" deferred={false} /> : null}
            </div>
          </div>
        </div>
      ) : (
        <p className="notice notice-info mt-6">{t("journey.allStarted")}</p>
      )}

      {/* Timeline: numbered circles in each step's colour, joined by a line. */}
      <ol className="relative mt-8">
        {steps.map((s, i) => {
          const st = STATUS_STYLE[statuses[s.key]];
          const started = statuses[s.key] === "started";
          const isNext = next?.key === s.key;
          return (
            <li key={s.key} className="relative flex gap-4 pb-5 last:pb-0">
              {i < steps.length - 1 ? <span aria-hidden="true" className="absolute left-5 top-11 bottom-0 w-0.5 -translate-x-1/2" style={{ background: started ? s.color : "#d6d3d1" }} /> : null}
              <span
                aria-hidden="true"
                className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-serif text-lg font-bold"
                style={started ? { background: s.color, color: "#fff" } : { background: "#fff", color: s.color, border: `2px solid ${s.color}` }}
              >
                {i + 1}
              </span>
              <div
                className="card min-w-0 flex-1 border-l-4 p-4 sm:p-5"
                style={{ borderLeftColor: s.color, ...(isNext ? { boxShadow: `0 0 0 2px ${s.color}33`, background: s.soft } : {}) }}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: s.color }}>{t("journey.stepLabel", { n: i + 1 })}</p>
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
                    <Link href={s.href} className="btn btn-sm text-white no-underline" style={{ background: s.color }} aria-label={`${t("journey.open")}: ${t(`journey.steps.${s.key}.title` as never)}`}>
                      {t("journey.open")}
                    </Link>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-8 text-sm text-ink-soft">{t("journey.disclaimer")}</p>
    </div>
  );
}
