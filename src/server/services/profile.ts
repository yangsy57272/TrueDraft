import "server-only";
import { and, desc, eq } from "drizzle-orm";
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

export async function createPlanningRun(values: {
  userId: string;
  kind: string;
  feedbackLanguage: string;
  provider: string;
  modelName: string;
  promptVersion: string;
  schemaVersion: string;
  redactionCount: number;
}) {
  const [row] = await db.insert(planningRun).values({ ...values, status: "pending" }).returning();
  return row;
}

export async function completePlanningRun(runId: string, result: unknown | null, modelName: string) {
  await db
    .update(planningRun)
    .set({
      status: "completed",
      modelName,
      encryptedStructuredResult: result === null ? null : encryptJson(result, "planning_result"),
      completedAt: new Date(),
    })
    .where(eq(planningRun.id, runId));
}

export async function failPlanningRun(runId: string, errorCode: string) {
  await db.update(planningRun).set({ status: "failed", errorCode, completedAt: new Date() }).where(eq(planningRun.id, runId));
}

export async function listPlanningRuns(userId: string, kind: string) {
  const rows = await db
    .select()
    .from(planningRun)
    .where(and(eq(planningRun.userId, userId), eq(planningRun.kind, kind)))
    .orderBy(desc(planningRun.createdAt))
    .limit(20);
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    status: r.status,
    errorCode: r.errorCode,
    provider: r.provider,
    modelName: r.modelName,
    promptVersion: r.promptVersion,
    feedbackLanguage: r.feedbackLanguage,
    createdAt: r.createdAt,
    result: r.encryptedStructuredResult ? decryptJson(r.encryptedStructuredResult, "planning_result") : null,
  }));
}

export async function deletePlanningRun(userId: string, runId: string) {
  const removed = await db
    .delete(planningRun)
    .where(and(eq(planningRun.id, runId), eq(planningRun.userId, userId)))
    .returning({ id: planningRun.id });
  if (!removed.length) throw new ApiError(404, "not_found");
}
