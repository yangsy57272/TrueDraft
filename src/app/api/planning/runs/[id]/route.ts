import { apiRoute, assertUuid, jsonResponse, requireApiUser } from "@/server/http";
import { deletePlanningRun } from "@/server/services/profile";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = apiRoute<Ctx>("planning.delete", async (request, { params }) => {
  const user = await requireApiUser(request);
  await deletePlanningRun(user.id, assertUuid((await params).id));
  return jsonResponse({ ok: true });
});
