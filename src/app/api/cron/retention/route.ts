import { timingSafeEqual } from "node:crypto";
import { ApiError, apiRoute, jsonResponse } from "@/server/http";
import { purgeExpiredEssays } from "@/server/services/account";
import { pruneRateLimits } from "@/server/rate-limit";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret || secret.length < 32) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Scheduled job: enforce retention preferences. Call with `Authorization: Bearer $CRON_SECRET`. */
export const POST = apiRoute("cron.retention", async (request) => {
  if (!authorized(request)) throw new ApiError(401, "unauthenticated");
  const deleted = await purgeExpiredEssays();
  await pruneRateLimits();
  return jsonResponse({ deleted });
});
