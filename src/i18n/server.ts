import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { getCurrentUser } from "@/server/session";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "./config";
import { createTranslator } from "./translate";

function fromAcceptLanguage(value: string | null): Locale | null {
  if (!value) return null;
  const first = value.split(",")[0]?.trim().toLowerCase() ?? "";
  if (first.startsWith("zh")) return "zh-CN";
  if (first.startsWith("en")) return "en";
  return null;
}

/** Signed-in preference → cookie → Accept-Language → default. */
export const getLocale = cache(async (): Promise<Locale> => {
  const user = await getCurrentUser().catch(() => null);
  if (user) return user.preferredLanguage;
  const cookieValue = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieValue)) return cookieValue;
  return fromAcceptLanguage((await headers()).get("accept-language")) ?? DEFAULT_LOCALE;
});

export async function getT() {
  return createTranslator(await getLocale());
}
