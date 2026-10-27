import { ApiError, apiRoute, assertUuid, jsonResponse, parseJson, requireApiUser } from "@/server/http";
import { adminDeleteResource, adminUpsertResource } from "@/server/services/resources";
import { resourceSchema } from "@/server/validation";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = apiRoute<Ctx>("admin.resources.update", async (request, { params }) => {
  const user = await requireApiUser(request);
  if (!user.isAdmin) throw new ApiError(403, "forbidden");
  const id = assertUuid((await params).id);
  const input = await parseJson(request, resourceSchema);
  await adminUpsertResource(user.id, id, input);
  return jsonResponse({ ok: true });
});

export const DELETE = apiRoute<Ctx>("admin.resources.delete", async (request, { params }) => {
  const user = await requireApiUser(request);
  if (!user.isAdmin) throw new ApiError(403, "forbidden");
  await adminDeleteResource(user.id, assertUuid((await params).id));
  return jsonResponse({ ok: true });
});
