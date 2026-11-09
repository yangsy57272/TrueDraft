import Link from "next/link";
import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { requirePageUser } from "@/server/session";
import { getProfile } from "@/server/services/profile";
import { listEntries } from "@/server/services/college-list";
import { listEssays } from "@/server/services/essays";
import { DeferStep } from "@/components/journey/DeferStep";
import { JOURNEY_STEPS, type JourneyStepKey } from "@/lib/journey-steps";

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
  const statuses: Record<JourneyStepKey, Status> = {
    profile: hasProfile ? "started" : "not_started",
    majors: profile.intendedMajors.length ? "started" : majorsDeferred ? "deferred" : "not_started",
    cds: "learn",
    schools: directory ? "started" : "not_started",
    list: list.length ? "started" : "not_started",
    essays: essays.length ? "started" : "not_started",
    track: allDeadlines.length || list.some((e) => SUBMITTED.includes(e.status)) ? "started" : "not_started",
  };
  const facts: Record<JourneyStepKey, string | null> = {
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
  const planningSteps = steps.filter((s) => statuses[s.key] !== "learn");
  const startedCount = planningSteps.filter((s) => statuses[s.key] === "started").length;
  const nextStep = steps.findIndex((s) => statuses[s.key] === "not_started");
  const next = nextStep >= 0 ? steps[nextStep] : undefined;
  const resumeEssay = essays.find((essay) => essay.status !== "submitted");

  return (
    <div className="container-prose max-w-4xl py-10">
      <h1 className="text-3xl font-semibold">{t("journey.title")}</h1>
      <p className="mt-2 text-ink-soft">{t("journey.intro")}</p>

      <div className="mt-6">
        <p className="text-sm font-semibold text-ink">{t("journey.progress", { started: startedCount, total: planningSteps.length })}</p>
        <div className="mt-2 flex gap-1" aria-hidden="true">
          {planningSteps.map((s) => (
            <span key={s.key} className="h-2 flex-1 rounded-full bg-line" style={statuses[s.key] === "started" ? { background: s.color } : undefined} />
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-soft">{t("journey.progressHelp")}</p>
      </div>

      <div className={`mt-6 grid gap-4 ${resumeEssay && next ? "md:grid-cols-2" : ""}`}>
        {next ? (
          <section className="card border-l-4 p-5 sm:p-6" style={{ borderLeftColor: next.color, background: next.soft }} aria-labelledby="next-step">
            <p className="text-sm font-semibold" style={{ color: next.color }}>
              {t("journey.nextUp")} · {t("journey.stepLabel", { n: nextStep + 1 })}
            </p>
            <h2 id="next-step" className="mt-1 text-2xl font-semibold">{t(`journey.steps.${next.key}.title`)}</h2>
            <p className="mt-2 max-w-2xl text-ink-soft">{t(`journey.steps.${next.key}.body`)}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={next.href} className="btn btn-primary">{t(`journey.actions.${next.key}`)} <span aria-hidden="true">→</span></Link>
              {next.key === "majors" ? <DeferStep step="majors" deferred={false} /> : null}
            </div>
          </section>
        ) : <p className="notice notice-info">{t("journey.keepGoing")}</p>}
        {resumeEssay ? (
          <section className="card flex min-w-0 flex-col items-start border-l-4 border-l-coral p-5 sm:p-6" aria-labelledby="resume-essay">
            <h2 id="resume-essay" className="text-xl font-semibold">{t("journey.resumeEssay")}</h2>
            <p className="mt-2 mb-4 wrap-anywhere text-ink-soft" dir="auto">{resumeEssay.title}</p>
            <Link href={`/essays/${resumeEssay.id}`} className="btn btn-secondary mt-auto">{t("journey.openDraft")} <span aria-hidden="true">→</span></Link>
          </section>
        ) : null}
      </div>

      {/* Timeline: numbered circles in each step's colour, joined by a line. */}
      <h2 className="mt-10 text-xl font-semibold">{t("journey.allSteps")}</h2>
      <ol className="relative mt-4">
        {steps.map((s, i) => {
          const st = STATUS_STYLE[statuses[s.key]];
          const started = statuses[s.key] === "started";
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
              <div className="card min-w-0 flex-1 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="flex-[1_1_12rem] text-lg font-semibold">
                    <span className="sr-only">{i + 1}. </span>
                    {t(`journey.steps.${s.key}.title`)}
                  </h3>
                  <span className={`badge ${st.cls}`}>
                    <span aria-hidden="true">{st.icon}</span>
                    {t(st.key as never)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-ink-soft">{t(`journey.steps.${s.key}.body`)}</p>
                {facts[s.key] ? <p className="mt-2 text-sm font-medium">{facts[s.key]}</p> : null}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Link href={s.href} className="btn btn-secondary btn-sm">
                    {t(`journey.actions.${s.key}`)} <span aria-hidden="true">→</span>
                  </Link>
                  {s.key === "majors" && next?.key !== "majors" && !profile.intendedMajors.length ? <DeferStep step="majors" deferred={majorsDeferred} /> : null}
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
