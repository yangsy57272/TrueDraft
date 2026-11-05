import { ApiError, apiRoute, jsonResponse, requireApiUser } from "@/server/http";
import { listPlanningRuns } from "@/server/services/profile";

export const GET = apiRoute("planning.runs", async (request) => {
  const user = await requireApiUser(request);
  const kind = new URL(request.url).searchParams.get("kind");
  if (kind !== "major_explorer") throw new ApiError(400, "validation_failed");
  return jsonResponse({ runs: await listPlanningRuns(user.id, kind) });
});
