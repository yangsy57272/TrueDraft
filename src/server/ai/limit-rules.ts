import { createHmac } from "node:crypto";
import { aiSettings, type TokenUsage } from "./provider";

/* Pure limit rules (no database), shared by the server and unit tests. */

type Env = Record<string, string | undefined>;
const num = (v: string | undefined) => (v === undefined || v.trim() === "" || Number.isNaN(Number(v)) ? null : Number(v));

export function aiLimitSettings(env: Env = process.env) {
  const { timeoutMs, maxRetries } = aiSettings();
  const backoffMs = Array.from({ length: maxRetries }, (_, i) => 1000 * 2 ** i).reduce((a, b) => a + b, 0);
  return {
    maxConcurrentPerUser: Math.max(1, num(env.AI_MAX_CONCURRENT_PER_USER) ?? 1),
    dedupWindowHours: Math.max(0, num(env.AI_DEDUP_WINDOW_HOURS) ?? 24),
    dailyBudgetUsd: num(env.AI_DAILY_BUDGET_USD),
    dailyTokenBudget: num(env.AI_DAILY_TOKEN_BUDGET),
    priceInputPerMTokUsd: num(env.AI_PRICE_INPUT_PER_MTOK_USD),
    priceOutputPerMTokUsd: num(env.AI_PRICE_OUTPUT_PER_MTOK_USD),
    /** Longest a genuine run can take: every attempt timing out, plus backoff, plus a margin. */
    stuckAfterMs: timeoutMs * (maxRetries + 1) + backoffMs + 60_000,
  };
}
export type AiLimitSettings = ReturnType<typeof aiLimitSettings>;

/** Estimated cost in millionths of a dollar, or null when the operator hasn't set prices. Pure. */
export function costMicroUsd(usage: TokenUsage | null | undefined, s: Pick<AiLimitSettings, "priceInputPerMTokUsd" | "priceOutputPerMTokUsd">) {
  if (!usage || s.priceInputPerMTokUsd == null || s.priceOutputPerMTokUsd == null) return null;
  return Math.round(usage.inputTokens * s.priceInputPerMTokUsd + usage.outputTokens * s.priceOutputPerMTokUsd);
}

/**
 * A keyed (HMAC-SHA256) fingerprint of a request's exact input. It can match identical requests but
 * can't be reversed or checked against guessed text without the server secret.
 */
export function inputHash(parts: unknown, secret = process.env.BETTER_AUTH_SECRET ?? process.env.ENCRYPTION_KEYS ?? "") {
  return createHmac("sha256", `truedraft-ai-dedup:${secret}`).update(JSON.stringify(parts)).digest("hex");
}

