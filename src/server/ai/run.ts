import { getResearchRun } from "@/server/services/profile";
import { WHY_SCHOOL_GUIDANCE } from "@/lib/school-research";
import "server-only";
import { getPrivacyFacts, getPolicyVersion, limits } from "@/config/deployment";
import type { FeedbackLanguage } from "@/i18n/config";
import { countWords } from "@/lib/wordcount";
import { INITIAL_AI_PROGRESS, type AiProgress } from "@/lib/ai-progress";
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
import { AiProviderError, aiSettings, getProvider, type AiProvider, type TokenUsage } from "./provider";
import { isSubstanceFailure, jsonSchemaFor, SCHEMA_VERSION, SCHEMAS, type EssayToolKind, type SentenceMode, type ToolKind } from "./schemas";
import { applyGuards, quoteAppearsIn } from "./guard";
import { aiLimitSettings, assertWithinBudget, costMicroUsd, inputHash, withRunSlot } from "./limits";
import { getReusableRun } from "../services/feedback";

type AiStage = "checking" | "structure" | "detail" | "priorities" | "reviewing" | "preparing";

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
  policyVersion: string;
  essayId: string;
  kind: EssayToolKind;
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
export async function prepareAiRun(user: AppUser, essayId: string, kind: EssayToolKind, options: AiRequestOptions): Promise<Prepared> {
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
    // Sentence feedback is only for the student's own text: the passage must come from the draft.
    if (!quoteAppearsIn(draft, selection)) throw new ApiError(400, "selection_not_in_draft");
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

  const guidanceCategories: Record<EssayToolKind, string[]> = {
    full_feedback: ["craft", "structure", "reflection"],
    prompt_decoder: ["prompt"],
    sentence: ["language", "craft"],
    word_count: ["craft"],
    final_read: ["craft", "language"],
    brainstorm: ["process", "reflection"],
  };
  promptInput.guidance = await getRetrievalGuidance({ email: user.email }, guidanceCategories[kind]);
  const researchId = essay.context?.match(/\[TrueDraft research:([a-zA-Z0-9-]{1,100})\]/)?.[1];
  if (researchId) {
    const research = await getResearchRun(user.id, researchId);
    if (research?.result) {
      promptInput.guidance.push({title:"School research writing workflow",source:"TrueDraft original guidance",text:WHY_SCHOOL_GUIDANCE});
      // Research remains untrusted data; it must not become privileged reference instructions.
      promptInput.researchEvidence = redact(JSON.stringify(research.result));
    }
  }

  return {
    user,
    policyVersion: facts.policyVersion,
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
  school_research: [['"items"', "reviewing"]],
  school_explorer: [['"schools"', "preparing"]],
  major_explorer: [['"suggestions"', "preparing"]],
  cv_import: [['"honors"', "preparing"]],
  cds_extract: [['"c7"', "preparing"]],
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
        return "ai_malformed";
      case "truncated":
        return "ai_truncated";
      case "incomplete":
        return "ai_incomplete";
      case "not_configured":
        return "ai_not_configured";
      default:
        return "ai_unavailable";
    }
  }
  return "ai_unavailable";
}

export class ModelCallError extends Error {
  constructor(
    public code: string,
    /** Tokens used by every attempt, including failed ones (they still cost money). */
    public usage: TokenUsage | null = null,
  ) {
    super(code);
    this.name = "ModelCallError";
  }
}

/**
 * Shared provider call used by every AI tool: streaming progress stages, per-attempt timeout,
 * limited retries for retryable failures only, and strict schema validation of the result.
 * Throws ModelCallError with a user-safe code; never returns unvalidated output.
 */
export async function callModel(opts: {
  kind: ToolKind;
  system: string;
  userMessage: string;
  onProgress: (progress: AiProgress) => void;
  logFields: Record<string, string | number>;
  firstStage?: AiStage;
  provider?: AiProvider;
}) {
  const provider = opts.provider ?? await getProvider();
  const settings = aiSettings();
  const markers = STAGE_MARKERS[opts.kind];
  let lastError: unknown = null;
  let usage: TokenUsage | null = null;
  const addUsage = (u: TokenUsage | null | undefined) => {
    if (!u) return;
    usage = { inputTokens: (usage?.inputTokens ?? 0) + u.inputTokens, outputTokens: (usage?.outputTokens ?? 0) + u.outputTokens };
  };
  for (let attempt = 0; attempt <= settings.maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), settings.timeoutMs);
    let reached = -1;
    let stage = opts.firstStage ?? "reviewing";
    let snapshot = "";
    let reportedLength = 0;
    let lastReportedAt = 0;
    const report = () => {
      reportedLength = snapshot.length;
      lastReportedAt = Date.now();
      opts.onProgress({ stage, generatedChars: [...snapshot].length });
    };
    report();
    try {
      const response = await provider.generate({
        system: opts.system,
        user: opts.userMessage,
        schemaName: opts.kind,
        jsonSchema: jsonSchemaFor(opts.kind),
        maxOutputTokens: settings.maxOutputTokens,
        signal: controller.signal,
        onProgress: (text) => {
          snapshot = text;
          for (let i = reached + 1; i < markers.length; i++) {
            if (snapshot.includes(markers[i][0])) {
              reached = i;
              stage = markers[i][1];
              report();
            }
          }
          if (snapshot.length !== reportedLength && (reportedLength === 0 || Date.now() - lastReportedAt >= 500)) report();
        },
      });
      clearTimeout(timer);
      if (snapshot.length !== reportedLength) report();
      addUsage(response.usage);
      const parsed = SCHEMAS[opts.kind].safeParse(response.json);
      if (!parsed.success) {
        // Well-formed but substantively incomplete output (e.g. a missing category) is worth one
        // more attempt; a malformed shape is not.
        if (isSubstanceFailure(parsed.error)) {
          logger.warn("ai.incomplete_output", { ...opts.logFields, attempt, code: parsed.error.issues.map((i) => i.message).join(",") });
          throw new AiProviderError("incomplete", true);
        }
        throw new AiProviderError("malformed");
      }
      return { parsed: parsed.data as unknown, model: response.model, providerRef: response.providerRef, providerKind: provider.kind, attempt, usage: usage as TokenUsage | null };
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
      const retryable = error instanceof AiProviderError ? error.retryable : false;
      logger.warn("ai.attempt_failed", { ...opts.logFields, attempt, code: errorCodeFor(error), errorName: errorName(error) });
      if (!retryable || attempt === settings.maxRetries) break;
      opts.onProgress(INITIAL_AI_PROGRESS);
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
  }
  throw new ModelCallError(errorCodeFor(lastError), usage);
}

/**
 * Tools whose output is never stored. A brainstorming conversation holds personal details the
 * student hasn't chosen to keep, and the model's questions can repeat them, so only run metadata
 * (status, model, timing) is recorded. Students keep material only by saving a note explicitly.
 */
export const EPHEMERAL_KINDS: ReadonlySet<ToolKind> = new Set<ToolKind>(["brainstorm"]);

/**
 * Call the provider, validate the structured result, apply guardrails, and persist.
 * On any failure the run is marked failed and NO feedback is fabricated.
 */
export async function executeAiRun(prepared: Prepared, onProgress: (progress: AiProgress) => void) {
  const provider = await getProvider();
  if (prepared.policyVersion !== getPolicyVersion()) throw new ApiError(403, "consent_required");
  const limitSettings = aiLimitSettings();
  const system = buildSystemPrompt(prepared.kind, prepared.language);
  const userMessage = buildUserMessage(prepared.promptInput);

  // Identical input (same text, settings, prompt and model) within the window: reuse the stored
  // result instead of paying for the same answer twice. Ephemeral tools are never reused.
  const hash = EPHEMERAL_KINDS.has(prepared.kind) ? null : inputHash({ system, userMessage, provider: provider.kind, model: provider.model, policyVersion: prepared.policyVersion, schema: SCHEMA_VERSION });
  if (hash && limitSettings.dedupWindowHours > 0) {
    const reusable = await getReusableRun(prepared.essayId, hash, new Date(Date.now() - limitSettings.dedupWindowHours * 3_600_000));
    if (reusable) {
      track("feedback_completed", { kind: prepared.kind });
      return { runId: reusable.id, result: reusable.result, isMock: provider.kind === "mock", redactionCount: reusable.redactionCount, reused: true as const };
    }
  }
  await assertWithinBudget(limitSettings);
  const run = await withRunSlot(
    prepared.user.id,
    (tx) =>
      createPendingRun(
        {
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
          inputHash: hash,
        },
        tx,
      ),
    limitSettings,
  );
  const logFields = { userId: prepared.user.id, essayId: prepared.essayId, runId: run.id, kind: prepared.kind, provider: provider.kind };
  track("feedback_requested", { kind: prepared.kind, language: prepared.language, wordCountBucket: wordCountBucket(prepared.wordCount) });

  onProgress(INITIAL_AI_PROGRESS);
  const started = Date.now();
  try {
    const response = await callModel({
      provider,
      kind: prepared.kind,
      system,
      userMessage,
      onProgress,
      logFields,
      firstStage: prepared.kind === "full_feedback" ? "structure" : "reviewing",
    });
    const result = applyGuards(prepared.kind, response.parsed, {
      draft: prepared.originalDraft,
      selection: (prepared.storedRequest as { selection?: string } | null)?.selection ?? "",
      mode: prepared.promptInput.sentenceMode,
      wordCount: prepared.wordCount,
      wordLimit: prepared.wordLimit,
    });
    await completeRun(run.id, EPHEMERAL_KINDS.has(prepared.kind) ? null : result, response.model, response.providerRef, response.usage, costMicroUsd(response.usage, limitSettings));
    logger.info("ai.run_completed", { ...logFields, model: response.model, durationMs: Date.now() - started, attempt: response.attempt, redactions: prepared.redactionCount });
    track("feedback_completed", { kind: prepared.kind });
    return { runId: run.id, result, isMock: provider.kind === "mock", redactionCount: prepared.redactionCount };
  } catch (error) {
    const code = error instanceof ModelCallError ? error.code : "ai_unavailable";
    const usage = error instanceof ModelCallError ? error.usage : null;
    await failRun(run.id, code, usage, costMicroUsd(usage, limitSettings));
    track("feedback_failed", { kind: prepared.kind, status: code });
    logger.error("ai.run_failed", { ...logFields, code, durationMs: Date.now() - started });
    throw new ApiError(502, code, { runId: run.id });
  }
}
