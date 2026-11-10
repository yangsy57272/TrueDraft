import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { afterAll, beforeEach, vi } from "vitest";
import { TEST_ENV } from "./env";

Object.assign(process.env, TEST_ENV);

const { jar, sentLinks } = vi.hoisted(() => {
  const g = globalThis as unknown as { __tdTest?: { jar: Map<string, string>; sentLinks: Map<string, string> } };
  g.__tdTest ??= { jar: new Map(), sentLinks: new Map() };
  return g.__tdTest;
});

// next/headers is only available inside a Next.js request; provide a minimal stand-in.
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
    getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
  headers: async () => new Headers(),
}));

// The nextCookies plugin also needs a Next.js request scope; cookies are read from responses instead.
vi.mock("better-auth/next-js", async (importOriginal) => {
  const original = await importOriginal<typeof import("better-auth/next-js")>();
  return { ...original, nextCookies: () => ({ id: "next-cookies" }) };
});

// Capture sign-in links instead of sending email.
vi.mock("@/server/email", () => ({
  sendMagicLinkEmail: async (email: string, url: string) => void sentLinks.set(email.toLowerCase(), url),
}));

beforeEach(async () => {
  const { closeDb, getDb } = await import("@/db");
  closeDb();
  migrate(getDb(), { migrationsFolder: "./drizzle-sqlite" });
  jar.clear();
  sentLinks.clear();
});

afterAll(async () => {
  const { closeDb } = await import("@/db");
  await closeDb();
});
