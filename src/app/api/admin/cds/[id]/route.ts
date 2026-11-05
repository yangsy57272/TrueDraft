import { eq } from "drizzle-orm";
import { db } from "@/db";
import { cdsDataset } from "@/db/schema";
import { ApiError, apiRoute, assertUuid, jsonResponse, parseJson, requireAdmin } from "@/server/http";
import { adminDeleteDataset, adminUpsertDataset } from "@/server/services/schools";
import { datasetInputSchema } from "@/server/validation-admin";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = apiRoute<Ctx>("admin.cds.update", async (request, { params }) => {
  const admin = await requireAdmin(request);
  const id = assertUuid((await params).id);
  const [row] = await db.select({ schoolId: cdsDataset.schoolId }).from(cdsDataset).where(eq(cdsDataset.id, id)).limit(1);
  if (!row) throw new ApiError(404, "not_found");
  await adminUpsertDataset(admin.id, row.schoolId, id, await parseJson(request, datasetInputSchema));
  return jsonResponse({ ok: true });
});

export const DELETE = apiRoute<Ctx>("admin.cds.delete", async (request, { params }) => {
  const admin = await requireAdmin(request);
  await adminDeleteDataset(admin.id, assertUuid((await params).id));
  return jsonResponse({ ok: true });
});
