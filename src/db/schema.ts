import type { Deadline } from "@/lib/deadlines";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import {
  type AnySQLiteColumn,
  index,
  integer,
  sqliteTable,
  primaryKey,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const timestamp = (name: string) => integer(name, { mode: "timestamp_ms" });
const boolean = (name: string) => integer(name, { mode: "boolean" });
const json = (name: string) => text(name, { mode: "json" });
const id = () => text("id").primaryKey().$defaultFn(randomUUID);
const now = sql`(cast(unixepoch('subsec') * 1000 as integer))`;
const createdAt = () => timestamp("created_at").notNull().default(now);
const updatedAt = () =>
  timestamp("updated_at")
    .notNull()
    .default(now)
    .$onUpdate(() => new Date());

/* ------------------------------------------------------------------ */
/* Authentication tables (shape required by Better Auth)              */
/* ------------------------------------------------------------------ */

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  // Better Auth requires a name column. We never require a real name; it stays empty
  // unless the student chooses an optional display name.
  name: text("name").notNull().default(""),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  preferredLanguage: text("preferred_language").notNull().default("en"),
  feedbackLanguage: text("feedback_language").notNull().default("en"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    // IP tracking is disabled in the auth config, so these normally stay null.
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

/* ------------------------------------------------------------------ */
/* Application tables                                                 */
/* ------------------------------------------------------------------ */

export const consentRecord = sqliteTable(
  "consent_record",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    consentType: text("consent_type").notNull(),
    policyVersion: text("policy_version").notNull(),
    granted: boolean("granted").notNull(),
    timestamp: timestamp("timestamp").notNull().default(now),
    withdrawalTimestamp: timestamp("withdrawal_timestamp"),
  },
  (t) => [index("consent_user_type_idx").on(t.userId, t.consentType)],
);

export const essay = sqliteTable(
  "essay",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    applicationType: text("application_type").notNull(),
    promptText: text("prompt_text").notNull(),
    targetSchool: text("target_school"),
    wordLimit: integer("word_limit"),
    status: text("status").notNull().default("drafting"),
    feedbackLanguage: text("feedback_language").notNull().default("en"),
    focusAreas: json("focus_areas").$type<string[]>().notNull().default([]),
    /** Optional link to a school on the student's college list (supplemental essays). */
    listEntryId: text("list_entry_id").references((): AnySQLiteColumn => collegeListEntry.id, { onDelete: "set null" }),
    /** Optional notes for the reviewer. AES-GCM encrypted. */
    encryptedContext: text("encrypted_context"),
    /** Autosaved working draft. AES-GCM encrypted. Versions are separate, immutable snapshots. */
    encryptedDraft: text("encrypted_draft").notNull(),
    draftWordCount: integer("draft_word_count").notNull().default(0),
    /** Incremented on every accepted draft write; saves based on an older revision are rejected. */
    draftRevision: integer("draft_revision").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("essay_user_idx").on(t.userId, t.updatedAt)],
);

export const essayVersion = sqliteTable(
  "essay_version",
  {
    id: id(),
    essayId: text("essay_id")
      .notNull()
      .references(() => essay.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    encryptedContent: text("encrypted_content").notNull(),
    wordCount: integer("word_count").notNull(),
    /** Optional note about the version. AES-GCM encrypted. */
    encryptedVersionNote: text("encrypted_version_note"),
    /** Plaintext notes written before encryption was added; cleared by `encryptLegacyVersionNotes`. */
    legacyVersionNote: text("version_note"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("essay_version_number_uq").on(t.essayId, t.versionNumber)],
);

export const feedbackRun = sqliteTable(
  "feedback_run",
  {
    id: id(),
    essayId: text("essay_id")
      .notNull()
      .references(() => essay.id, { onDelete: "cascade" }),
    essayVersionId: text("essay_version_id").references(() => essayVersion.id, {
      onDelete: "cascade",
    }),
    /** full_feedback | prompt_decoder | sentence | word_count | final_read | brainstorm */
    kind: text("kind").notNull(),
    requestedFeedbackTypes: json("requested_feedback_types").$type<string[]>().notNull().default([]),
    feedbackLanguage: text("feedback_language").notNull(),
    provider: text("provider").notNull(),
    modelName: text("model_name").notNull(),
    promptVersion: text("prompt_version").notNull(),
    schemaVersion: text("schema_version").notNull(),
    /** Tool-specific request details (e.g. a selected passage). AES-GCM encrypted. */
    encryptedRequest: text("encrypted_request"),
    encryptedStructuredResult: text("encrypted_structured_result"),
    /** pending | completed | failed */
    status: text("status").notNull().default("pending"),
    errorCode: text("error_code"),
    redactionCount: integer("redaction_count").notNull().default(0),
    /** Provider-reported token usage summed over attempts, and cost if the operator set prices. */
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    costMicroUsd: integer("cost_micro_usd"),
    /** Keyed hash of the exact input (HMAC, not reversible), to reuse identical recent results. */
    inputHash: text("input_hash"),
    /** The student's progress on each revision-plan task, keyed by task index. Not AI content. */
    taskStates: json("task_states").$type<Record<string, "todo" | "doing" | "done">>().notNull().default({}),
    /** Provider message id, kept only for debugging provider incidents. Contains no content. */
    providerRequestReference: text("provider_request_reference"),
    createdAt: createdAt(),
    completedAt: timestamp("completed_at"),
  },
  (t) => [index("feedback_essay_idx").on(t.essayId, t.createdAt), index("feedback_input_hash_idx").on(t.essayId, t.inputHash)],
);

export const brainstormNote = sqliteTable(
  "brainstorm_note",
  {
    id: id(),
    essayId: text("essay_id")
      .notNull()
      .references(() => essay.id, { onDelete: "cascade" }),
    encryptedContent: text("encrypted_content").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("brainstorm_essay_idx").on(t.essayId)],
);

export const resource = sqliteTable(
  "resource",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    /** Markdown body for original content, or an external URL for linked resources. */
    contentOrUrl: text("content_or_url").notNull(),
    contentType: text("content_type").notNull().default("article"), // article | external_link
    language: text("language").notNull().default("en"),
    category: text("category").notNull().default("craft"),
    source: text("source").notNull(),
    author: text("author").notNull(),
    /** original | licensed | public_link */
    licenseStatus: text("license_status").notNull(),
    permissionNotes: text("permission_notes"),
    /** Knowledge collection. Licensed third-party material lives in its own collection. */
    collection: text("collection").notNull().default("original"),
    /** public | authenticated | restricted */
    access: text("access").notNull().default("public"),
    /** Whether the material may ever be used for AI retrieval. Off by default. */
    retrievalAllowed: boolean("retrieval_allowed").notNull().default(false),
    published: boolean("published").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("resource_collection_idx").on(t.collection, t.published)],
);

export const privacySettings = sqliteTable("privacy_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  /** until_deleted | 365_days | 180_days | 90_days */
  retentionPreference: text("retention_preference").notNull().default("until_deleted"),
  optionalConsents: json("optional_consents").$type<Record<string, boolean>>().notNull().default({}),
  updatedAt: updatedAt(),
});

export const auditEvent = sqliteTable(
  "audit_event",
  {
    id: id(),
    // Kept after account deletion with the link removed; metadata never contains essay text.
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    eventType: text("event_type").notNull(),
    metadata: json("metadata").$type<Record<string, string | number | boolean | null>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index("audit_user_idx").on(t.userId, t.createdAt)],
);

export const rateLimitBucket = sqliteTable(
  "rate_limit_bucket",
  {
    key: text("key").notNull(),
    windowStart: timestamp("window_start").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] })],
);

/* ------------------------------------------------------------------ */
/* Application journey: profile, planning AI runs, schools/CDS, list    */
/* ------------------------------------------------------------------ */

/** One profile per student: courses, activities, honors, tests, preferences. AES-GCM encrypted JSON. */
export const studentProfile = sqliteTable("student_profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  encryptedData: text("encrypted_data").notNull(),
  updatedAt: updatedAt(),
});

/** AI runs that are about the student's planning rather than one essay (e.g. Major Explorer). */
export const planningRun = sqliteTable(
  "planning_run",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    feedbackLanguage: text("feedback_language").notNull(),
    provider: text("provider").notNull(),
    modelName: text("model_name").notNull(),
    promptVersion: text("prompt_version").notNull(),
    schemaVersion: text("schema_version").notNull(),
    /** Null for CV import: extracted CV items are returned once and never stored unless accepted. */
    encryptedStructuredResult: text("encrypted_structured_result"),
    status: text("status").notNull().default("pending"),
    errorCode: text("error_code"),
    redactionCount: integer("redaction_count").notNull().default(0),
    /** Provider-reported token usage summed over attempts, and cost if the operator set prices. */
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    costMicroUsd: integer("cost_micro_usd"),
    createdAt: createdAt(),
    completedAt: timestamp("completed_at"),
  },
  (t) => [index("planning_run_user_idx").on(t.userId, t.kind, t.createdAt)],
);

/** Directory of institutions. Public reference data, not student data. */
export const school = sqliteTable("school", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  nameZh: text("name_zh"),
  city: text("city"),
  state: text("state"),
  country: text("country").notNull().default("US"),
  control: text("control"), // public | private
  website: text("website"),
  /** IPEDS institution id (UNITID), used to match U.S. Department of Education data. */
  unitid: text("unitid").unique(),
  /** The institution's own Common Data Set page. */
  cdsPageUrl: text("cds_page_url"),
  /** Most recent CDS edition the operator has seen listed on that page (not necessarily imported). */
  latestCdsYearListed: text("latest_cds_year_listed"),
  linkCheckedAt: timestamp("link_checked_at"),
  published: boolean("published").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/**
 * U.S. Department of Education data (College Scorecard / IPEDS) for one school, copied as published.
 * A broad, comparable baseline for every college; the Common Data Set, where imported, is more detailed.
 */
export const federalProfile = sqliteTable("federal_profile", {
  schoolId: text("school_id")
    .primaryKey()
    .references(() => school.id, { onDelete: "cascade" }),
  unitid: text("unitid").notNull(),
  /** Date of the College Scorecard file the values came from. */
  fileDate: text("file_date").notNull(),
  data: json("data").$type<Record<string, unknown>>().notNull(),
  updatedAt: updatedAt(),
});

export type SupplementPrompt = {
  wording?: "official" | "summary";
  order: number;
  prompt: string;
  /** The limit as the college states it, e.g. "100-250 words" or "350 characters". */
  limitText: string | null;
  limit: number | null;
  unit: "words" | "characters" | null;
  /** e.g. "Required", "Choose one of 3", "Required for Engineering applicants". */
  requirement: string | null;
  notes: string | null;
};

/**
 * One application cycle's supplemental essay prompts for one school, imported from
 * data/supplements/<cycle>.json. status: confirmed (prompts listed), coming_soon, or none
 * (the school lists no supplemental essays). Prompts are the colleges' own words.
 */
export const schoolSupplements = sqliteTable(
  "school_supplements",
  {
    schoolId: text("school_id")
      .notNull()
      .references(() => school.id, { onDelete: "cascade" }),
    cycle: text("cycle").notNull(),
    status: text("status").notNull(),
    sourceUrl: text("source_url"),
    /** Optional external guide to these prompts, linked with attribution (never copied). */
    guideUrl: text("guide_url"),
    verification: json("verification").$type<{ checkedAt: string; note: string; result?: string; httpStatus?: number }>(),
    prompts: json("prompts").$type<SupplementPrompt[]>().notNull().default([]),
    /** When the compiled list this came from was last updated (YYYY-MM-DD). */
    listUpdated: text("list_updated"),
    importedAt: timestamp("imported_at").notNull().default(now),
  },
  (t) => [primaryKey({ columns: [t.schoolId, t.cycle] })],
);

/** One CDS edition for one school. Values come from official documents; verification provenance distinguishes automated imports from admin review. */
export const cdsDataset = sqliteTable(
  "cds_dataset",
  {
    id: id(),
    schoolId: text("school_id")
      .notNull()
      .references(() => school.id, { onDelete: "cascade" }),
    academicYear: text("academic_year").notNull(), // e.g. "2025-2026"
    sourceUrl: text("source_url").notNull(),
    /** Where in the document the values come from, e.g. "Sections B, C, G, H, I (pp. 3–30)". */
    sourcePageRef: text("source_page_ref"),
    /** Set when the official document is hosted off the institution's domain (reviewed exception). */
    sourceDomainException: boolean("source_domain_exception").notNull().default(false),
    sourceExceptionReason: text("source_exception_reason"),
    data: json("data").$type<Record<string, unknown>>().notNull().default({}),
    /** draft | verified */
    verificationStatus: text("verification_status").notNull().default("draft"),
    verifiedAt: timestamp("verified_at"),
    verifiedBy: text("verified_by").references(() => user.id, { onDelete: "set null" }),
    /** How values were checked, e.g. "admin-manual" or "import-script: parsed + line-by-line review". */
    verificationMethod: text("verification_method"),
    notes: text("notes"),
    published: boolean("published").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("cds_school_year_uq").on(t.schoolId, t.academicYear)],
);

export const collegeListEntry = sqliteTable(
  "college_list_entry",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    schoolId: text("school_id").references(() => school.id, { onDelete: "set null" }),
    customSchoolName: text("custom_school_name"),
    category: text("category").notNull().default("unsure"),
    entryYear: integer("entry_year"),
    deadlineTrack: text("deadline_track"),
    round: text("round").notNull().default("undecided"),
    platform: text("platform"),
    /** Application, aid, interview… deadlines, each with its own time zone and source. */
    deadlines: json("deadlines")
      .$type<Deadline[]>()
      .notNull()
      .default([]),
    intendedMajor: text("intended_major"),
    status: text("status").notNull().default("researching"),
    encryptedNotes: text("encrypted_notes"),
    checklist: json("checklist").$type<{ id: string; key?: string | null; label?: string; done: boolean }[]>().notNull().default([]),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("list_user_idx").on(t.userId), uniqueIndex("list_user_school_uq").on(t.userId, t.schoolId)],
);

export type User = typeof user.$inferSelect;
export type Essay = typeof essay.$inferSelect;
export type EssayVersion = typeof essayVersion.$inferSelect;
export type FeedbackRun = typeof feedbackRun.$inferSelect;
export type Resource = typeof resource.$inferSelect;
export type School = typeof school.$inferSelect;
export type CdsDataset = typeof cdsDataset.$inferSelect;
export type FederalProfile = typeof federalProfile.$inferSelect;
export type CollegeListEntry = typeof collegeListEntry.$inferSelect;
export type SchoolSupplements = typeof schoolSupplements.$inferSelect;

/** Private scheduling preferences, prompt selections and completion state. */
export const applicationSchedule = sqliteTable("application_schedule", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  encryptedData: text("encrypted_data").notNull(),
  updatedAt: updatedAt(),
});
