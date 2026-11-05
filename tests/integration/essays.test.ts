import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { essay as essayTable, essayVersion } from "@/db/schema";
import { POST as createEssay } from "@/app/api/essays/route";
import { PATCH as patchEssay } from "@/app/api/essays/[id]/route";
import { PUT as autosave } from "@/app/api/essays/[id]/draft/route";
import { GET as listVersions, POST as saveVersion } from "@/app/api/essays/[id]/versions/route";
import { GET as getVersion } from "@/app/api/essays/[id]/versions/[n]/route";
import { GET as exportEssay } from "@/app/api/essays/[id]/export/route";
import { POST as duplicate } from "@/app/api/essays/[id]/duplicate/route";
import { getEssay, listEssays } from "@/server/services/essays";
import { ctx, json, req, sampleEssay, signIn } from "../helpers/http";

let me: { cookie: string; userId: string };
beforeEach(async () => {
  me = await signIn("writer@example.test");
});

async function create(body: Record<string, unknown> = sampleEssay) {
  const res = await createEssay(req("POST", "/api/essays", { cookie: me.cookie, body }), undefined as never);
  return { res, id: (await json(res)).id as string };
}

describe("drafts and versions", () => {
  it("creates an essay and keeps the first draft as version 1", async () => {
    const { res, id } = await create();
    expect(res.status).toBe(201);
    const versions = await json(await listVersions(req("GET", `/api/essays/${id}/versions`, { cookie: me.cookie }), ctx({ id })));
    expect(versions.versions).toHaveLength(1);
    expect(versions.versions[0].versionNumber).toBe(1);
  });

  it("can save without any draft text and without AI", async () => {
    const { res, id } = await create({ ...sampleEssay, draft: "" });
    expect(res.status).toBe(201);
    const versions = await json(await listVersions(req("GET", `/api/essays/${id}/versions`, { cookie: me.cookie }), ctx({ id })));
    expect(versions.versions).toHaveLength(0);
  });

  it("validates required fields and limits", async () => {
    const bad = await createEssay(req("POST", "/api/essays", { cookie: me.cookie, body: { ...sampleEssay, title: "" } }), undefined as never);
    expect(bad.status).toBe(400);
    expect((await json(bad)).error.details.field).toBe("title");
    const tooLong = await createEssay(
      req("POST", "/api/essays", { cookie: me.cookie, body: { ...sampleEssay, draft: "a".repeat(20001) } }),
      undefined as never,
    );
    expect(tooLong.status).toBe(400);
    const badLimit = await createEssay(req("POST", "/api/essays", { cookie: me.cookie, body: { ...sampleEssay, wordLimit: -5 } }), undefined as never);
    expect(badLimit.status).toBe(400);
  });

  it("autosave updates the working draft but never modifies saved versions", async () => {
    const { id } = await create();
    const res = await autosave(req("PUT", `/api/essays/${id}/draft`, { cookie: me.cookie, body: { draft: "A completely new draft.", baseRevision: 0 } }), ctx({ id }));
    expect(res.status).toBe(200);
    expect((await json(res)).wordCount).toBe(4);
    const v1 = await json(await getVersion(req("GET", `/api/essays/${id}/versions/1`, { cookie: me.cookie }), ctx({ id, n: "1" })));
    expect(v1.version.content).toBe(sampleEssay.draft);
    expect((await getEssay(me.userId, id)).draft).toBe("A completely new draft.");
  });

  it("rejects a draft write based on an outdated revision and never overwrites newer text", async () => {
    const { id } = await create();
    const put = (draft: string, baseRevision: number) =>
      autosave(req("PUT", `/api/essays/${id}/draft`, { cookie: me.cookie, body: { draft, baseRevision } }), ctx({ id }));
    const first = await json(await put("Tab one text", 0));
    expect(first.revision).toBe(1);
    // A second tab (or a delayed request) still based on revision 0:
    const stale = await put("Stale tab text", 0);
    expect(stale.status).toBe(409);
    expect((await json(stale)).error).toMatchObject({ code: "draft_conflict", details: { revision: 1 } });
    expect((await getEssay(me.userId, id)).draft).toBe("Tab one text");
    // Retrying an already-applied save is harmless.
    const retried = await put("Tab one text", 0);
    expect(retried.status).toBe(200);
    expect((await json(retried)).revision).toBe(1);
    const second = await json(await put("Tab one text, continued", 1));
    expect(second.revision).toBe(2);
    expect((await put("Missing revision" as string, undefined as never)).status).toBe(400);
  });

  it("saving a version never overwrites a newer working draft", async () => {
    const { id } = await create();
    // Typing continued and was autosaved while the version request was in flight.
    await autosave(req("PUT", `/api/essays/${id}/draft`, { cookie: me.cookie, body: { draft: "Newer text typed later", baseRevision: 0 } }), ctx({ id }));
    const v = await saveVersion(req("POST", `/api/essays/${id}/versions`, { cookie: me.cookie, body: { content: "Older snapshot", note: null } }), ctx({ id }));
    expect(v.status).toBe(201);
    const after = await getEssay(me.userId, id);
    expect(after.draft).toBe("Newer text typed later");
    expect(after.draftRevision).toBe(1);
  });

  it("numbers versions sequentially, keeps notes, and never overwrites older versions", async () => {
    const { id } = await create();
    const r2 = await saveVersion(req("POST", `/api/essays/${id}/versions`, { cookie: me.cookie, body: { content: "Second draft", note: "Moved scene" } }), ctx({ id }));
    expect((await json(r2)).versionNumber).toBe(2);
    const r3 = await saveVersion(req("POST", `/api/essays/${id}/versions`, { cookie: me.cookie, body: { content: "Third draft", note: null } }), ctx({ id }));
    expect((await json(r3)).versionNumber).toBe(3);
    const list = (await json(await listVersions(req("GET", `/api/essays/${id}/versions`, { cookie: me.cookie }), ctx({ id })))).versions;
    expect(list.map((v: { versionNumber: number }) => v.versionNumber)).toEqual([3, 2, 1]);
    expect(list[1].versionNote).toBe("Moved scene");
    const v1 = await json(await getVersion(req("GET", `/api/essays/${id}/versions/1`, { cookie: me.cookie }), ctx({ id, n: "1" })));
    expect(v1.version.content).toBe(sampleEssay.draft);
  });

  it("does not create a duplicate version when nothing changed", async () => {
    const { id } = await create();
    const res = await saveVersion(req("POST", `/api/essays/${id}/versions`, { cookie: me.cookie, body: { content: sampleEssay.draft, note: null } }), ctx({ id }));
    const body = await json(res);
    expect(body.unchanged).toBe(true);
    expect(body.versionNumber).toBe(1);
  });

  it("allocates unique version numbers under concurrent saves", async () => {
    const { id } = await create();
    const results = await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        saveVersion(req("POST", `/api/essays/${id}/versions`, { cookie: me.cookie, body: { content: `Draft ${i}`, note: `n${i}` } }), ctx({ id })).then(json),
      ),
    );
    const numbers = results.map((r) => r.versionNumber).sort((a, b) => a - b);
    expect(numbers).toEqual([2, 3, 4, 5, 6, 7]);
  });

  it("lists essays with correct version counts for the dashboard", async () => {
    const { id } = await create();
    await create({ ...sampleEssay, title: "No draft", draft: "" });
    await saveVersion(req("POST", `/api/essays/${id}/versions`, { cookie: me.cookie, body: { content: "Second", note: null } }), ctx({ id }));
    const rows = await listEssays(me.userId);
    expect(rows.find((r) => r.id === id)?.versionCount).toBe(2);
    expect(rows.find((r) => r.title === "No draft")?.versionCount).toBe(0);
    expect(rows.every((r) => r.latestFeedbackId === null)).toBe(true);
  });

  it("stores drafts and versions encrypted at rest", async () => {
    const { id } = await create();
    const [row] = await db.select().from(essayTable).where(eq(essayTable.id, id));
    expect(row.encryptedDraft).not.toContain("night market");
    expect(row.encryptedDraft.startsWith("v1.")).toBe(true);
    const [v] = await db.select().from(essayVersion).where(eq(essayVersion.essayId, id));
    expect(v.encryptedContent).not.toContain("night market");
  });

  it("updates details and status", async () => {
    const { id } = await create();
    const res = await patchEssay(req("PATCH", `/api/essays/${id}`, { cookie: me.cookie, body: { status: "revising", title: "Renamed" } }), ctx({ id }));
    expect(res.status).toBe(200);
    const e = await getEssay(me.userId, id);
    expect(e.status).toBe("revising");
    expect(e.title).toBe("Renamed");
  });

  it("duplicates an essay without copying feedback", async () => {
    const { id } = await create();
    const res = await duplicate(req("POST", `/api/essays/${id}/duplicate`, { cookie: me.cookie }), ctx({ id }));
    expect(res.status).toBe(201);
    const copy = await getEssay(me.userId, (await json(res)).id);
    expect(copy.draft).toBe(sampleEssay.draft);
    expect(copy.title).toContain(sampleEssay.title);
  });

  it("exports the essay as Markdown and plain text", async () => {
    const { id } = await create();
    const md = await exportEssay(req("GET", `/api/essays/${id}/export?format=md`, { cookie: me.cookie }), ctx({ id }));
    expect(md.headers.get("content-type")).toContain("text/markdown");
    const text = await md.text();
    expect(text).toContain("# Test essay");
    expect(text).toContain(sampleEssay.draft);
    const txt = await exportEssay(req("GET", `/api/essays/${id}/export?format=txt`, { cookie: me.cookie }), ctx({ id }));
    expect(txt.headers.get("content-disposition")).toContain(".txt");
  });
});
