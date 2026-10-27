import { ApiError, apiRoute, jsonResponse, parseJson, requireApiUser } from "@/server/http";
import { adminListResources, adminUpsertResource } from "@/server/services/resources";
import { resourceSchema } from "@/server/validation";

export const GET = apiRoute("admin.resources.list", async (request) => {
  const user = await requireApiUser(request);
  if (!user.isAdmin) throw new ApiError(403, "forbidden");
  return jsonResponse({ resources: await adminListResources() });
});

export const POST = apiRoute("admin.resources.create", async (request) => {
  const user = await requireApiUser(request);
  if (!user.isAdmin) throw new ApiError(403, "forbidden");
  const input = await parseJson(request, resourceSchema);
  const row = await adminUpsertResource(user.id, null, input);
  return jsonResponse({ id: row.id }, 201);
});
