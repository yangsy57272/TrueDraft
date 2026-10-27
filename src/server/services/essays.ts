import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { essay, essayVersion, feedbackRun } from "@/db/schema";
import { limits } from "@/config/deployment";
import { countWords } from "@/lib/wordcount";
import { decryptText, encryptText } from "../crypto";
import { ApiError } from "../errors";
import { recordAudit } from "./audit";

/*
 * Every function here takes the acting user's id and scopes all queries by it. A missing or
 * foreign essay is reported as "not found" so ids cannot be probed.
 */

export { APPLICATION_TYPES, ESSAY_STATUSES, FOCUS_AREAS } from "@/lib/constants";
import type { ApplicationType, EssayStatus } from "@/lib/constants";

export type EssayInput = {
  title: string;
  applicationType: ApplicationType;
  promptText: string;
  targetSchool?: string | null;
  wordLimit?: number | null;
  draft: string;
  feedbackLanguage: string;
  focusAreas: string[];
  context?: string | null;
};

export async function assertOwnedEssay(userId: string, essayId: string) {
  const [row] = await db
    .select()
    .from(essay)
    .where(and(eq(essay.id, essayId), eq(essay.userId, userId)))
    .limit(1);
  if (!row) throw new ApiError(404, "not_found");
  return row;
}

export async function createEssay(userId: string, input: EssayInput) {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(essay)
    .where(eq(essay.userId, userId));
  if (count >= limits.maxEssaysPerUser) throw new ApiError(409, "too_many_essays");

  const wordCount = countWords(input.draft);
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(essay)
      .values({
        userId,
        title: input.title,
        applicationType: input.applicationType,
        promptText: input.promptText,
        targetSchool: input.targetSchool || null,
        wordLimit: input.wordLimit ?? null,
        feedbackLanguage: input.feedbackLanguage,
        focusAreas: input.focusAreas,
        encryptedContext: input.context ? encryptText(input.context, "essay_context") : null,
        encryptedDraft: encryptText(input.draft, "essay_draft"),
        draftWordCount: wordCount,
      })
      .returning();
    if (input.draft.trim()) {
      await tx.insert(essayVersion).values({
        essayId: created.id,
        versionNumber: 1,
        encryptedContent: encryptText(input.draft, "essay_version"),
        wordCount,
        versionNote: null,
      });
    }
    return created;
  });
}

export async function listEssays(userId: string) {
  const rows = await db
    .select({
      id: essay.id,
      title: essay.title,
      applicationType: essay.applicationType,
      targetSchool: essay.targetSchool,
      wordLimit: essay.wordLimit,
      draftWordCount: essay.draftWordCount,
      status: essay.status,
      updatedAt: essay.updatedAt,
      // Correlated subqueries use explicit aliases: unqualified column names would bind to the inner table.
      versionCount: sql<number>`(select count(*)::int from essay_version ev where ev.essay_id = "essay"."id")`,
      latestFeedbackId: sql<string | null>`(select fr.id from feedback_run fr where fr.essay_id = "essay"."id" and fr.kind = 'full_feedback' and fr.status = 'completed' order by fr.created_at desc limit 1)`,
    })
    .from(essay)
    .where(eq(essay.userId, userId))
    .orderBy(desc(essay.updatedAt));
  return rows;
}

export async function getEssay(userId: string, essayId: string) {
  const row = await assertOwnedEssay(userId, essayId);
  return {
    id: row.id,
    title: row.title,
    applicationType: row.applicationType,
    promptText: row.promptText,
    targetSchool: row.targetSchool,
    wordLimit: row.wordLimit,
    status: row.status,
    feedbackLanguage: row.feedbackLanguage,
    focusAreas: row.focusAreas,
    context: row.encryptedContext ? decryptText(row.encryptedContext, "essay_context") : "",
    draft: decryptText(row.encryptedDraft, "essay_draft"),
    draftWordCount: row.draftWordCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
export type EssayDetail = Awaited<ReturnType<typeof getEssay>>;

export type EssayMetaPatch = Partial<Omit<EssayInput, "draft">> & { status?: EssayStatus };

export async function updateEssayMeta(userId: string, essayId: string, patch: EssayMetaPatch) {
  await assertOwnedEssay(userId, essayId);
  const values: Partial<typeof essay.$inferInsert> = {};
  if (patch.title !== undefined) values.title = patch.title;
  if (patch.applicationType !== undefined) values.applicationType = patch.applicationType;
  if (patch.promptText !== undefined) values.promptText = patch.promptText;
  if (patch.targetSchool !== undefined) values.targetSchool = patch.targetSchool || null;
  if (patch.wordLimit !== undefined) values.wordLimit = patch.wordLimit;
  if (patch.feedbackLanguage !== undefined) values.feedbackLanguage = patch.feedbackLanguage;
  if (patch.focusAreas !== undefined) values.focusAreas = patch.focusAreas;
  if (patch.status !== undefined) values.status = patch.status;
  if (patch.context !== undefined) {
    values.encryptedContext = patch.context ? encryptText(patch.context, "essay_context") : null;
  }
  if (Object.keys(values).length === 0) return;
  await db
    .update(essay)
    .set(values)
    .where(and(eq(essay.id, essayId), eq(essay.userId, userId)));
}

/** Autosave the working draft. Never touches saved versions. */
export async function autosaveDraft(userId: string, essayId: string, draft: string) {
  const wordCount = countWords(draft);
  const result = await db
    .update(essay)
    .set({ encryptedDraft: encryptText(draft, "essay_draft"), draftWordCount: wordCount })
    .where(and(eq(essay.id, essayId), eq(essay.userId, userId)))
    .returning({ updatedAt: essay.updatedAt });
  if (result.length === 0) throw new ApiError(404, "not_found");
  return { wordCount, savedAt: result[0].updatedAt };
}

/**
 * Save an immutable snapshot. Version numbers are allocated while holding a row lock on the
 * essay so concurrent saves can't collide; older versions are never overwritten.
 */
export async function saveVersion(userId: string, essayId: string, content: string, note: string | null) {
  return db.transaction(async (tx) => {
    const locked = await tx
      .select({ id: essay.id })
      .from(essay)
      .where(and(eq(essay.id, essayId), eq(essay.userId, userId)))
      .for("update");
    if (locked.length === 0) throw new ApiError(404, "not_found");

    const [{ maxVersion, total }] = await tx
      .select({
        maxVersion: sql<number>`coalesce(max(${essayVersion.versionNumber}), 0)::int`,
        total: sql<number>`count(*)::int`,
      })
      .from(essayVersion)
      .where(eq(essayVersion.essayId, essayId));
    if (total >= limits.maxVersionsPerEssay) throw new ApiError(409, "too_many_versions");

    const wordCount = countWords(content);
    const [version] = await tx
      .insert(essayVersion)
      .values({
        essayId,
        versionNumber: maxVersion + 1,
        encryptedContent: encryptText(content, "essay_version"),
        wordCount,
        versionNote: note || null,
      })
      .returning();
    await tx
      .update(essay)
      .set({ encryptedDraft: encryptText(content, "essay_draft"), draftWordCount: wordCount })
      .where(eq(essay.id, essayId));
    return version;
  });
}

export async function listVersions(userId: string, essayId: string) {
  await assertOwnedEssay(userId, essayId);
  return db
    .select({
      id: essayVersion.id,
      versionNumber: essayVersion.versionNumber,
      wordCount: essayVersion.wordCount,
      versionNote: essayVersion.versionNote,
      createdAt: essayVersion.createdAt,
    })
    .from(essayVersion)
    .where(eq(essayVersion.essayId, essayId))
    .orderBy(desc(essayVersion.versionNumber));
}

export async function getVersion(userId: string, essayId: string, versionNumber: number) {
  await assertOwnedEssay(userId, essayId);
  const [row] = await db
    .select()
    .from(essayVersion)
    .where(and(eq(essayVersion.essayId, essayId), eq(essayVersion.versionNumber, versionNumber)))
    .limit(1);
  if (!row) throw new ApiError(404, "not_found");
  return { ...row, content: decryptText(row.encryptedContent, "essay_version") };
}

export async function getVersionById(userId: string, essayId: string, versionId: string) {
  await assertOwnedEssay(userId, essayId);
  const [row] = await db
    .select()
    .from(essayVersion)
    .where(and(eq(essayVersion.essayId, essayId), eq(essayVersion.id, versionId)))
    .limit(1);
  if (!row) throw new ApiError(404, "not_found");
  return { ...row, content: decryptText(row.encryptedContent, "essay_version") };
}

/** The newest saved version if it matches the current draft, otherwise null. */
export async function latestVersionMatching(essayId: string, draft: string) {
  const [latest] = await db
    .select()
    .from(essayVersion)
    .where(eq(essayVersion.essayId, essayId))
    .orderBy(desc(essayVersion.versionNumber))
    .limit(1);
  if (!latest) return null;
  return decryptText(latest.encryptedContent, "essay_version") === draft ? latest : null;
}

export async function duplicateEssay(userId: string, essayId: string, copyPrefix: string) {
  const source = await getEssay(userId, essayId);
  const copy = await createEssay(userId, {
    title: `${copyPrefix} ${source.title}`.slice(0, limits.maxTitleChars),
    applicationType: source.applicationType as EssayInput["applicationType"],
    promptText: source.promptText,
    targetSchool: source.targetSchool,
    wordLimit: source.wordLimit,
    draft: source.draft,
    feedbackLanguage: source.feedbackLanguage,
    focusAreas: source.focusAreas,
    context: source.context || null,
  });
  await recordAudit(userId, "essay_duplicated", { essayId: copy.id });
  return copy;
}

/** Permanently delete an essay with all versions, feedback, and brainstorming notes (FK cascade). */
export async function deleteEssay(userId: string, essayId: string) {
  const deleted = await db
    .delete(essay)
    .where(and(eq(essay.id, essayId), eq(essay.userId, userId)))
    .returning({ id: essay.id });
  if (deleted.length === 0) throw new ApiError(404, "not_found");
  await recordAudit(userId, "essay_deleted", { essayId });
}
