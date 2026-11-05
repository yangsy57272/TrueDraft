import { z } from "zod";
import { limits } from "@/config/deployment";
import { ApiError, apiRoute, assertUuid, jsonResponse, parseJson, requireApiUser } from "@/server/http";
import { consumeRateLimit } from "@/server/rate-limit";
import { removeChecklistItem, setChecklistItem } from "@/server/services/college-list";

type Ctx = { params: Promise<{ id: string; itemId: string }> };

function assertItemId(value: string) {
  if (!/^[A-Za-z0-9-]{1,40}$/.test(value)) throw new ApiError(404, "not_found");
  return value;
}

/** Set one checklist item's state. */
export const PATCH = apiRoute<Ctx>("list.checklist.set", async (request, { params }) => {
  const user = await requireApiUser(request);
  const { id, itemId } = await params;
  const limit = await consumeRateLimit(`write:${user.id}`, limits.writesPerMinute, 60);
  if (!limit.allowed) throw new ApiError(429, "rate_limited");
  const { done } = await parseJson(request, z.object({ done: z.boolean() }).strict());
  return jsonResponse({ entry: await setChecklistItem(user.id, assertUuid(id), assertItemId(itemId), done) });
});

export const DELETE = apiRoute<Ctx>("list.checklist.remove", async (request, { params }) => {
  const user = await requireApiUser(request);
  const { id, itemId } = await params;
  return jsonResponse({ entry: await removeChecklistItem(user.id, assertUuid(id), assertItemId(itemId)) });
});
