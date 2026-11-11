import type { FeedbackLanguage } from "@/i18n/config";
import type { AiProgress } from "@/lib/ai-progress";

export type ActiveAiRun = AiProgress & { kind: string };

export type WorkspaceEssay = {
  id: string;
  title: string;
  applicationType: string;
  promptText: string;
  targetSchool: string | null;
  wordLimit: number | null;
  status: string;
  feedbackLanguage: FeedbackLanguage;
  focusAreas: string[];
  context: string;
  draft: string;
  draftRevision: number;
  updatedAt: string;
  listEntryId: string | null;
};

export type WorkspaceVersion = { id: string; versionNumber: number; wordCount: number; versionNote: string | null; createdAt: string };

export type WorkspaceRun = {
  id: string;
  kind: string;
  status: string;
  errorCode: string | null;
  essayVersionId: string | null;
  modelName: string;
  provider: string;
  createdAt: string;
};

export type WorkspaceAi = {
  policyVersion?: string;
  configured: boolean;
  isMock: boolean;
  providerName: string | null;
  noTrainingConfirmed: boolean;
  consentCurrent: boolean;
};

export type BrainstormTurn = { role: "coach" | "student"; text: string };
export type SavedNote = { id: string; createdAt: string; turns: BrainstormTurn[] };
