import { z } from "zod";
import { limits } from "@/config/deployment";
import { ApiError, apiRoute, assertUuid, jsonResponse, parseJson, requireApiUser } from "@/server/http";
import { consumeRateLimit } from "@/server/rate-limit";
import { addDeadline } from "@/server/services/college-list";

type Ctx = { params: Promise<{ id: string }> };

/** Add one deadline. A client-generated itemId makes retries idempotent. */
export const POST = apiRoute<Ctx>("list.deadline.add", async (request, { params }) => {
  const user = await requireApiUser(request);
  const id = assertUuid((await params).id);
  const limit = await consumeRateLimit(`write:${user.id}`, limits.writesPerMinute, 60);
  if (!limit.allowed) throw new ApiError(429, "rate_limited");
  const body = await parseJson(request, z.record(z.string(), z.unknown()));
  const { itemId, ...input } = body as { itemId?: unknown };
  if (itemId !== undefined && (typeof itemId !== "string" || !/^[A-Za-z0-9-]{1,40}$/.test(itemId))) throw new ApiError(400, "validation_failed", { field: "itemId", reason: "invalid" });
  return jsonResponse({ entry: await addDeadline(user.id, id, input, itemId as string | undefined) }, 201);
});
