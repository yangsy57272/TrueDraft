import { collectResearch } from "@/server/research/collect";
import { guardSchoolResearch } from "./research-guard";
import type { ResearchEvidence } from "@/lib/school-research";
import type { SchoolResearch } from "./schemas";
import "server-only";
import { recommendSchools, schoolAnalysisCandidates } from "../services/recommendations";
import { RANKING_EDITION } from "@/lib/school-rankings";
import type { ApplicationSystem } from "@/lib/application-systems";
import type { SchoolExplorer } from "./schemas";
import { getPrivacyFacts, getPolicyVersion, limits } from "@/config/deployment";
import type { FeedbackLanguage } from "@/i18n/config";
import { INITIAL_AI_PROGRESS, type AiProgress } from "@/lib/ai-progress";
import { CDS_FIELDS, CIP_FAMILIES, type StudentProfile } from "@/lib/planning";
import type { AppUser } from "../session";
import { ApiError } from "../errors";
import { logger } from "../logger";
import { track } from "../analytics";
import { consumeRateLimit } from "../rate-limit";
import { redactIdentifiers } from "../redact";
import { hasCurrentConsent } from "../services/consent";
import { completePlanningRun, createPlanningRun, failPlanningRun, getProfile } from "../services/profile";
import { buildSystemPrompt, buildUserMessage, PROMPT_VERSION } from "./prompts";
import { getProvider } from "./provider";
import { callModel, ModelCallError } from "./run";
import { aiLimitSettings, assertWithinBudget, costMicroUsd, withRunSlot } from "./limits";
import { SCHEMA_VERSION, type CvImport, type MajorExplorer, type PlanningToolKind } from "./schemas";
import { guardCvImport, guardMajorExplorer, profileToText } from "./planning-guard";

export { guardCvImport, guardMajorExplorer, isGrounded, profileToText } from "./planning-guard";

export const MAX_CV_CHARS = 12000;
export const MAX_CDS_TEXT_CHARS = 60000;

type PreparedPlanning = {
  user: AppUser;
  policyVersion: string;
  kind: PlanningToolKind;
  language: FeedbackLanguage;
  profile: StudentProfile;
  text: string;
  redactionCount: number;
  researchInput?: { schoolSlug: string; program: string; officialUrls: string[] };
  research?: ResearchEvidence;
  schoolCandidates?: string;
  schoolIds?: string[];
};

/** Validation, consent, and rate limiting happen before any streaming starts. */
export async function preparePlanningRun(
  user: AppUser,
  kind: PlanningToolKind,
  input: { schoolSlug?: string; program?: string; officialUrls?: string[]; cvText?: string; feedbackLanguage?: FeedbackLanguage; field?: string; tuition?: string; priority?: "balanced" | "overall" | "program"; system?:ApplicationSystem },
): Promise<PreparedPlanning> {
  const policyVersion = getPolicyVersion();
  if (!getPrivacyFacts().aiConfigured) throw new ApiError(503, "ai_not_configured");
  if (!(await hasCurrentConsent(user.id, "ai_processing"))) throw new ApiError(403, "consent_required");
  const profile = await getProfile(user.id);
  let source = "";
  if (kind === "major_explorer" || kind === "school_explorer") {
    source = profileToText(profile);
    if (profile.courses.length + profile.activities.length + profile.honors.length === 0 && !profile.interests.trim()) {
      throw new ApiError(400, "profile_empty");
    }
  } else if (kind === "school_research") {
    if (!input.schoolSlug || !input.program) throw new ApiError(400, "validation_failed");
    source = profileToText(profile);
  } else {
    source = (input.cvText ?? "").trim();
    if (!source) throw new ApiError(400, "cv_required");
    if (source.length > MAX_CV_CHARS) throw new ApiError(413, "cv_too_long");
  }
  let schoolCandidates: string | undefined;
  let schoolIds: string[] | undefined;
  if (kind === "school_explorer") {
    const recommendations = await recommendSchools(profile, input);
    const candidates = schoolAnalysisCandidates(recommendations);
    if (!candidates.length) throw new ApiError(400, "profile_empty");
    schoolIds = candidates.map(r => r.school_id);
    // Tests and GPA are used locally for fit, never sent to the provider.
    schoolCandidates = JSON.stringify(candidates.map(r=>({...r,ranking_edition:r.system==="US"?RANKING_EDITION:null})));

  }
  const hourly = await consumeRateLimit(`ai:h:${user.id}`, limits.aiRequestsPerHour, 3600);
  const daily = await consumeRateLimit(`ai:d:${user.id}`, limits.aiRequestsPerDay, 86400);
  if (!hourly.allowed || !daily.allowed) {
    const resetAt = !hourly.allowed ? hourly.resetAt : daily.resetAt;
    throw new ApiError(429, "rate_limited", { retryAfterSeconds: Math.ceil((resetAt.getTime() - Date.now()) / 1000) });
  }
  const redacted = redactIdentifiers(source);
  return { user, policyVersion, kind, language: input.feedbackLanguage ?? user.feedbackLanguage, profile, text: redacted.text, redactionCount: redacted.count, schoolCandidates, schoolIds, researchInput: kind === "school_research" ? { schoolSlug: input.schoolSlug!, program: input.program!, officialUrls: input.officialUrls ?? [] } : undefined };
}

export async function executePlanningRun(prepared: PreparedPlanning, onProgress: (progress: AiProgress) => void) {
  const provider = await getProvider();
  if (prepared.policyVersion !== getPolicyVersion()) throw new ApiError(403, "consent_required");
  const limitSettings = aiLimitSettings();
  await assertWithinBudget(limitSettings);
  const run = await withRunSlot(
    prepared.user.id,
    (tx) =>
      createPlanningRun(
        {
          userId: prepared.user.id,
          kind: prepared.kind,
          feedbackLanguage: prepared.language,
          provider: provider.kind,
          modelName: provider.model,
          promptVersion: PROMPT_VERSION,
          schemaVersion: SCHEMA_VERSION,
          redactionCount: prepared.redactionCount,
        },
        tx,
      ),
    limitSettings,
  );
  const logFields = { userId: prepared.user.id, runId: run.id, kind: prepared.kind, provider: provider.kind };
  onProgress(INITIAL_AI_PROGRESS);
  try {
    if (prepared.researchInput) prepared.research = await collectResearch(prepared.researchInput.schoolSlug, prepared.researchInput.program, prepared.researchInput.officialUrls);
    const response = await callModel({
      provider,
      kind: prepared.kind,
      system: buildSystemPrompt(prepared.kind, prepared.language),
      userMessage: buildUserMessage(
        prepared.kind === "school_research" ? { kind: prepared.kind, profileText: prepared.text, officialResearch: JSON.stringify(prepared.research) } : prepared.kind === "school_explorer" ? { kind: prepared.kind, profileText: prepared.text, schoolCandidates: prepared.schoolCandidates } : prepared.kind === "major_explorer" ? { kind: prepared.kind, profileText: prepared.text } : { kind: prepared.kind, cvText: prepared.text },
      ),
      onProgress,
      logFields,
    });
    let result: unknown;
    if (prepared.kind === "school_research") {
      result = { ...guardSchoolResearch(response.parsed as SchoolResearch, prepared.research!), evidence: prepared.research };
      await completePlanningRun(run.id, result, response.model, response.usage, costMicroUsd(response.usage, limitSettings));
    } else if (prepared.kind === "school_explorer") {
      const raw = response.parsed as SchoolExplorer;
      const seen = new Set<string>();
      result = { ...raw, schools: raw.schools.filter(s => {
        if (!prepared.schoolIds?.includes(s.school_id) || seen.has(s.school_id)) return false;
        seen.add(s.school_id); return true;
      }) };
      if (!(result as SchoolExplorer).schools.length) throw new Error("No grounded school matches");
      await completePlanningRun(run.id, result, response.model, response.usage, costMicroUsd(response.usage, limitSettings));
    } else if (prepared.kind === "major_explorer") {
      result = guardMajorExplorer(response.parsed as MajorExplorer, prepared.profile);
      await completePlanningRun(run.id, result, response.model, response.usage, costMicroUsd(response.usage, limitSettings));
    } else {
      // CV extraction is shown once for review and never stored; only accepted items are saved to the profile.
      result = guardCvImport(response.parsed as CvImport, prepared.text);
      await completePlanningRun(run.id, null, response.model, response.usage, costMicroUsd(response.usage, limitSettings));
    }
    track("tool_used", { kind: prepared.kind });
    logger.info("ai.planning_completed", { ...logFields, model: response.model, redactions: prepared.redactionCount });
    return { runId: run.id, result, isMock: provider.kind === "mock", redactionCount: prepared.redactionCount };
  } catch (error) {
    const code = error instanceof ModelCallError ? error.code : "ai_unavailable";
    const usage = error instanceof ModelCallError ? error.usage : null;
    await failPlanningRun(run.id, code, usage, costMicroUsd(usage, limitSettings));
    logger.error("ai.planning_failed", { ...logFields, code });
    throw new ApiError(502, code, { runId: run.id });
  }
}

/* ------------------------- admin: CDS extraction ------------------------- */

/**
 * Turn pasted CDS document text into a DRAFT for an administrator to check field by field.
 * Nothing is saved here; the admin reviews the values against the document before saving.
 */
export async function extractCdsDraft(adminId: string, cdsText: string, onProgress: (progress: AiProgress) => void) {
  const fields = new Map(CDS_FIELDS.map((f) => [f.key, f]));
  const provider = await getProvider();
  const limitSettings = aiLimitSettings();
  await assertWithinBudget(limitSettings);
  // Recorded (metadata and usage only, no content) so admin extractions count toward the budget.
  const run = await withRunSlot(
    adminId,
    (tx) =>
      createPlanningRun(
        { userId: adminId, kind: "cds_extract", feedbackLanguage: "en", provider: provider.kind, modelName: provider.model, promptVersion: PROMPT_VERSION, schemaVersion: SCHEMA_VERSION, redactionCount: 0 },
        tx,
      ),
    limitSettings,
  );
  onProgress(INITIAL_AI_PROGRESS);
  let response: Awaited<ReturnType<typeof callModel>>;
  try {
    response = await callModel({
      provider,
      kind: "cds_extract",
      system: buildSystemPrompt("cds_extract", "en"),
      userMessage: buildUserMessage({ kind: "cds_extract", cdsText }),
      onProgress,
      logFields: { userId: adminId, runId: run.id, kind: "cds_extract" },
    });
  } catch (error) {
    const usage = error instanceof ModelCallError ? error.usage : null;
    await failPlanningRun(run.id, error instanceof ModelCallError ? error.code : "ai_unavailable", usage, costMicroUsd(usage, limitSettings));
    throw error;
  }
  await completePlanningRun(run.id, null, response.model, response.usage, costMicroUsd(response.usage, limitSettings));
  const raw = response.parsed as Record<string, unknown> & {
    c7: { factor: string; level: string }[];
    degrees_by_field: { cip_family: string; percent: number }[];
    uncertain_fields: string[];
  };
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (fields.has(key) && value !== null && value !== undefined) data[key] = value;
  }
  if (raw.c7.length) data.c7 = Object.fromEntries(raw.c7.map((c) => [c.factor, c.level]));
  const j1 = raw.degrees_by_field.filter((d) => CIP_FAMILIES[d.cip_family] && d.percent >= 0 && d.percent <= 100);
  if (j1.length) data.degreesByField = Object.fromEntries(j1.map((d) => [d.cip_family, d.percent]));
  return { data, uncertainFields: raw.uncertain_fields, model: response.model, isMock: provider.kind === "mock" };
}
