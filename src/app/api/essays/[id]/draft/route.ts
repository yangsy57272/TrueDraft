import { limits } from "@/config/deployment";
import { ApiError, apiRoute, assertUuid, jsonResponse, parseJson, requireApiUser } from "@/server/http";
import { consumeRateLimit } from "@/server/rate-limit";
import { autosaveDraft } from "@/server/services/essays";
import { draftSchema } from "@/server/validation";

type Ctx = { params: Promise<{ id: string }> };

/** Autosave the working draft. Saved versions are never modified here. */
export const PUT = apiRoute<Ctx>("essays.autosave", async (request, { params }) => {
  const user = await requireApiUser(request);
  const id = assertUuid((await params).id);
  const limit = await consumeRateLimit(`write:${user.id}`, limits.writesPerMinute, 60);
  if (!limit.allowed) throw new ApiError(429, "rate_limited");
  const { draft } = await parseJson(request, draftSchema);
  const result = await autosaveDraft(user.id, id, draft);
  return jsonResponse(result);
});
