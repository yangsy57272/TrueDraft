import "server-only";
import { getPrivacyFacts, limits } from "@/config/deployment";
import type { FeedbackLanguage } from "@/i18n/config";
import { countWords } from "@/lib/wordcount";
import type { AppUser } from "../session";
import { ApiError } from "../errors";
import { errorName, logger } from "../logger";
import { track, wordCountBucket } from "../analytics";
import { consumeRateLimit } from "../rate-limit";
import { redactIdentifiers } from "../redact";
import { hasCurrentConsent } from "../services/consent";
import { assertOwnedEssay, getEssay, latestVersionMatching, saveVersion } from "../services/essays";
import { completeRun, createPendingRun, failRun } from "../services/feedback";
import { getRetrievalGuidance } from "../services/resources";
import { buildSystemPrompt, buildUserMessage, PROMPT_VERSION, type PromptInput } from "./prompts";
import { AiProviderError, aiSettings, getProvider } from "./provider";
import { jsonSchemaFor, SCHEMA_VERSION, SCHEMAS, type SentenceMode, type ToolKind } from "./schemas";
import { applyGuards } from "./guard";

export type AiStage = "checking" | "structure" | "detail" | "priorities" | "reviewing" | "preparing";

export type AiRequestOptions = {
  /** Current editor content. Saved as a new version first if it differs from the latest one. */
  content?: string;
  feedbackLanguage?: FeedbackLanguage;
  focusAreas?: string[];
  selection?: string;
  sentenceMode?: SentenceMode;
  conversation?: { role: "coach" | "student"; text: string }[];
};

type Prepared = {
  user: AppUser;
  essayId: string;
  kind: ToolKind;
  versionId: string | null;
  language: FeedbackLanguage;
  originalDraft: string;
  promptInput: PromptInput;
  redactionCount: number;
  storedRequest: unknown | null;
  focusAreas: string[];
  wordCount: number;
  wordLimit: number | null;
};

/** Paragraph(s) around a selected passage, to give sentence feedback some context. */
function surroundingText(draft: string, selection: string) {
  const index = draft.indexOf(selection);
  if (index < 0) return "";
  const start = Math.max(0, draft.lastIndexOf("\n", index - 1));
  let end = draft.indexOf("\n", index + selection.length);
  if (end < 0) end = draft.length;
  return draft.slice(start, end).trim().slice(0, 1500);
}

/**
 * Validate and assemble everything needed for an AI call. Runs before any streaming starts so
 * that consent, rate-limit, and validation failures return normal HTTP errors.
 */
export async function prepareAiRun(user: AppUser, essayId: string, kind: ToolKind, options: AiRequestOptions): Promise<Prepared> {
  const facts = getPrivacyFacts();
  if (!facts.aiConfigured) throw new ApiError(503, "ai_not_configured");
  await assertOwnedEssay(user.id, essayId);
  if (!(await hasCurrentConsent(user.id, "ai_processing"))) throw new ApiError(403, "consent_required");

  const hourly = await consumeRateLimit(`ai:h:${user.id}`, limits.aiRequestsPerHour, 3600);
  const daily = await consumeRateLimit(`ai:d:${user.id}`, limits.aiRequestsPerDay, 86400);
  if (!hourly.allowed || !daily.allowed) {
    const resetAt = !hourly.allowed ? hourly.resetAt : daily.resetAt;
    throw new ApiError(429, "rate_limited", { retryAfterSeconds: Math.ceil((resetAt.getTime() - Date.now()) / 1000) });
  }

  const essay = await getEssay(user.id, essayId);
  const language = options.feedbackLanguage ?? (essay.feedbackLanguage as FeedbackLanguage);
  const focusAreas = options.focusAreas ?? essay.focusAreas;
  let draft = essay.draft;
  let versionId: string | null = null;

  const needsDraft = kind === "full_feedback" || kind === "word_count" || kind === "final_read" || kind === "sentence";
  if (needsDraft) {
    if (options.content !== undefined) {
      if (options.content.length > limits.maxDraftChars) throw new ApiError(413, "draft_too_long");
      draft = options.content;
    }
    if (countWords(draft) === 0) throw new ApiError(400, "empty_draft");
  }
  if (kind === "full_feedback" || kind === "word_count" || kind === "final_read") {
    // Feedback is always attached to an immutable version, never to a moving draft.
    const existing = await latestVersionMatching(essayId, draft);
    versionId = existing ? existing.id : (await saveVersion(user.id, essayId, draft, null)).id;
  }

  let redactions = 0;
  const redact = (value: string | null | undefined) => {
    if (!value) return value ?? "";
    const result = redactIdentifiers(value);
    redactions += result.count;
    return result.text;
  };

  const wordCount = countWords(draft);
  const promptInput: PromptInput = {
    kind,
    essayPrompt: redact(essay.promptText),
    context: redact(essay.context),
    applicationType: essay.applicationType,
    wordLimit: essay.wordLimit,
    focusAreas,
  };
  let storedRequest: unknown | null = null;

  if (kind === "full_feedback" || kind === "word_count" || kind === "final_read") {
    promptInput.essay = redact(draft);
    promptInput.wordCount = wordCount;
  } else if (kind === "sentence") {
    const selection = (options.selection ?? "").trim();
    if (!selection) throw new ApiError(400, "selection_required");
    if (selection.length > limits.maxSelectionChars) throw new ApiError(413, "selection_too_long");
    if (!options.sentenceMode) throw new ApiError(400, "mode_required");
    promptInput.selection = redact(selection);
    promptInput.surrounding = redact(surroundingText(draft, selection));
    promptInput.sentenceMode = options.sentenceMode;
    storedRequest = { selection, mode: options.sentenceMode };
  } else if (kind === "brainstorm") {
    const turns = (options.conversation ?? []).slice(-20);
    for (const t of turns) {
      if (t.text.length > limits.maxBrainstormAnswerChars) throw new ApiError(413, "answer_too_long");
    }
    promptInput.conversation = turns.map((t) => ({ role: t.role, text: redact(t.text) }));
  }

  const guidanceCategories: Record<ToolKind, string[]> = {
    full_feedback: ["craft", "structure", "reflection"],
    prompt_decoder: ["prompt"],
    sentence: ["language", "craft"],
    word_count: ["craft"],
    final_read: ["craft", "language"],
    brainstorm: ["process", "reflection"],
  };
  promptInput.guidance = await getRetrievalGuidance({ email: user.email }, guidanceCategories[kind]);

  return {
    user,
    essayId,
    kind,
    versionId,
    language,
    originalDraft: draft,
    promptInput,
    redactionCount: redactions,
    storedRequest,
    focusAreas,
    wordCount,
    wordLimit: essay.wordLimit,
  };
}

const STAGE_MARKERS: Record<ToolKind, [string, AiStage][]> = {
  full_feedback: [
    ['"categories"', "structure"],
    ['"passage_comments"', "detail"],
    ['"revision_plan"', "priorities"],
  ],
  prompt_decoder: [['"possible_experiences"', "preparing"]],
  sentence: [['"alternatives"', "preparing"]],
  word_count: [['"preserve"', "preparing"]],
  final_read: [['"grammar_issues"', "preparing"]],
  brainstorm: [['"questions"', "preparing"]],
};

function errorCodeFor(error: unknown): string {
  if (error instanceof AiProviderError) {
    switch (error.code) {
      case "timeout":
        return "ai_timeout";
      case "rate_limited":
        return "ai_busy";
      case "refused":
        return "ai_refused";
      case "malformed":
      case "truncated":
        return "ai_malformed";
      case "not_configured":
        return "ai_not_configured";
      default:
        return "ai_unavailable";
    }
  }
  return "ai_unavailable";
}

/**
 * Call the provider, validate the structured result, apply guardrails, and persist.
 * On any failure the run is marked failed and NO feedback is fabricated.
 */
export async function executeAiRun(prepared: Prepared, onStage: (stage: AiStage) => void) {
  const provider = await getProvider();
  const settings = aiSettings();
  const run = await createPendingRun({
    essayId: prepared.essayId,
    essayVersionId: prepared.versionId,
    kind: prepared.kind,
    requestedFeedbackTypes: prepared.focusAreas,
    feedbackLanguage: prepared.language,
    provider: provider.kind,
    modelName: provider.model,
    promptVersion: PROMPT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    request: prepared.storedRequest,
    redactionCount: prepared.redactionCount,
  });
  const logFields = { userId: prepared.user.id, essayId: prepared.essayId, runId: run.id, kind: prepared.kind, provider: provider.kind };
  track("feedback_requested", { kind: prepared.kind, language: prepared.language, wordCountBucket: wordCountBucket(prepared.wordCount) });

  onStage("checking");
  const system = buildSystemPrompt(prepared.kind, prepared.language);
  const userMessage = buildUserMessage(prepared.promptInput);
  const markers = STAGE_MARKERS[prepared.kind];
  const started = Date.now();
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= settings.maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), settings.timeoutMs);
    let reached = -1;
    if (prepared.kind !== "full_feedback") onStage("reviewing");
    else onStage("structure");
    try {
      const response = await provider.generate({
        system,
        user: userMessage,
        schemaName: prepared.kind,
        jsonSchema: jsonSchemaFor(prepared.kind),
        maxOutputTokens: settings.maxOutputTokens,
        signal: controller.signal,
        onProgress: (snapshot) => {
          for (let i = reached + 1; i < markers.length; i++) {
            if (snapshot.includes(markers[i][0])) {
              reached = i;
              onStage(markers[i][1]);
            }
          }
        },
      });
      clearTimeout(timer);

      const parsed = SCHEMAS[prepared.kind].safeParse(response.json);
      if (!parsed.success) throw new AiProviderError("malformed");
      const result = applyGuards(prepared.kind, parsed.data, {
        draft: prepared.originalDraft,
        selection: (prepared.storedRequest as { selection?: string } | null)?.selection ?? "",
        mode: prepared.promptInput.sentenceMode,
        wordCount: prepared.wordCount,
        wordLimit: prepared.wordLimit,
      });
      await completeRun(run.id, result, response.model, response.providerRef);
      logger.info("ai.run_completed", { ...logFields, model: response.model, durationMs: Date.now() - started, attempt, redactions: prepared.redactionCount });
      track("feedback_completed", { kind: prepared.kind });
      return { runId: run.id, result, isMock: provider.kind === "mock", redactionCount: prepared.redactionCount };
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
      const retryable = error instanceof AiProviderError ? error.retryable : false;
      logger.warn("ai.attempt_failed", { ...logFields, attempt, code: errorCodeFor(error), errorName: errorName(error) });
      if (!retryable || attempt === settings.maxRetries) break;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      onStage("checking");
    }
  }

  const code = errorCodeFor(lastError);
  await failRun(run.id, code);
  track("feedback_failed", { kind: prepared.kind, status: code });
  logger.error("ai.run_failed", { ...logFields, code, durationMs: Date.now() - started });
  throw new ApiError(502, code, { runId: run.id });
}
