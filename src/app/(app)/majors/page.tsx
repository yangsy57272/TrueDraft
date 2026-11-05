import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { requirePageUser } from "@/server/session";
import { getProfile, listPlanningRuns } from "@/server/services/profile";
import { aiFactsFor } from "@/server/ai-facts";
import { MajorExplorer, type MajorResult } from "@/components/journey/MajorExplorer";
import { DeferStep } from "@/components/journey/DeferStep";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("majors.title"), robots: { index: false } };
}

export default async function MajorsPage() {
  const user = await requirePageUser();
  const { t } = await getT();
  const [profile, { runs, nextCursor }, ai] = await Promise.all([getProfile(user.id), listPlanningRuns(user.id, "major_explorer"), aiFactsFor(user.id)]);
  const hasProfile = profile.courses.length + profile.activities.length + profile.honors.length > 0 || profile.interests.trim().length > 0;
  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-semibold">{t("majors.title")}</h1>
      <p className="mt-2 max-w-3xl text-ink-soft">{t("majors.intro")}</p>
      {!profile.intendedMajors.length ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
          <span>{profile.deferredSteps.includes("majors") ? t("journey.facts.majorsLater") : t("majors.notReady")}</span>
          <DeferStep step="majors" deferred={profile.deferredSteps.includes("majors")} />
        </div>
      ) : null}
      <div className="mt-8">
        <MajorExplorer
          ai={ai}
          hasProfile={hasProfile}
          initialMajors={profile.intendedMajors}
          runs={runs.map((r) => ({ id: r.id, createdAt: r.createdAt.toISOString(), status: r.status, provider: r.provider, result: r.result as MajorResult | null }))}
          nextCursor={nextCursor}
        />
      </div>
    </div>
  );
}
