import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { planningRun, studentProfile } from "@/db/schema";
import { EMPTY_PROFILE, profileSchema, type StudentProfile } from "@/lib/planning";
import { decryptJson, encryptJson } from "../crypto";
import { ApiError } from "../errors";

/** The student's profile, decrypted. Returns an empty profile if none has been saved. */
export async function getProfile(userId: string): Promise<StudentProfile> {
  const [row] = await db.select().from(studentProfile).where(eq(studentProfile.userId, userId)).limit(1);
  if (!row) return structuredClone(EMPTY_PROFILE);
  const parsed = profileSchema.safeParse(decryptJson(row.encryptedData, "student_profile"));
  return parsed.success ? parsed.data : structuredClone(EMPTY_PROFILE);
}

export async function saveProfile(userId: string, input: unknown): Promise<StudentProfile> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ApiError(400, "validation_failed", { field: issue?.path.join(".") || "profile", reason: issue?.code ?? "invalid" });
  }
  const encrypted = encryptJson(parsed.data, "student_profile");
  await db
    .insert(studentProfile)
    .values({ userId, encryptedData: encrypted })
    .onConflictDoUpdate({ target: studentProfile.userId, set: { encryptedData: encrypted, updatedAt: new Date() } });
  return parsed.data;
}

export async function hasProfile(userId: string) {
  const [row] = await db.select({ userId: studentProfile.userId }).from(studentProfile).where(eq(studentProfile.userId, userId)).limit(1);
  return Boolean(row);
}

/* ------------------------------ planning AI runs ------------------------------ */

export function createPlanningRun(values: {
  userId: string;
  kind: string;
  feedbackLanguage: string;
  provider: string;
  modelName: string;
  promptVersion: string;
  schemaVersion: string;
  redactionCount: number;
}, exec: Pick<typeof db, "insert"> = db) {
  return exec.insert(planningRun).values({ ...values, status: "pending" }).returning().get();
}

export async function completePlanningRun(runId: string, result: unknown | null, modelName: string, usage?: { inputTokens: number; outputTokens: number } | null, costMicroUsd?: number | null) {
  await db
    .update(planningRun)
    .set({
      status: "completed",
      inputTokens: usage?.inputTokens ?? null,
      outputTokens: usage?.outputTokens ?? null,
      costMicroUsd: costMicroUsd ?? null,
      modelName,
      encryptedStructuredResult: result === null ? null : encryptJson(result, "planning_result"),
      completedAt: new Date(),
    })
    .where(eq(planningRun.id, runId));
}

export async function failPlanningRun(runId: string, errorCode: string, usage?: { inputTokens: number; outputTokens: number } | null, costMicroUsd?: number | null) {
  await db
    .update(planningRun)
    .set({ status: "failed", errorCode, completedAt: new Date(), inputTokens: usage?.inputTokens ?? null, outputTokens: usage?.outputTokens ?? null, costMicroUsd: costMicroUsd ?? null })
    .where(eq(planningRun.id, runId));
}

type PlanningRunRow = typeof planningRun.$inferSelect;
const planningRunView = (r: PlanningRunRow) => ({
  id: r.id,
  kind: r.kind,
  status: r.status,
  errorCode: r.errorCode,
  provider: r.provider,
  modelName: r.modelName,
  promptVersion: r.promptVersion,
  feedbackLanguage: r.feedbackLanguage,
  createdAt: r.createdAt,
  completedAt: r.completedAt,
  result: r.encryptedStructuredResult ? decryptJson(r.encryptedStructuredResult, "planning_result") : null,
});

export const PLANNING_PAGE_SIZE = 20;

/**
 * One page of a student's planning runs, newest first. `cursor` is the `nextCursor` (a run id) of
 * the previous page; keyset on (created_at, id), so pages never skip or repeat rows as runs are added.
 */
export async function listPlanningRuns(userId: string, kind: string, opts: { cursor?: string | null; limit?: number } = {}) {
  const limit = Math.min(Math.max(opts.limit ?? PLANNING_PAGE_SIZE, 1), 100);
  if (opts.cursor && !/^[0-9a-f-]{36}$/.test(opts.cursor)) throw new ApiError(400, "validation_failed", { field: "cursor", reason: "invalid" });
  // Compare against the cursor row's own stored timestamp in SQL.
  const afterCursor = opts.cursor
    ? sql`(${planningRun.createdAt}, ${planningRun.id}) < (select pr.created_at, pr.id from planning_run pr where pr.id = ${opts.cursor} and pr.user_id = ${userId})`
    : undefined;
  const rows = await db
    .select()
    .from(planningRun)
    .where(and(eq(planningRun.userId, userId), eq(planningRun.kind, kind), afterCursor))
    .orderBy(desc(planningRun.createdAt), desc(planningRun.id))
    .limit(limit + 1);
  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  return {
    runs: page.map(planningRunView),
    nextCursor: rows.length > limit && last ? last.id : null,
  };
}

/** Every planning run of every kind, for the account export. Not capped. */
export async function listAllPlanningRuns(userId: string) {
  const rows = await db.select().from(planningRun).where(eq(planningRun.userId, userId)).orderBy(asc(planningRun.createdAt), asc(planningRun.id));
  return rows.map(planningRunView);
}

export async function deletePlanningRun(userId: string, runId: string) {
  const removed = await db
    .delete(planningRun)
    .where(and(eq(planningRun.id, runId), eq(planningRun.userId, userId)))
    .returning({ id: planningRun.id });
  if (!removed.length) throw new ApiError(404, "not_found");
}

/** Owned, completed research only; results contain applicant-specific connections. */
export async function getResearchRun(userId: string, runId: string) {
  const [row] = await db.select().from(planningRun).where(and(eq(planningRun.id, runId), eq(planningRun.userId, userId), eq(planningRun.kind, "school_research"), eq(planningRun.status, "completed"))).limit(1);
  return row ? planningRunView(row) : null;
}
