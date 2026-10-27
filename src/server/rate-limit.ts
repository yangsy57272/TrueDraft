import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { rateLimitBucket } from "@/db/schema";

/**
 * Fixed-window rate limiter backed by Postgres, so limits hold across multiple app instances.
 * Returns whether the request is allowed and when the window resets.
 */
export async function consumeRateLimit(key: string, limit: number, windowSeconds: number) {
  const now = Date.now();
  const windowStartMs = Math.floor(now / (windowSeconds * 1000)) * windowSeconds * 1000;
  const windowStart = new Date(windowStartMs);
  const [row] = await db
    .insert(rateLimitBucket)
    .values({ key, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: [rateLimitBucket.key, rateLimitBucket.windowStart],
      set: { count: sql`${rateLimitBucket.count} + 1` },
    })
    .returning({ count: rateLimitBucket.count });
  const resetAt = new Date(windowStartMs + windowSeconds * 1000);
  return { allowed: row.count <= limit, remaining: Math.max(0, limit - row.count), resetAt };
}

/** Remove expired buckets. Called opportunistically by the retention job. */
export async function pruneRateLimits() {
  await db.delete(rateLimitBucket).where(sql`${rateLimitBucket.windowStart} < now() - interval '2 days'`);
}
