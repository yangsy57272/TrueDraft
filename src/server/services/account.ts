import "server-only";
import { and, asc, eq, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { brainstormNote, essay, essayVersion, feedbackRun, privacySettings, user } from "@/db/schema";
import { isFeedbackLanguage, isLocale } from "@/i18n/config";
import { decryptJson, decryptText } from "../crypto";
import { ApiError } from "../errors";
import { recordAudit } from "./audit";
import { listConsents } from "./consent";

import { RETENTION_OPTIONS, type RetentionOption } from "@/lib/constants";
export { RETENTION_OPTIONS };

const RETENTION_DAYS: Record<RetentionOption, number | null> = {
  until_deleted: null,
  "365_days": 365,
  "180_days": 180,
  "90_days": 90,
};

export async function updatePreferences(
  userId: string,
  prefs: { preferredLanguage?: string; feedbackLanguage?: string; displayName?: string },
) {
  const values: Partial<typeof user.$inferInsert> = {};
  if (prefs.preferredLanguage !== undefined) {
    if (!isLocale(prefs.preferredLanguage)) throw new ApiError(400, "validation_failed");
    values.preferredLanguage = prefs.preferredLanguage;
  }
  if (prefs.feedbackLanguage !== undefined) {
    if (!isFeedbackLanguage(prefs.feedbackLanguage)) throw new ApiError(400, "validation_failed");
    values.feedbackLanguage = prefs.feedbackLanguage;
  }
  if (prefs.displayName !== undefined) values.name = prefs.displayName.trim().slice(0, 60);
  if (Object.keys(values).length) await db.update(user).set(values).where(eq(user.id, userId));
}

export async function getPrivacySettings(userId: string) {
  const [row] = await db.select().from(privacySettings).where(eq(privacySettings.userId, userId)).limit(1);
  if (row) return row;
  const [created] = await db.insert(privacySettings).values({ userId }).onConflictDoNothing().returning();
  return created ?? (await db.select().from(privacySettings).where(eq(privacySettings.userId, userId)))[0];
}

export async function setRetention(userId: string, retention: RetentionOption) {
  await getPrivacySettings(userId);
  await db.update(privacySettings).set({ retentionPreference: retention }).where(eq(privacySettings.userId, userId));
  await recordAudit(userId, "retention_changed", { retention });
  // Apply immediately so the setting means what it says.
  return purgeExpiredEssays({ userId });
}

/**
 * Delete essays that have not been edited within the owner's retention window.
 * Runs for one user (on dashboard load / settings change) or for everyone (scheduled job).
 */
export async function purgeExpiredEssays(options: { userId?: string; now?: Date } = {}) {
  const now = options.now ?? new Date();
  let deleted = 0;
  for (const option of RETENTION_OPTIONS) {
    const days = RETENTION_DAYS[option];
    if (days === null) continue;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const owners = db
      .select({ userId: privacySettings.userId })
      .from(privacySettings)
      .where(
        options.userId
          ? and(eq(privacySettings.retentionPreference, option), eq(privacySettings.userId, options.userId))
          : eq(privacySettings.retentionPreference, option),
      );
    const removed = await db
      .delete(essay)
      .where(and(inArray(essay.userId, owners), lt(essay.updatedAt, cutoff)))
      .returning({ id: essay.id, userId: essay.userId });
    deleted += removed.length;
    for (const r of removed) await recordAudit(r.userId, "retention_purge", { essayId: r.id });
  }
  return deleted;
}

/** Everything we hold about a student, decrypted, as a portable JSON document. */
export async function exportUserData(userId: string) {
  const [profile] = await db.select().from(user).where(eq(user.id, userId)).limit(1);
  if (!profile) throw new ApiError(404, "not_found");
  const settings = await getPrivacySettings(userId);
  const consents = await listConsents(userId);
  const essays = await db.select().from(essay).where(eq(essay.userId, userId)).orderBy(asc(essay.createdAt));
  const essayIds = essays.map((e) => e.id);
  const versions = essayIds.length
    ? await db.select().from(essayVersion).where(inArray(essayVersion.essayId, essayIds)).orderBy(asc(essayVersion.versionNumber))
    : [];
  const runs = essayIds.length
    ? await db.select().from(feedbackRun).where(inArray(feedbackRun.essayId, essayIds)).orderBy(asc(feedbackRun.createdAt))
    : [];
  const notes = essayIds.length
    ? await db.select().from(brainstormNote).where(inArray(brainstormNote.essayId, essayIds))
    : [];

  await recordAudit(userId, "data_exported");

  return {
    exportedAt: new Date().toISOString(),
    format: "truedraft-export/v1",
    account: {
      email: profile.email,
      displayName: profile.name || null,
      preferredLanguage: profile.preferredLanguage,
      feedbackLanguage: profile.feedbackLanguage,
      createdAt: profile.createdAt,
    },
    privacySettings: {
      retentionPreference: settings.retentionPreference,
      optionalConsents: settings.optionalConsents,
    },
    consents,
    essays: essays.map((e) => ({
      id: e.id,
      title: e.title,
      applicationType: e.applicationType,
      prompt: e.promptText,
      targetSchool: e.targetSchool,
      wordLimit: e.wordLimit,
      status: e.status,
      feedbackLanguage: e.feedbackLanguage,
      focusAreas: e.focusAreas,
      context: e.encryptedContext ? decryptText(e.encryptedContext, "essay_context") : null,
      currentDraft: decryptText(e.encryptedDraft, "essay_draft"),
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
      versions: versions
        .filter((v) => v.essayId === e.id)
        .map((v) => ({
          versionNumber: v.versionNumber,
          note: v.versionNote,
          wordCount: v.wordCount,
          createdAt: v.createdAt,
          content: decryptText(v.encryptedContent, "essay_version"),
        })),
      feedback: runs
        .filter((r) => r.essayId === e.id)
        .map((r) => ({
          id: r.id,
          kind: r.kind,
          status: r.status,
          language: r.feedbackLanguage,
          model: r.modelName,
          promptVersion: r.promptVersion,
          createdAt: r.createdAt,
          request: r.encryptedRequest ? decryptJson(r.encryptedRequest, "feedback_request") : null,
          result: r.encryptedStructuredResult ? decryptJson(r.encryptedStructuredResult, "feedback_result") : null,
        })),
      brainstormNotes: notes
        .filter((n) => n.essayId === e.id)
        .map((n) => ({ createdAt: n.createdAt, content: decryptJson(n.encryptedContent, "brainstorm_note") })),
    })),
  };
}

/**
 * Permanently delete the account. Essays, versions, feedback, notes, sessions, consents, and
 * settings are removed by foreign-key cascade in the same statement. Audit events keep no user
 * link afterwards (ON DELETE SET NULL) and never contained essay content.
 */
export async function deleteAccount(userId: string) {
  const [{ essays }] = await db
    .select({ essays: sql<number>`count(*)::int` })
    .from(essay)
    .where(eq(essay.userId, userId));
  const deleted = await db.delete(user).where(eq(user.id, userId)).returning({ id: user.id });
  if (deleted.length === 0) throw new ApiError(404, "not_found");
  await recordAudit(null, "account_deleted", { essaysRemoved: essays });
}

/** Admin-safe aggregate metrics. Counts only; no content, titles, or emails. */
export async function getAggregateMetrics() {
  const [row] = await db.execute<{
    users: number;
    essays: number;
    versions: number;
    feedback_completed: number;
    feedback_failed: number;
  }>(sql`select
      (select count(*)::int from "user") as users,
      (select count(*)::int from essay) as essays,
      (select count(*)::int from essay_version) as versions,
      (select count(*)::int from feedback_run where status = 'completed') as feedback_completed,
      (select count(*)::int from feedback_run where status = 'failed') as feedback_failed`).then((r) => r.rows);
  return row;
}


