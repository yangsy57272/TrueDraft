import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { privacySettings, user } from "@/db/schema";
import { getUserFromHeaders } from "@/server/session";
import { GET as listEssays } from "@/app/api/essays/route";
import { BASE, req, signIn } from "../helpers/http";

describe("authentication", () => {
  it("signs a new student in with a magic link and creates a session", async () => {
    const { cookie, userId } = await signIn("new.student@example.test");
    expect(cookie).toMatch(/td\.session_token=/);
    const current = await getUserFromHeaders(new Headers({ cookie }));
    expect(current?.id).toBe(userId);
    expect(current?.email).toBe("new.student@example.test");
    // No real name is required or stored.
    const [row] = await db.select().from(user).where(eq(user.id, userId));
    expect(row.name).toBe("");
    // Privacy settings row is created with the safe default.
    const [settings] = await db.select().from(privacySettings).where(eq(privacySettings.userId, userId));
    expect(settings.retentionPreference).toBe("until_deleted");
  });

  it("stores the interface language chosen before sign-up", async () => {
    const { userId } = await signIn("zh.student@example.test", "zh-CN");
    const [row] = await db.select().from(user).where(eq(user.id, userId));
    expect(row.preferredLanguage).toBe("zh-CN");
  });

  it("rejects an invalid or reused sign-in token", async () => {
    const { auth } = await import("@/server/auth");
    const res = await auth.handler(new Request(`${BASE}/api/auth/magic-link/verify?token=not-a-real-token&callbackURL=/dashboard`));
    expect(res.headers.get("set-cookie") ?? "").not.toMatch(/session_token=[^;]+/);
  });

  it("signs out and invalidates the session", async () => {
    const { auth } = await import("@/server/auth");
    const { cookie } = await signIn("bye@example.test");
    const res = await auth.handler(new Request(`${BASE}/api/auth/sign-out`, { method: "POST", headers: { cookie, origin: BASE } }));
    expect(res.status).toBe(200);
    expect(await getUserFromHeaders(new Headers({ cookie }))).toBeNull();
  });

  it("returns 401 from private APIs without a session", async () => {
    const res = await listEssays(req("GET", "/api/essays"), undefined as never);
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("unauthenticated");
  });

  it("ignores a forged session cookie", async () => {
    expect(await getUserFromHeaders(new Headers({ cookie: "td.session_token=forged.value" }))).toBeNull();
  });
});
