import { apiRoute, assertUuid, jsonResponse, requireApiUser } from "@/server/http";
import { deleteRun, getRun } from "@/server/services/feedback";

type Ctx = { params: Promise<{ id: string; runId: string }> };

export const GET = apiRoute<Ctx>("feedback.get", async (request, { params }) => {
  const user = await requireApiUser(request);
  const { id, runId } = await params;
  return jsonResponse({ run: await getRun(user.id, assertUuid(id), assertUuid(runId)) });
});

export const DELETE = apiRoute<Ctx>("feedback.delete", async (request, { params }) => {
  const user = await requireApiUser(request);
  const { id, runId } = await params;
  await deleteRun(user.id, assertUuid(id), assertUuid(runId));
  return jsonResponse({ ok: true });
});
