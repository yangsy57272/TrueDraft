/** Enumerations shared by server and client code. */
export const APPLICATION_TYPES = ["personal_statement", "supplemental", "why_school", "activity", "community", "scholarship", "other"] as const;
export type ApplicationType = (typeof APPLICATION_TYPES)[number];

export const FOCUS_AREAS = ["prompt", "topic", "structure", "opening", "details", "reflection", "clarity", "voice", "word_count", "grammar", "ending"] as const;
export type FocusArea = (typeof FOCUS_AREAS)[number];

export const ESSAY_STATUSES = ["drafting", "revising", "final_review", "submitted"] as const;
export type EssayStatus = (typeof ESSAY_STATUSES)[number];

export const RETENTION_OPTIONS = ["until_deleted", "365_days", "180_days", "90_days"] as const;
export type RetentionOption = (typeof RETENTION_OPTIONS)[number];

export const RESOURCE_CATEGORIES = ["craft", "structure", "reflection", "prompt", "language", "integrity", "process"] as const;
export const LICENSE_STATUSES = ["original", "licensed", "public_link"] as const;
export const RESOURCE_ACCESS = ["public", "authenticated", "restricted"] as const;
export const RESOURCE_COLLECTIONS = ["original", "licensed", "external_links"] as const;

export const SENTENCE_MODES = ["clearer", "concise", "grammar", "explain_awkward", "preserve_voice", "no_new_facts", "translate"] as const;
export type SentenceMode = (typeof SENTENCE_MODES)[number];
