import { z } from "zod";
import { limits } from "@/config/deployment";
import { FEEDBACK_LANGUAGES, LOCALES } from "@/i18n/config";
import { SENTENCE_MODES } from "./ai/schemas";
import {
  APPLICATION_TYPES,
  ESSAY_STATUSES,
  FOCUS_AREAS,
  LICENSE_STATUSES,
  RESOURCE_ACCESS,
  RESOURCE_CATEGORIES,
  RESOURCE_COLLECTIONS,
  RETENTION_OPTIONS,
} from "@/lib/constants";

const trimmed = (max: number) => z.string().trim().max(max);

export const essayCreateSchema = z.object({
  title: trimmed(limits.maxTitleChars).min(1),
  applicationType: z.enum(APPLICATION_TYPES),
  promptText: trimmed(limits.maxPromptChars).min(1),
  targetSchool: trimmed(160).nullish(),
  wordLimit: z.number().int().min(1).max(5000).nullish(),
  draft: z.string().max(limits.maxDraftChars).default(""),
  feedbackLanguage: z.enum(FEEDBACK_LANGUAGES),
  focusAreas: z.array(z.enum(FOCUS_AREAS)).max(FOCUS_AREAS.length).default([]),
  context: trimmed(limits.maxContextChars).nullish(),
});

export const essayPatchSchema = essayCreateSchema
  .omit({ draft: true })
  .partial()
  .extend({ status: z.enum(ESSAY_STATUSES).optional() });

export const draftSchema = z.object({ draft: z.string().max(limits.maxDraftChars) });

export const versionCreateSchema = z.object({
  content: z.string().max(limits.maxDraftChars),
  note: trimmed(limits.maxVersionNoteChars).nullish(),
});

export const aiRequestSchema = z.object({
  content: z.string().max(limits.maxDraftChars).optional(),
  feedbackLanguage: z.enum(FEEDBACK_LANGUAGES).optional(),
  focusAreas: z.array(z.enum(FOCUS_AREAS)).optional(),
  selection: z.string().max(limits.maxSelectionChars).optional(),
  sentenceMode: z.enum(SENTENCE_MODES).optional(),
  conversation: z
    .array(z.object({ role: z.enum(["coach", "student"]), text: z.string().max(limits.maxBrainstormAnswerChars) }))
    .max(40)
    .optional(),
});

export const brainstormSaveSchema = z.object({
  turns: z
    .array(z.object({ role: z.enum(["coach", "student"]), text: z.string().max(limits.maxBrainstormAnswerChars) }))
    .min(1)
    .max(40),
});

export const consentSchema = z.object({ consentType: z.literal("ai_processing"), action: z.enum(["grant", "withdraw"]) });

export const preferencesSchema = z.object({
  preferredLanguage: z.enum(LOCALES).optional(),
  feedbackLanguage: z.enum(FEEDBACK_LANGUAGES).optional(),
  displayName: z.string().max(60).optional(),
});

export const retentionSchema = z.object({ retention: z.enum(RETENTION_OPTIONS) });

export const localeSchema = z.object({ locale: z.enum(LOCALES) });

export const deleteAccountSchema = z.object({ confirm: z.literal("DELETE") });

export const resourceSchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  title: trimmed(200).min(1),
  summary: trimmed(600).min(1),
  contentOrUrl: z.string().trim().min(1).max(40000),
  contentType: z.enum(["article", "external_link"]),
  language: z.enum(["en", "zh-CN", "multi"]),
  category: z.enum(RESOURCE_CATEGORIES),
  source: trimmed(200).min(1),
  author: trimmed(200).min(1),
  licenseStatus: z.enum(LICENSE_STATUSES),
  permissionNotes: trimmed(2000).nullable(),
  collection: z.enum(RESOURCE_COLLECTIONS),
  access: z.enum(RESOURCE_ACCESS),
  retrievalAllowed: z.boolean(),
  published: z.boolean(),
}).refine((r) => r.contentType !== "external_link" || /^https:\/\//.test(r.contentOrUrl), { path: ["contentOrUrl"], message: "must be https URL" });
