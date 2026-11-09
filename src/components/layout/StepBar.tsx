"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { JOURNEY_STEPS, stepForPath, type JourneyStepKey } from "@/lib/journey-steps";

/**
 * "Step 3 of 7" bar shown under the header on each journey step's page (signed-in students only):
 * a row of numbered, coloured dots with the current step highlighted, plus previous / next links.
 */
export function StepBar() {
  const { t } = useI18n();
  const pathname = usePathname();
  const index = stepForPath(pathname);
  if (index === null) return null;
  const step = JOURNEY_STEPS[index];
  const prev = index > 0 ? JOURNEY_STEPS[index - 1] : null;
  const next = index < JOURNEY_STEPS.length - 1 ? JOURNEY_STEPS[index + 1] : null;
  const title = (key: JourneyStepKey) => t(`journey.steps.${key}.title`);

  return (
    <nav aria-label={t("journey.stepNav")} className="border-b border-line" style={{ background: step.soft }}>
      <div className="container-page flex flex-wrap items-center gap-x-5 gap-y-2 py-2.5">
        <p className="flex items-center gap-2 text-sm font-semibold" style={{ color: step.color }}>
          <span aria-hidden="true" className="inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs text-white" style={{ background: step.color }}>
            {index + 1}/{JOURNEY_STEPS.length}
          </span>
          <span>
            <span className="sr-only">{t("journey.stepOf", { n: index + 1, total: JOURNEY_STEPS.length })}: </span>
            {title(step.key)}
          </span>
        </p>
        <ol className="hidden items-center gap-1 md:flex" aria-label={t("journey.allSteps")}>
          {JOURNEY_STEPS.map((s, i) => (
            <li key={s.key} className="flex items-center">
              <Link
                href={s.href}
                aria-current={i === index ? "step" : undefined}
                title={title(s.key)}
                className="flex h-6 w-6 items-center justify-center rounded-full text-[0.7rem] font-bold no-underline ring-offset-1"
                style={
                  i === index
                    ? { background: s.color, color: "#fff", boxShadow: `0 0 0 2px #fff, 0 0 0 4px ${s.color}` }
                    : { background: "#fff", color: s.color, border: `2px solid ${s.color}` }
                }
              >
                {i + 1}
                <span className="sr-only">. {title(s.key)}</span>
              </Link>
              {i < JOURNEY_STEPS.length - 1 ? <span aria-hidden="true" className="mx-0.5 h-0.5 w-4 rounded bg-line-strong" /> : null}
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap items-center gap-2 text-sm sm:ml-auto">
          <Link href="/journey" className="btn btn-ghost btn-sm text-ink-soft">
            {t("journey.allSteps")}
          </Link>
          {prev ? (
            <Link href={prev.href} className="btn btn-ghost btn-sm">
              <span aria-hidden="true">←</span> {t("journey.prevStep")}<span className="sr-only">, {title(prev.key)}</span>
            </Link>
          ) : null}
          {next ? (
            <Link href={next.href} className="btn btn-secondary btn-sm">
              {t("journey.nextStep", { title: title(next.key) })} <span aria-hidden="true">→</span>
            </Link>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
