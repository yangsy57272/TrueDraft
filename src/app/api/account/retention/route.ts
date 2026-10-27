import { apiRoute, jsonResponse, parseJson, requireApiUser } from "@/server/http";
import { setRetention } from "@/server/services/account";
import { retentionSchema } from "@/server/validation";

export const POST = apiRoute("account.retention", async (request) => {
  const user = await requireApiUser(request);
  const { retention } = await parseJson(request, retentionSchema);
  const purged = await setRetention(user.id, retention);
  return jsonResponse({ ok: true, purged });
});
