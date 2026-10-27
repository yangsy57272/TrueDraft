import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { POST as createResource } from "@/app/api/admin/resources/route";
import { POST as setLocale } from "@/app/api/locale/route";
import { getRetrievalGuidance, listPublishedResources } from "@/server/services/resources";
import { json, req, signIn } from "../helpers/http";

const base = {
  slug: "licensed-guide",
  title: "Licensed guide",
  summary: "From a partner.",
  contentOrUrl: "Guidance text",
  contentType: "article",
  language: "en",
  category: "craft",
  source: "Partner",
  author: "Partner author",
  licenseStatus: "licensed",
  permissionNotes: null,
  collection: "licensed",
  access: "restricted",
  retrievalAllowed: false,
  published: true,
};

describe("resource administration", () => {
  it("only admins can manage resources", async () => {
    const student = await signIn("student@example.test");
    const res = await createResource(req("POST", "/x", { cookie: student.cookie, body: base }), undefined as never);
    expect(res.status).toBe(403);
  });

  it("requires permission notes and a separate collection for licensed material", async () => {
    const admin = await signIn("admin@example.test");
    const noNotes = await createResource(req("POST", "/x", { cookie: admin.cookie, body: base }), undefined as never);
    expect((await json(noNotes)).error.code).toBe("permission_notes_required");
    const wrongCollection = await createResource(
      req("POST", "/x", { cookie: admin.cookie, body: { ...base, permissionNotes: "Signed 2026", collection: "original" } }),
      undefined as never,
    );
    expect((await json(wrongCollection)).error.code).toBe("licensed_must_use_separate_collection");
    const ok = await createResource(req("POST", "/x", { cookie: admin.cookie, body: { ...base, permissionNotes: "Signed 2026" } }), undefined as never);
    expect(ok.status).toBe(201);
  });

  it("restricted and non-retrievable material is never used as AI guidance by default", async () => {
    const admin = await signIn("admin@example.test");
    await createResource(req("POST", "/x", { cookie: admin.cookie, body: { ...base, permissionNotes: "Signed 2026" } }), undefined as never);
    expect(await getRetrievalGuidance({ email: "student@example.test" }, ["craft"])).toEqual([]);
    expect((await listPublishedResources(null)).map((r) => r.slug)).not.toContain("licensed-guide");
    expect((await listPublishedResources({ email: "student@example.test" })).map((r) => r.slug)).not.toContain("licensed-guide");
  });
});

describe("language switching", () => {
  it("persists the interface language for signed-in students", async () => {
    const me = await signIn("lang@example.test");
    const res = await setLocale(req("POST", "/api/locale", { cookie: me.cookie, body: { locale: "zh-CN" } }), undefined as never);
    expect(res.status).toBe(200);
    const [row] = await db.select().from(user).where(eq(user.id, me.userId));
    expect(row.preferredLanguage).toBe("zh-CN");
  });

  it("rejects unsupported languages", async () => {
    const res = await setLocale(req("POST", "/api/locale", { body: { locale: "fr" } }), undefined as never);
    expect(res.status).toBe(400);
  });
});
