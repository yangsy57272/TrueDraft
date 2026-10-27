import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { feedbackRun } from "@/db/schema";
import { decryptJson, encryptJson } from "../crypto";
import { ApiError } from "../errors";
import { assertOwnedEssay } from "./essays";
import { recordAudit } from "./audit";

export const FEEDBACK_KINDS = [
  "full_feedback",
  "prompt_decoder",
  "sentence",
  "word_count",
  "final_read",
  "brainstorm",
] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export async function createPendingRun(values: {
  essayId: string;
  essayVersionId: string | null;
  kind: FeedbackKind;
  requestedFeedbackTypes: string[];
  feedbackLanguage: string;
  provider: string;
  modelName: string;
  promptVersion: string;
  schemaVersion: string;
  request: unknown | null;
  redactionCount: number;
}) {
  const [row] = await db
    .insert(feedbackRun)
    .values({
      essayId: values.essayId,
      essayVersionId: values.essayVersionId,
      kind: values.kind,
      requestedFeedbackTypes: values.requestedFeedbackTypes,
      feedbackLanguage: values.feedbackLanguage,
      provider: values.provider,
      modelName: values.modelName,
      promptVersion: values.promptVersion,
      schemaVersion: values.schemaVersion,
      encryptedRequest: values.request === null ? null : encryptJson(values.request, "feedback_request"),
      redactionCount: values.redactionCount,
      status: "pending",
    })
    .returning();
  return row;
}

export async function completeRun(runId: string, result: unknown, modelName: string, providerRef: string | null) {
  await db
    .update(feedbackRun)
    .set({
      status: "completed",
      encryptedStructuredResult: encryptJson(result, "feedback_result"),
      modelName,
      providerRequestReference: providerRef,
      completedAt: new Date(),
    })
    .where(eq(feedbackRun.id, runId));
}

export async function failRun(runId: string, errorCode: string) {
  await db
    .update(feedbackRun)
    .set({ status: "failed", errorCode, completedAt: new Date() })
    .where(eq(feedbackRun.id, runId));
}

export async function listRuns(userId: string, essayId: string, kind?: FeedbackKind) {
  await assertOwnedEssay(userId, essayId);
  return db
    .select({
      id: feedbackRun.id,
      kind: feedbackRun.kind,
      status: feedbackRun.status,
      errorCode: feedbackRun.errorCode,
      essayVersionId: feedbackRun.essayVersionId,
      feedbackLanguage: feedbackRun.feedbackLanguage,
      provider: feedbackRun.provider,
      modelName: feedbackRun.modelName,
      promptVersion: feedbackRun.promptVersion,
      createdAt: feedbackRun.createdAt,
      completedAt: feedbackRun.completedAt,
    })
    .from(feedbackRun)
    .where(kind ? and(eq(feedbackRun.essayId, essayId), eq(feedbackRun.kind, kind)) : eq(feedbackRun.essayId, essayId))
    .orderBy(desc(feedbackRun.createdAt));
}

export async function getRun<T = unknown>(userId: string, essayId: string, runId: string) {
  await assertOwnedEssay(userId, essayId);
  const [row] = await db
    .select()
    .from(feedbackRun)
    .where(and(eq(feedbackRun.id, runId), eq(feedbackRun.essayId, essayId)))
    .limit(1);
  if (!row) throw new ApiError(404, "not_found");
  return {
    id: row.id,
    kind: row.kind as FeedbackKind,
    status: row.status,
    errorCode: row.errorCode,
    essayVersionId: row.essayVersionId,
    feedbackLanguage: row.feedbackLanguage,
    provider: row.provider,
    modelName: row.modelName,
    promptVersion: row.promptVersion,
    redactionCount: row.redactionCount,
    createdAt: row.createdAt,
    completedAt: row.completedAt,
    request: row.encryptedRequest ? decryptJson(row.encryptedRequest, "feedback_request") : null,
    result: row.encryptedStructuredResult ? decryptJson<T>(row.encryptedStructuredResult, "feedback_result") : null,
  };
}

export async function deleteRun(userId: string, essayId: string, runId: string) {
  await assertOwnedEssay(userId, essayId);
  const removed = await db
    .delete(feedbackRun)
    .where(and(eq(feedbackRun.id, runId), eq(feedbackRun.essayId, essayId)))
    .returning({ id: feedbackRun.id });
  if (removed.length === 0) throw new ApiError(404, "not_found");
  await recordAudit(userId, "feedback_deleted", { essayId, count: 1 });
}

export async function deleteAllRuns(userId: string, essayId: string) {
  await assertOwnedEssay(userId, essayId);
  const removed = await db.delete(feedbackRun).where(eq(feedbackRun.essayId, essayId)).returning({ id: feedbackRun.id });
  await recordAudit(userId, "feedback_deleted", { essayId, count: removed.length });
  return removed.length;
}
