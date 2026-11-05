import { apiRoute, assertUuid, jsonResponse, parseJson, requireAdmin } from "@/server/http";
import { adminDeleteSchool, adminUpsertSchool } from "@/server/services/schools";
import { schoolInputSchema } from "@/server/validation-admin";

type Ctx = { params: Promise<{ id: string }> };
const clean = <T extends Record<string, unknown>>(o: T) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v === "" ? null : v])) as T;

export const PUT = apiRoute<Ctx>("admin.schools.update", async (request, { params }) => {
  const admin = await requireAdmin(request);
  const id = assertUuid((await params).id);
  await adminUpsertSchool(admin.id, id, clean(await parseJson(request, schoolInputSchema)) as never);
  return jsonResponse({ ok: true });
});

export const DELETE = apiRoute<Ctx>("admin.schools.delete", async (request, { params }) => {
  const admin = await requireAdmin(request);
  await adminDeleteSchool(admin.id, assertUuid((await params).id));
  return jsonResponse({ ok: true });
});
