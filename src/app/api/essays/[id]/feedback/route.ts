import { apiRoute, assertUuid, jsonResponse, requireApiUser } from "@/server/http";
import { deleteAllRuns, listRuns } from "@/server/services/feedback";

type Ctx = { params: Promise<{ id: string }> };

export const GET = apiRoute<Ctx>("feedback.list", async (request, { params }) => {
  const user = await requireApiUser(request);
  const id = assertUuid((await params).id);
  return jsonResponse({ runs: await listRuns(user.id, id) });
});

export const DELETE = apiRoute<Ctx>("feedback.deleteAll", async (request, { params }) => {
  const user = await requireApiUser(request);
  const id = assertUuid((await params).id);
  return jsonResponse({ deleted: await deleteAllRuns(user.id, id) });
});
