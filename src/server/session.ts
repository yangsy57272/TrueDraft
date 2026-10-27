import "server-only";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { user } from "@/db/schema";
import { getAdminEmails } from "@/config/deployment";
import { isFeedbackLanguage, isLocale, type FeedbackLanguage, type Locale } from "@/i18n/config";
import { auth } from "./auth";

export type AppUser = {
  id: string;
  email: string;
  displayName: string;
  preferredLanguage: Locale;
  feedbackLanguage: FeedbackLanguage;
  isAdmin: boolean;
  createdAt: Date;
};

/** Resolve the signed-in user from request headers (cookie). Returns null when signed out. */
export async function getUserFromHeaders(requestHeaders: Headers): Promise<AppUser | null> {
  const result = await auth.api.getSession({ headers: requestHeaders });
  if (!result?.user) return null;
  const [row] = await db.select().from(user).where(eq(user.id, result.user.id)).limit(1);
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    displayName: row.name,
    preferredLanguage: isLocale(row.preferredLanguage) ? row.preferredLanguage : "en",
    feedbackLanguage: isFeedbackLanguage(row.feedbackLanguage) ? row.feedbackLanguage : "en",
    isAdmin: getAdminEmails().includes(row.email.toLowerCase()),
    createdAt: row.createdAt,
  };
}

/** For server components: current user or null. */
export async function getCurrentUser() {
  return getUserFromHeaders(await headers());
}

/** For private pages: redirect to sign-in when there is no session. */
export async function requirePageUser(): Promise<AppUser> {
  const current = await getCurrentUser();
  if (!current) redirect("/sign-in");
  return current;
}
