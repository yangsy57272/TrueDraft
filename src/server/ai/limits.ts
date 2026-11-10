import "server-only";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { essay, feedbackRun, planningRun } from "@/db/schema";
import { ApiError } from "../errors";
import { logger } from "../logger";
import { aiLimitSettings } from "./limit-rules";

export { aiLimitSettings, costMicroUsd, inputHash, type AiLimitSettings } from "./limit-rules";

/*
 * Operational limits for AI calls:
 * - concurrency: at most N runs in flight per student (default 1), enforced inside a write transaction;
 * - deduplication: an identical request for the same saved version reuses the recent result;
 * - usage and spend: provider-reported tokens are recorded per run, with an optional daily
 *   ceiling on tokens or estimated cost across the whole deployment;
 * - recovery: runs left "pending" by a crash or restart are marked failed after the longest time a
 *   real run could take.
 */

/** Mark runs stuck in "pending" as failed (ai_interrupted). Scoped to one student when given. */
export async function recoverStuckRuns(userId?: string, settings = aiLimitSettings()) {
  const cutoff = new Date(Date.now() - settings.stuckAfterMs);
  const now = new Date();
  const feedback = await db
    .update(feedbackRun)
    .set({ status: "failed", errorCode: "ai_interrupted", completedAt: now })
    .where(
      and(
        eq(feedbackRun.status, "pending"),
        lt(feedbackRun.createdAt, cutoff),
        userId ? sql`${feedbackRun.essayId} in (select e.id from essay e where e.user_id = ${userId})` : undefined,
      ),
    )
    .returning({ id: feedbackRun.id });
  const planning = await db
    .update(planningRun)
    .set({ status: "failed", errorCode: "ai_interrupted", completedAt: now })
    .where(and(eq(planningRun.status, "pending"), lt(planningRun.createdAt, cutoff), userId ? eq(planningRun.userId, userId) : undefined))
    .returning({ id: planningRun.id });
  const count = feedback.length + planning.length;
  if (count) logger.warn("ai.stuck_runs_recovered", { count });
  return count;
}

/** Tokens and estimated spend since 00:00 UTC across the deployment. */
export async function usageToday() {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const sum = async (table: typeof feedbackRun | typeof planningRun) => {
    const [row] = await db
      .select({
        tokens: sql<number>`coalesce(sum(coalesce(${table.inputTokens}, 0) + coalesce(${table.outputTokens}, 0)), 0)`,
        cost: sql<number>`coalesce(sum(${table.costMicroUsd}), 0)`,
        runs: sql<number>`count(*)`,
      })
      .from(table)
      .where(gte(table.createdAt, since));
    return { tokens: Number(row.tokens), cost: Number(row.cost), runs: Number(row.runs) };
  };
  const [a, b] = await Promise.all([sum(feedbackRun), sum(planningRun)]);
  return { tokens: a.tokens + b.tokens, costMicroUsd: a.cost + b.cost, runs: a.runs + b.runs, since };
}

/**
 * Refuse new runs once today's ceiling is reached. The check happens before each run, so runs
 * already in flight can overshoot by at most their own usage.
 */
export async function assertWithinBudget(settings = aiLimitSettings()) {
  if (settings.dailyBudgetUsd == null && settings.dailyTokenBudget == null) return;
  const today = await usageToday();
  const overCost = settings.dailyBudgetUsd != null && today.costMicroUsd >= settings.dailyBudgetUsd * 1_000_000;
  const overTokens = settings.dailyTokenBudget != null && today.tokens >= settings.dailyTokenBudget;
  if (overCost || overTokens) {
    logger.warn("ai.daily_budget_reached", { count: today.runs });
    throw new ApiError(503, "ai_budget_reached");
  }
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Count and insert in the same SQLite write transaction so concurrent runs cannot share a slot.
 */
export async function withRunSlot<T>(userId: string, insert: (tx: Tx) => T, settings = aiLimitSettings()): Promise<T> {
  await recoverStuckRuns(userId, settings);
  return db.transaction((tx) => {
    const [{ pending }] = tx.all<{ pending: number }>(sql`
      select (
        (select count(*) from ${feedbackRun} fr join ${essay} e on e.id = fr.essay_id where e.user_id = ${userId} and fr.status = 'pending')
        + (select count(*) from ${planningRun} pr where pr.user_id = ${userId} and pr.status = 'pending')
      ) as pending`);
    if (pending >= settings.maxConcurrentPerUser) throw new ApiError(409, "ai_run_in_progress");
    return insert(tx);
  }, { behavior: "immediate" });
}
