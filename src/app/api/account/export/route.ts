import { apiRoute, requireApiUser } from "@/server/http";
import { exportUserData } from "@/server/services/account";

export const GET = apiRoute("account.export", async (request) => {
  const user = await requireApiUser(request);
  const data = await exportUserData(user.id);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="truedraft-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
});
