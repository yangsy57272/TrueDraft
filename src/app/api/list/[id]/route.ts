import { z } from "zod";
import { apiRoute, assertUuid, jsonResponse, parseJson, requireApiUser } from "@/server/http";
import { removeEntry, updateEntry } from "@/server/services/college-list";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = apiRoute<Ctx>("list.update", async (request, { params }) => {
  const user = await requireApiUser(request);
  const id = assertUuid((await params).id);
  const entry = await updateEntry(user.id, id, await parseJson(request, z.record(z.string(), z.unknown())));
  return jsonResponse({ entry });
});

export const DELETE = apiRoute<Ctx>("list.delete", async (request, { params }) => {
  const user = await requireApiUser(request);
  await removeEntry(user.id, assertUuid((await params).id));
  return jsonResponse({ ok: true });
});
