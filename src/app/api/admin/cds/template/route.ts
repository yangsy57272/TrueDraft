import { apiRoute, requireAdmin } from "@/server/http";
import { csvColumns } from "@/server/services/schools";

export const GET = apiRoute("admin.cds.template", async (request) => {
  await requireAdmin(request);
  return new Response(`${csvColumns().join(",")}\n`, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="cds-import-template.csv"', "Cache-Control": "no-store" },
  });
});
