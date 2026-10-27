import { apiRoute, assertUuid, jsonResponse, parseJson, requireApiUser } from "@/server/http";
import { deleteEssay, getEssay, updateEssayMeta } from "@/server/services/essays";
import { essayPatchSchema } from "@/server/validation";

type Ctx = { params: Promise<{ id: string }> };

export const GET = apiRoute<Ctx>("essays.get", async (request, { params }) => {
  const user = await requireApiUser(request);
  const id = assertUuid((await params).id);
  return jsonResponse({ essay: await getEssay(user.id, id) });
});

export const PATCH = apiRoute<Ctx>("essays.update", async (request, { params }) => {
  const user = await requireApiUser(request);
  const id = assertUuid((await params).id);
  const patch = await parseJson(request, essayPatchSchema);
  await updateEssayMeta(user.id, id, patch);
  return jsonResponse({ ok: true });
});

export const DELETE = apiRoute<Ctx>("essays.delete", async (request, { params }) => {
  const user = await requireApiUser(request);
  const id = assertUuid((await params).id);
  await deleteEssay(user.id, id);
  return jsonResponse({ ok: true });
});
