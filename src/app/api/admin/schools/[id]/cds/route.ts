import { apiRoute, assertUuid, jsonResponse, parseJson, requireAdmin } from "@/server/http";
import { adminGetSchool, adminUpsertDataset } from "@/server/services/schools";
import { datasetInputSchema } from "@/server/validation-admin";

type Ctx = { params: Promise<{ id: string }> };

export const POST = apiRoute<Ctx>("admin.cds.create", async (request, { params }) => {
  const admin = await requireAdmin(request);
  const schoolId = assertUuid((await params).id);
  await adminGetSchool(schoolId);
  const row = await adminUpsertDataset(admin.id, schoolId, null, await parseJson(request, datasetInputSchema));
  return jsonResponse({ id: row.id }, 201);
});
