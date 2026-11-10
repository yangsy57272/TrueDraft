import "server-only";
import { and, desc, eq, gte, sql } from "drizzle-orm";
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

export function createPendingRun(values: {
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
  inputHash?: string | null;
}, exec: Pick<typeof db, "insert"> = db) {
  const row = exec
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
      inputHash: values.inputHash ?? null,
      status: "pending",
    })
    .returning().get();
  return row;
}

/** `result` is null for ephemeral tools, whose output is shown once and never stored. */
export async function completeRun(
  runId: string,
  result: unknown | null,
  modelName: string,
  providerRef: string | null,
  usage?: { inputTokens: number; outputTokens: number } | null,
  costMicroUsd?: number | null,
) {
  await db
    .update(feedbackRun)
    .set({
      status: "completed",
      inputTokens: usage?.inputTokens ?? null,
      outputTokens: usage?.outputTokens ?? null,
      costMicroUsd: costMicroUsd ?? null,
      encryptedStructuredResult: result == null ? null : encryptJson(result, "feedback_result"),
      modelName,
      providerRequestReference: providerRef,
      completedAt: new Date(),
    })
    .where(eq(feedbackRun.id, runId));
}

export async function failRun(runId: string, errorCode: string, usage?: { inputTokens: number; outputTokens: number } | null, costMicroUsd?: number | null) {
  await db
    .update(feedbackRun)
    .set({ status: "failed", errorCode, completedAt: new Date(), inputTokens: usage?.inputTokens ?? null, outputTokens: usage?.outputTokens ?? null, costMicroUsd: costMicroUsd ?? null })
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
    taskStates: row.taskStates,
    createdAt: row.createdAt,
    completedAt: row.completedAt,
    request: row.encryptedRequest ? decryptJson(row.encryptedRequest, "feedback_request") : null,
    result: row.encryptedStructuredResult ? decryptJson<T>(row.encryptedStructuredResult, "feedback_result") : null,
  };
}

/** A completed run for exactly the same input, recent enough to reuse instead of calling the AI again. */
export async function getReusableRun(essayId: string, hash: string, since: Date) {
  const [row] = await db
    .select()
    .from(feedbackRun)
    .where(and(eq(feedbackRun.essayId, essayId), eq(feedbackRun.inputHash, hash), eq(feedbackRun.status, "completed"), gte(feedbackRun.createdAt, since)))
    .orderBy(desc(feedbackRun.createdAt))
    .limit(1);
  if (!row?.encryptedStructuredResult) return null;
  return { id: row.id, redactionCount: row.redactionCount, result: decryptJson(row.encryptedStructuredResult, "feedback_result") };
}

export const TASK_STATES = ["todo", "doing", "done"] as const;
export type TaskState = (typeof TASK_STATES)[number];

/** Set one revision task's state. A single atomic JSON update, so concurrent clicks don't collide. */
export async function setTaskState(userId: string, essayId: string, runId: string, index: number, state: TaskState) {
  await assertOwnedEssay(userId, essayId);
  const [row] = await db
    .select({ result: feedbackRun.encryptedStructuredResult, kind: feedbackRun.kind })
    .from(feedbackRun)
    .where(and(eq(feedbackRun.id, runId), eq(feedbackRun.essayId, essayId)))
    .limit(1);
  if (!row || row.kind !== "full_feedback" || !row.result) throw new ApiError(404, "not_found");
  const plan = (decryptJson<{ revision_plan?: unknown[] }>(row.result, "feedback_result").revision_plan ?? []).length;
  if (index < 0 || index >= plan) throw new ApiError(404, "not_found");
  const [updated] = await db
    .update(feedbackRun)
    .set({ taskStates: sql`json_set(${feedbackRun.taskStates}, ${`$."${index}"`}, ${state})` })
    .where(and(eq(feedbackRun.id, runId), eq(feedbackRun.essayId, essayId)))
    .returning({ taskStates: feedbackRun.taskStates });
  return updated.taskStates;
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
