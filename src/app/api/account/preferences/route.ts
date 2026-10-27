import { cookies } from "next/headers";
import { apiRoute, jsonResponse, parseJson, requireApiUser } from "@/server/http";
import { updatePreferences } from "@/server/services/account";
import { LOCALE_COOKIE } from "@/i18n/config";
import { preferencesSchema } from "@/server/validation";

export const PATCH = apiRoute("account.preferences", async (request) => {
  const user = await requireApiUser(request);
  const prefs = await parseJson(request, preferencesSchema);
  await updatePreferences(user.id, prefs);
  if (prefs.preferredLanguage) {
    (await cookies()).set(LOCALE_COOKIE, prefs.preferredLanguage, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  }
  return jsonResponse({ ok: true });
});
