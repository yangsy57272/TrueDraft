import { apiRoute, jsonResponse, parseJson, requireAdmin } from "@/server/http";
import { adminListSchools, adminUpsertSchool } from "@/server/services/schools";
import { schoolInputSchema } from "@/server/validation-admin";

const clean = <T extends Record<string, unknown>>(o: T) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v === "" ? null : v])) as T;

export const GET = apiRoute("admin.schools.list", async (request) => {
  await requireAdmin(request);
  return jsonResponse({ schools: await adminListSchools() });
});

export const POST = apiRoute("admin.schools.create", async (request) => {
  const admin = await requireAdmin(request);
  const input = clean(await parseJson(request, schoolInputSchema));
  const row = await adminUpsertSchool(admin.id, null, input as never);
  return jsonResponse({ id: row.id }, 201);
});
