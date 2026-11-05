import { z } from "zod";
import { limits } from "@/config/deployment";
import { ApiError, apiRoute, assertUuid, jsonResponse, parseJson, requireApiUser } from "@/server/http";
import { consumeRateLimit } from "@/server/rate-limit";
import { addChecklistItem } from "@/server/services/college-list";

type Ctx = { params: Promise<{ id: string }> };

const addSchema = z.object({ label: z.string().trim().min(1).max(80), itemId: z.string().regex(/^[A-Za-z0-9-]{1,40}$/).optional() }).strict();

/** Add one custom checklist item. A client-generated itemId makes retries idempotent. */
export const POST = apiRoute<Ctx>("list.checklist.add", async (request, { params }) => {
  const user = await requireApiUser(request);
  const id = assertUuid((await params).id);
  const limit = await consumeRateLimit(`write:${user.id}`, limits.writesPerMinute, 60);
  if (!limit.allowed) throw new ApiError(429, "rate_limited");
  const { label, itemId } = await parseJson(request, addSchema);
  return jsonResponse({ entry: await addChecklistItem(user.id, id, label, itemId) }, 201);
});
