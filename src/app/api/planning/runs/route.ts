import { ApiError, apiRoute, jsonResponse, requireApiUser } from "@/server/http";
import { listPlanningRuns } from "@/server/services/profile";

export const GET = apiRoute("planning.runs", async (request) => {
  const user = await requireApiUser(request);
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind");
  if (kind !== "major_explorer") throw new ApiError(400, "validation_failed");
  return jsonResponse(await listPlanningRuns(user.id, kind, { cursor: params.get("cursor") }));
});
