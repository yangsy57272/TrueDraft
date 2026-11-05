import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPrivacyFacts } from "@/config/deployment";
import type { FeedbackLanguage } from "@/i18n/config";
import { getT } from "@/i18n/server";
import { requirePageUser } from "@/server/session";
import { getEssay, getVersionById, listVersions } from "@/server/services/essays";
import { getRun, listRuns } from "@/server/services/feedback";
import { hasCurrentConsent } from "@/server/services/consent";
import { listBrainstormNotes } from "@/server/services/brainstorm";
import { isUuid, orNotFound } from "@/server/page-data";
import { Workspace } from "@/components/editor/Workspace";
import { listEntries } from "@/server/services/college-list";
import type { LatestFeedback } from "@/components/editor/FeedbackPanel";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("editor.editorLabel"), robots: { index: false } };
}

export default async function EssayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const user = await requirePageUser();
  const essay = await orNotFound(getEssay(user.id, id));
  const [versions, runs, consentCurrent, notes] = await Promise.all([
    listVersions(user.id, id),
    listRuns(user.id, id),
    hasCurrentConsent(user.id, "ai_processing"),
    listBrainstormNotes(user.id, id),
  ]);
  const facts = getPrivacyFacts();
  const { locale } = await getT();
  const listOptionsFor = (await listEntries(user.id)).map((e) => ({ id: e.id, name: locale === "zh-CN" && e.schoolNameZh ? e.schoolNameZh : e.schoolName }));

  const completedFull = runs.filter((r) => r.kind === "full_feedback" && r.status === "completed");
  const latestRunMeta = completedFull[0];
  let latestFeedback: LatestFeedback | null = null;
  if (latestRunMeta) {
    const run = await getRun<LatestFeedback["result"]>(user.id, id, latestRunMeta.id);
    if (run.result) {
      // The text the feedback was given on, so the panel can tell when the draft has moved on.
      const version = run.essayVersionId ? await getVersionById(user.id, id, run.essayVersionId).catch(() => null) : null;
      // The previous full report, for a "what changed since last time" comparison.
      const previousMeta = completedFull[1];
      const previous = previousMeta ? await getRun<LatestFeedback["result"]>(user.id, id, previousMeta.id) : null;
      latestFeedback = {
        versionContent: version?.content ?? null,
        taskStates: run.taskStates,
        previous:
          previous?.result && previous.result.material !== "insufficient"
            ? {
                createdAt: previous.createdAt.toISOString(),
                versionNumber: versions.find((v) => v.id === previous.essayVersionId)?.versionNumber ?? null,
                categories: previous.result.categories.map((c) => ({ key: c.key, label: c.label })),
              }
            : null,
        runId: run.id,
        result: run.result,
        createdAt: run.createdAt.toISOString(),
        modelName: run.modelName,
        versionNumber: versions.find((v) => v.id === run.essayVersionId)?.versionNumber ?? null,
        isMock: run.provider === "mock",
        redactionCount: run.redactionCount,
      };
    }
  }

  return (
    <Workspace
      essay={{
        id: essay.id,
        title: essay.title,
        applicationType: essay.applicationType,
        promptText: essay.promptText,
        targetSchool: essay.targetSchool,
        wordLimit: essay.wordLimit,
        status: essay.status,
        feedbackLanguage: essay.feedbackLanguage as FeedbackLanguage,
        focusAreas: essay.focusAreas,
        context: essay.context,
        draft: essay.draft,
        draftRevision: essay.draftRevision,
        updatedAt: essay.updatedAt.toISOString(),
        listEntryId: essay.listEntryId ?? null,
      }}
      listOptions={listOptionsFor}
      versions={versions.map((v) => ({ ...v, createdAt: v.createdAt.toISOString() }))}
      runs={runs.map((r) => ({
        id: r.id,
        kind: r.kind,
        status: r.status,
        errorCode: r.errorCode,
        essayVersionId: r.essayVersionId,
        modelName: r.modelName,
        provider: r.provider,
        createdAt: r.createdAt.toISOString(),
      }))}
      latestFeedback={latestFeedback}
      ai={{
        configured: facts.aiConfigured,
        isMock: facts.aiIsMock,
        providerName: facts.providerDisplayName,
        noTrainingConfirmed: facts.providerNoTrainingConfirmed,
        consentCurrent,
      }}
      notes={notes.map((n) => ({ id: n.id, createdAt: n.createdAt.toISOString(), turns: n.turns }))}
    />
  );
}
