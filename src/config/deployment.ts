import "server-only";

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
  const raw = (process.env.AI_PROVIDER ?? "").trim().toLowerCase();
  if (raw === "anthropic" || raw === "openai-compatible" || raw === "mock") return raw;
  return "none";
}

export function isAiConfigured(): boolean {
  const kind = getAiProviderKind();
  if (kind === "anthropic") return Boolean(process.env.ANTHROPIC_API_KEY);
  if (kind === "openai-compatible") return Boolean(process.env.AI_API_KEY && process.env.AI_BASE_URL);
  return kind === "mock";
}

export function getPrivacyFacts() {
  const kind = getAiProviderKind();
  const providerDisplayName =
    process.env.AI_PROVIDER_DISPLAY_NAME ||
    (kind === "anthropic" ? "Anthropic (Claude API)" : kind === "mock" ? "Development mock (no AI)" : kind === "none" ? null : "Configured AI provider");
  return {
    aiProviderKind: kind,
    aiConfigured: isAiConfigured(),
    aiIsMock: kind === "mock",
    providerDisplayName,
    /** Only true when the operator has confirmed provider-side no-training terms for this account. */
    providerNoTrainingConfirmed: bool(process.env.AI_PROVIDER_NO_TRAINING_CONFIRMED),
    /** Free-text, operator-supplied description of provider-side retention, e.g. "up to 30 days for abuse monitoring". */
    providerRetentionNote: process.env.AI_PROVIDER_RETENTION_NOTE || null,
    storageRegion: process.env.STORAGE_REGION || null,
    privacyLastUpdated: process.env.PRIVACY_LAST_UPDATED || "2026-10-27",
    policyVersion: getPolicyVersion(),
    draftStorageEnabled: true,
    encryptionAtRestNote: process.env.DATABASE_ENCRYPTION_AT_REST_NOTE || null,
  };
}

export function getPolicyVersion(): string {
  return process.env.PRIVACY_POLICY_VERSION || "2026-10-27";
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
