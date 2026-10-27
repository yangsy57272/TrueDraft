import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/* ------------------------------------------------------------------ */
/* Authentication tables (shape required by Better Auth)              */
/* ------------------------------------------------------------------ */

export const user = pgTable("user", {
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

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
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

export const account = pgTable(
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
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

/* ------------------------------------------------------------------ */
/* Application tables                                                 */
/* ------------------------------------------------------------------ */

export const consentRecord = pgTable(
  "consent_record",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    consentType: text("consent_type").notNull(),
    policyVersion: text("policy_version").notNull(),
    granted: boolean("granted").notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
    withdrawalTimestamp: timestamp("withdrawal_timestamp", { withTimezone: true }),
  },
  (t) => [index("consent_user_type_idx").on(t.userId, t.consentType)],
);

export const essay = pgTable(
  "essay",
  {
    id: uuid("id").primaryKey().defaultRandom(),
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
    focusAreas: jsonb("focus_areas").$type<string[]>().notNull().default([]),
    /** Optional notes for the reviewer. AES-GCM encrypted. */
    encryptedContext: text("encrypted_context"),
    /** Autosaved working draft. AES-GCM encrypted. Versions are separate, immutable snapshots. */
    encryptedDraft: text("encrypted_draft").notNull(),
    draftWordCount: integer("draft_word_count").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("essay_user_idx").on(t.userId, t.updatedAt)],
);

export const essayVersion = pgTable(
  "essay_version",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    essayId: uuid("essay_id")
      .notNull()
      .references(() => essay.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    encryptedContent: text("encrypted_content").notNull(),
    wordCount: integer("word_count").notNull(),
    versionNote: text("version_note"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("essay_version_number_uq").on(t.essayId, t.versionNumber)],
);

export const feedbackRun = pgTable(
  "feedback_run",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    essayId: uuid("essay_id")
      .notNull()
      .references(() => essay.id, { onDelete: "cascade" }),
    essayVersionId: uuid("essay_version_id").references(() => essayVersion.id, {
      onDelete: "cascade",
    }),
    /** full_feedback | prompt_decoder | sentence | word_count | final_read | brainstorm */
    kind: text("kind").notNull(),
    requestedFeedbackTypes: jsonb("requested_feedback_types").$type<string[]>().notNull().default([]),
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
    /** Provider message id, kept only for debugging provider incidents. Contains no content. */
    providerRequestReference: text("provider_request_reference"),
    createdAt: createdAt(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [index("feedback_essay_idx").on(t.essayId, t.createdAt)],
);

export const brainstormNote = pgTable(
  "brainstorm_note",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    essayId: uuid("essay_id")
      .notNull()
      .references(() => essay.id, { onDelete: "cascade" }),
    encryptedContent: text("encrypted_content").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("brainstorm_essay_idx").on(t.essayId)],
);

export const resource = pgTable(
  "resource",
  {
    id: uuid("id").primaryKey().defaultRandom(),
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

export const privacySettings = pgTable("privacy_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  /** until_deleted | 365_days | 180_days | 90_days */
  retentionPreference: text("retention_preference").notNull().default("until_deleted"),
  optionalConsents: jsonb("optional_consents").$type<Record<string, boolean>>().notNull().default({}),
  updatedAt: updatedAt(),
});

export const auditEvent = pgTable(
  "audit_event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Kept after account deletion with the link removed; metadata never contains essay text.
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    eventType: text("event_type").notNull(),
    metadata: jsonb("metadata").$type<Record<string, string | number | boolean | null>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index("audit_user_idx").on(t.userId, t.createdAt)],
);

export const rateLimitBucket = pgTable(
  "rate_limit_bucket",
  {
    key: text("key").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] })],
);

export type User = typeof user.$inferSelect;
export type Essay = typeof essay.$inferSelect;
export type EssayVersion = typeof essayVersion.$inferSelect;
export type FeedbackRun = typeof feedbackRun.$inferSelect;
export type Resource = typeof resource.$inferSelect;
