import "server-only";
import { getAiConnection, connectionOrigin } from "@/server/ai/connection-settings";

/**
 * Deployment-specific facts shown in the Privacy Center and before AI processing.
 * Every privacy statement the UI makes about the AI provider is driven from here, so the
 * operator can only claim what their actual provider account and contract support.
 */

export type AiProviderKind = "anthropic" | "openai-compatible" | "mock" | "none";

function bool(value: string | undefined) {
  return value === "true" || value === "1";
}

export function getAiProviderKind(): AiProviderKind {
  return getAiConnection().provider;
}

export function isAiConfigured(): boolean {
  const c = getAiConnection();
  if (c.provider === "anthropic") return Boolean(c.apiKey && c.model);
  if (c.provider === "openai-compatible") return Boolean(c.baseUrl && c.model && (c.apiKey || c.noKey));
  return c.provider === "mock";
}

export function getPrivacyFacts() {
  const connection = getAiConnection();
  const kind = connection.provider;
  const providerDisplayName =
    (!connection.revision && process.env.AI_PROVIDER_DISPLAY_NAME) ||
    (kind === "anthropic" ? `Anthropic (Claude API)${connection.revision ? ` · ${connectionOrigin()}` : ""}` : kind === "mock" ? "Development mock (no AI)" : kind === "none" ? null : `AI service (${connectionOrigin()})`);
  return {
    aiProviderKind: kind,
    aiConfigured: isAiConfigured(),
    aiIsMock: kind === "mock",
    providerDisplayName,
    /** Only true when the operator has confirmed provider-side no-training terms for this account. */
    providerNoTrainingConfirmed: !connection.revision && bool(process.env.AI_PROVIDER_NO_TRAINING_CONFIRMED),
    /** Free-text, operator-supplied description of provider-side retention, e.g. "up to 30 days for abuse monitoring". */
    providerRetentionNote: !connection.revision ? process.env.AI_PROVIDER_RETENTION_NOTE || null : null,
    storageRegion: process.env.STORAGE_REGION || null,
    privacyLastUpdated: process.env.PRIVACY_LAST_UPDATED || "2026-10-27",
    policyVersion: getPolicyVersion(),
    draftStorageEnabled: true,
    encryptionAtRestNote: process.env.DATABASE_ENCRYPTION_AT_REST_NOTE || null,
  };
}

export function getPolicyVersion(): string {
  const version = process.env.PRIVACY_POLICY_VERSION || "2026-10-27";
  const revision = getAiConnection().revision;
  return revision ? `${version}:ai:${revision}` : version;
}

export function getAppUrl(): string {
  return (process.env.APP_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export const limits = {
  maxDraftChars: Number(process.env.MAX_DRAFT_CHARS ?? 20000),
  maxPromptChars: 4000,
  maxContextChars: 2000,
  maxTitleChars: 160,
  maxSelectionChars: 1200,
  maxVersionNoteChars: 200,
  maxBrainstormAnswerChars: 2000,
  maxVersionsPerEssay: 200,
  maxEssaysPerUser: 100,
  aiRequestsPerHour: Number(process.env.AI_REQUESTS_PER_HOUR ?? 20),
  aiRequestsPerDay: Number(process.env.AI_REQUESTS_PER_DAY ?? 60),
  writesPerMinute: Number(process.env.WRITES_PER_MINUTE ?? 120),
};
