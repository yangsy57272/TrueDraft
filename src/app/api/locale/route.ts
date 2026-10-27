import { cookies } from "next/headers";
import { apiRoute, jsonResponse, parseJson } from "@/server/http";
import { getUserFromHeaders } from "@/server/session";
import { updatePreferences } from "@/server/services/account";
import { LOCALE_COOKIE } from "@/i18n/config";
import { localeSchema } from "@/server/validation";

/** Switch interface language. Persists to the account when signed in, otherwise a cookie. */
export const POST = apiRoute("locale.set", async (request) => {
  const { locale } = await parseJson(request, localeSchema);
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  const user = await getUserFromHeaders(request.headers);
  if (user) await updatePreferences(user.id, { preferredLanguage: locale });
  return jsonResponse({ ok: true });
});
