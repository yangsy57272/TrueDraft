import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPrivacyFacts } from "@/config/deployment";
import type { FeedbackLanguage } from "@/i18n/config";
import { getT } from "@/i18n/server";
import { requirePageUser } from "@/server/session";
import { getEssay, listVersions } from "@/server/services/essays";
import { getRun, listRuns } from "@/server/services/feedback";
import { hasCurrentConsent } from "@/server/services/consent";
import { listBrainstormNotes } from "@/server/services/brainstorm";
import { isUuid, orNotFound } from "@/server/page-data";
import { Workspace } from "@/components/editor/Workspace";
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

  const latestRunMeta = runs.find((r) => r.kind === "full_feedback" && r.status === "completed");
  let latestFeedback: LatestFeedback | null = null;
  if (latestRunMeta) {
    const run = await getRun<LatestFeedback["result"]>(user.id, id, latestRunMeta.id);
    if (run.result) {
      latestFeedback = {
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
        updatedAt: essay.updatedAt.toISOString(),
      }}
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
