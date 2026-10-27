import { apiRoute, assertUuid, jsonResponse, parseJson, requireApiUser } from "@/server/http";
import { listBrainstormNotes, saveBrainstormNote } from "@/server/services/brainstorm";
import { brainstormSaveSchema } from "@/server/validation";

type Ctx = { params: Promise<{ id: string }> };

export const GET = apiRoute<Ctx>("brainstorm.list", async (request, { params }) => {
  const user = await requireApiUser(request);
  const id = assertUuid((await params).id);
  return jsonResponse({ notes: await listBrainstormNotes(user.id, id) });
});

export const POST = apiRoute<Ctx>("brainstorm.save", async (request, { params }) => {
  const user = await requireApiUser(request);
  const id = assertUuid((await params).id);
  const { turns } = await parseJson(request, brainstormSaveSchema);
  return jsonResponse({ note: await saveBrainstormNote(user.id, id, turns) }, 201);
});
