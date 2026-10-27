import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins/magic-link";
import { db } from "@/db";
import { account, privacySettings, session, user, verification } from "@/db/schema";
import { brand } from "@/config/brand";
import { getAppUrl } from "@/config/deployment";
import { isLocale, LOCALE_COOKIE } from "@/i18n/config";
import { sendMagicLinkEmail } from "./email";
import { recordAudit } from "./services/audit";

function localeFromCookieHeader(cookieHeader: string | null | undefined): string {
  const match = cookieHeader?.match(new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]+)`));
  const value = match ? decodeURIComponent(match[1]) : "en";
  return isLocale(value) ? value : "en";
}

const isProduction = process.env.NODE_ENV === "production";

export const auth = betterAuth({
  appName: brand.name,
  baseURL: getAppUrl(),
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [getAppUrl()],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: { enabled: false },
  user: {
    additionalFields: {
      preferredLanguage: { type: "string", required: false, defaultValue: "en", input: false },
      feedbackLanguage: { type: "string", required: false, defaultValue: "en", input: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh daily
  },
  rateLimit: {
    enabled: process.env.AUTH_RATE_LIMIT !== "off",
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/magic-link": { window: 60, max: 5 },
    },
  },
  advanced: {
    cookiePrefix: "td",
    useSecureCookies: isProduction && getAppUrl().startsWith("https://"),
    // We do not need IP addresses for sessions; don't store them.
    ipAddress: { disableIpTracking: true },
  },
  telemetry: { enabled: false },
  databaseHooks: {
    user: {
      create: {
        before: async (data, ctx) => {
          const locale = localeFromCookieHeader(ctx?.headers?.get("cookie") ?? ctx?.request?.headers.get("cookie"));
          return { data: { ...data, name: "", preferredLanguage: locale, feedbackLanguage: locale } };
        },
        after: async (created) => {
          await db.insert(privacySettings).values({ userId: created.id }).onConflictDoNothing();
          await recordAudit(created.id, "account_created");
        },
      },
    },
  },
  plugins: [
    magicLink({
      expiresIn: 60 * 15,
      storeToken: "hashed",
      sendMagicLink: async ({ email, url }, ctx) => {
        const locale = localeFromCookieHeader(ctx?.headers?.get("cookie") ?? ctx?.request?.headers.get("cookie"));
        await sendMagicLinkEmail(email, url, locale);
      },
    }),
    nextCookies(),
  ],
});
