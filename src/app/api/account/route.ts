import { cookies } from "next/headers";
import { apiRoute, jsonResponse, parseJson, requireApiUser } from "@/server/http";
import { deleteAccount } from "@/server/services/account";
import { deleteAccountSchema } from "@/server/validation";
import { track } from "@/server/analytics";

export const DELETE = apiRoute("account.delete", async (request) => {
  const user = await requireApiUser(request);
  await parseJson(request, deleteAccountSchema);
  await deleteAccount(user.id);
  track("account_deleted");
  // Sessions were removed by cascade; also clear the browser cookies.
  const jar = await cookies();
  for (const c of jar.getAll()) if (c.name.includes("td.session") || c.name.includes("td-session")) jar.delete(c.name);
  return jsonResponse({ ok: true });
});
