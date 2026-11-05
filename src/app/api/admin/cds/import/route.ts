import { z } from "zod";
import { apiRoute, jsonResponse, parseJson, requireAdmin } from "@/server/http";
import { adminImportCsv } from "@/server/services/schools";

/** Import CDS values from CSV. Every imported row becomes an unpublished DRAFT for review. */
export const POST = apiRoute("admin.cds.import", async (request) => {
  const admin = await requireAdmin(request);
  const { csv } = await parseJson(request, z.object({ csv: z.string().min(1).max(200_000) }));
  return jsonResponse({ report: await adminImportCsv(admin.id, csv) });
});
