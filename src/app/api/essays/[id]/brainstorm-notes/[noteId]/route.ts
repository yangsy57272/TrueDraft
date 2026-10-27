import { apiRoute, assertUuid, jsonResponse, requireApiUser } from "@/server/http";
import { deleteBrainstormNote } from "@/server/services/brainstorm";

type Ctx = { params: Promise<{ id: string; noteId: string }> };

export const DELETE = apiRoute<Ctx>("brainstorm.delete", async (request, { params }) => {
  const user = await requireApiUser(request);
  const { id, noteId } = await params;
  await deleteBrainstormNote(user.id, assertUuid(id), assertUuid(noteId));
  return jsonResponse({ ok: true });
});
