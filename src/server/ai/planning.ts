import "server-only";
import { randomUUID } from "node:crypto";
import { getPrivacyFacts, limits } from "@/config/deployment";
import type { FeedbackLanguage } from "@/i18n/config";
import { CDS_FIELDS, CIP_FAMILIES, type StudentProfile } from "@/lib/planning";
import type { AppUser } from "../session";
import { ApiError } from "../errors";
import { logger } from "../logger";
import { track } from "../analytics";
import { consumeRateLimit } from "../rate-limit";
import { redactIdentifiers } from "../redact";
import { hasCurrentConsent } from "../services/consent";
import { completePlanningRun, createPlanningRun, failPlanningRun, getProfile } from "../services/profile";
import { normalizeForMatch } from "./guard";
import { buildSystemPrompt, buildUserMessage, PROMPT_VERSION } from "./prompts";
import { getProvider } from "./provider";
import { callModel, ModelCallError, type AiStage } from "./run";
import { SCHEMA_VERSION, type CvImport, type MajorExplorer, type PlanningToolKind } from "./schemas";

export const MAX_CV_CHARS = 12000;
export const MAX_CDS_TEXT_CHARS = 60000;

/**
 * Text sent to the AI for Major Explorer. Data minimisation: test scores, GPA, graduation year,
 * and preferences are NOT included — they are irrelevant to exploring interests.
 */
export function profileToText(p: StudentProfile) {
  const lines: string[] = [];
  if (p.curriculum !== "unset") lines.push(`Curriculum: ${p.curriculum}`);
  if (p.courses.length) {
    lines.push("Courses:");
    for (const c of p.courses) lines.push(`- ${c.name} (${c.level}${c.grade ? `, grade ${c.grade}` : ""})`);
  }
  if (p.activities.length) {
    lines.push("Activities:");
    for (const a of p.activities) {
      const time = [a.hoursPerWeek ? `${a.hoursPerWeek} h/week` : null, a.weeksPerYear ? `${a.weeksPerYear} weeks/year` : null].filter(Boolean).join(", ");
      lines.push(`- [${a.type}] ${a.role}${a.organization ? `, ${a.organization}` : ""}: ${a.description}${a.grades.length ? ` (grades ${a.grades.join(", ")})` : ""}${time ? ` (${time})` : ""}`);
    }
  }
  if (p.honors.length) {
    lines.push("Honors:");
    for (const h of p.honors) lines.push(`- ${h.title} (${h.level})`);
  }
  if (p.interests.trim()) lines.push(`Interests and what I enjoy: ${p.interests.trim()}`);
  if (p.values.trim()) lines.push(`What matters to me: ${p.values.trim()}`);
  if (p.intendedMajors.length) lines.push(`Majors I'm already considering: ${p.intendedMajors.map((m) => m.name).join(", ")}`);
  return lines.join("\n");
}

function profileTerms(p: StudentProfile) {
  return [
    ...p.courses.map((c) => c.name),
    ...p.activities.flatMap((a) => [a.role, a.organization, a.description]),
    ...p.honors.map((h) => h.title),
    p.interests,
    p.values,
    ...p.intendedMajors.map((m) => m.name),
  ]
    .filter(Boolean)
    .map(normalizeForMatch);
}

/** A cited entry counts as grounded if it (or most of it) appears in the student's own profile. */
export function isGrounded(reference: string, terms: string[]) {
  const ref = normalizeForMatch(reference);
  if (ref.length < 2) return false;
  return terms.some((t) => t.includes(ref) || (ref.length > 3 && ref.includes(t) && t.length > 3));
}

export function guardMajorExplorer(data: MajorExplorer, profile: StudentProfile) {
  const terms = profileTerms(profile);
  const validCip = (c: string | null) => (c && CIP_FAMILIES[c] ? c : null);
  return {
    ...data,
    suggestions: data.suggestions.map((s) => ({
      ...s,
      cip_family: validCip(s.cip_family),
      based_on: s.based_on.map((ref) => ({ text: ref, grounded: isGrounded(ref, terms) })),
    })),
    broader_options: data.broader_options.map((b) => ({ ...b, cip_family: validCip(b.cip_family) })),
  };
}

/** Attach ids and flag items whose key text can't be found in the CV, so the student checks them. */
export function guardCvImport(data: CvImport, cvText: string) {
  const cv = normalizeForMatch(cvText);
  const found = (s: string) => {
    const n = normalizeForMatch(s);
    return n.length > 1 && cv.includes(n);
  };
  return {
    courses: data.courses.map((c) => ({ ...c, id: randomUUID(), grade: c.grade && c.grade >= 9 && c.grade <= 12 ? c.grade : null, foundInCv: found(c.name) })),
    activities: data.activities.map((a) => ({
      ...a,
      id: randomUUID(),
      hours_per_week: a.hours_per_week != null && a.hours_per_week >= 0 && a.hours_per_week <= 80 ? a.hours_per_week : null,
      weeks_per_year: a.weeks_per_year != null && a.weeks_per_year >= 0 && a.weeks_per_year <= 52 ? a.weeks_per_year : null,
      foundInCv: found(a.organization) || found(a.role),
    })),
    honors: data.honors.map((h) => ({ ...h, id: randomUUID(), foundInCv: found(h.title) })),
    skipped_notes: data.skipped_notes,
  };
}

type PreparedPlanning = {
  user: AppUser;
  kind: PlanningToolKind;
  language: FeedbackLanguage;
  profile: StudentProfile;
  text: string;
  redactionCount: number;
};

/** Validation, consent, and rate limiting happen before any streaming starts. */
export async function preparePlanningRun(
  user: AppUser,
  kind: PlanningToolKind,
  input: { cvText?: string; feedbackLanguage?: FeedbackLanguage },
): Promise<PreparedPlanning> {
  if (!getPrivacyFacts().aiConfigured) throw new ApiError(503, "ai_not_configured");
  if (!(await hasCurrentConsent(user.id, "ai_processing"))) throw new ApiError(403, "consent_required");
  const profile = await getProfile(user.id);
  let source = "";
  if (kind === "major_explorer") {
    source = profileToText(profile);
    if (profile.courses.length + profile.activities.length + profile.honors.length === 0 && !profile.interests.trim()) {
      throw new ApiError(400, "profile_empty");
    }
  } else {
    source = (input.cvText ?? "").trim();
    if (!source) throw new ApiError(400, "cv_required");
    if (source.length > MAX_CV_CHARS) throw new ApiError(413, "cv_too_long");
  }
  const hourly = await consumeRateLimit(`ai:h:${user.id}`, limits.aiRequestsPerHour, 3600);
  const daily = await consumeRateLimit(`ai:d:${user.id}`, limits.aiRequestsPerDay, 86400);
  if (!hourly.allowed || !daily.allowed) {
    const resetAt = !hourly.allowed ? hourly.resetAt : daily.resetAt;
    throw new ApiError(429, "rate_limited", { retryAfterSeconds: Math.ceil((resetAt.getTime() - Date.now()) / 1000) });
  }
  const redacted = redactIdentifiers(source);
  return { user, kind, language: input.feedbackLanguage ?? user.feedbackLanguage, profile, text: redacted.text, redactionCount: redacted.count };
}

export async function executePlanningRun(prepared: PreparedPlanning, onStage: (stage: AiStage) => void) {
  const provider = await getProvider();
  const run = await createPlanningRun({
    userId: prepared.user.id,
    kind: prepared.kind,
    feedbackLanguage: prepared.language,
    provider: provider.kind,
    modelName: provider.model,
    promptVersion: PROMPT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    redactionCount: prepared.redactionCount,
  });
  const logFields = { userId: prepared.user.id, runId: run.id, kind: prepared.kind, provider: provider.kind };
  onStage("checking");
  try {
    const response = await callModel({
      kind: prepared.kind,
      system: buildSystemPrompt(prepared.kind, prepared.language),
      userMessage: buildUserMessage(
        prepared.kind === "major_explorer" ? { kind: prepared.kind, profileText: prepared.text } : { kind: prepared.kind, cvText: prepared.text },
      ),
      onStage,
      logFields,
    });
    let result: unknown;
    if (prepared.kind === "major_explorer") {
      result = guardMajorExplorer(response.parsed as MajorExplorer, prepared.profile);
      await completePlanningRun(run.id, result, response.model);
    } else {
      // CV extraction is shown once for review and never stored; only accepted items are saved to the profile.
      result = guardCvImport(response.parsed as CvImport, prepared.text);
      await completePlanningRun(run.id, null, response.model);
    }
    track("tool_used", { kind: prepared.kind });
    logger.info("ai.planning_completed", { ...logFields, model: response.model, redactions: prepared.redactionCount });
    return { runId: run.id, result, isMock: provider.kind === "mock", redactionCount: prepared.redactionCount };
  } catch (error) {
    const code = error instanceof ModelCallError ? error.code : "ai_unavailable";
    await failPlanningRun(run.id, code);
    logger.error("ai.planning_failed", { ...logFields, code });
    throw new ApiError(502, code, { runId: run.id });
  }
}

/* ------------------------- admin: CDS extraction ------------------------- */

/**
 * Turn pasted CDS document text into a DRAFT for an administrator to check field by field.
 * Nothing is saved here; the admin reviews the values against the document before saving.
 */
export async function extractCdsDraft(adminId: string, cdsText: string, onStage: (stage: AiStage) => void) {
  const fields = new Map(CDS_FIELDS.map((f) => [f.key, f]));
  onStage("checking");
  const response = await callModel({
    kind: "cds_extract",
    system: buildSystemPrompt("cds_extract", "en"),
    userMessage: buildUserMessage({ kind: "cds_extract", cdsText }),
    onStage,
    logFields: { userId: adminId, kind: "cds_extract" },
  });
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
  const provider = await getProvider();
  return { data, uncertainFields: raw.uncertain_fields, model: response.model, isMock: provider.kind === "mock" };
}
