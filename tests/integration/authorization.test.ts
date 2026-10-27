import { beforeEach, describe, expect, it } from "vitest";
import { POST as createEssay, GET as listEssays } from "@/app/api/essays/route";
import { DELETE as deleteEssay, GET as getEssay, PATCH as patchEssay } from "@/app/api/essays/[id]/route";
import { PUT as autosave } from "@/app/api/essays/[id]/draft/route";
import { GET as listVersions, POST as saveVersion } from "@/app/api/essays/[id]/versions/route";
import { GET as getVersion } from "@/app/api/essays/[id]/versions/[n]/route";
import { GET as exportEssay } from "@/app/api/essays/[id]/export/route";
import { DELETE as deleteFeedback, GET as listFeedback } from "@/app/api/essays/[id]/feedback/route";
import { POST as runAi } from "@/app/api/essays/[id]/ai/[kind]/route";
import { POST as duplicate } from "@/app/api/essays/[id]/duplicate/route";
import { GET as listNotes } from "@/app/api/essays/[id]/brainstorm-notes/route";
import { POST as consent } from "@/app/api/consent/route";
import { getEssay as serviceGetEssay } from "@/server/services/essays";
import { ctx, json, req, sampleEssay, signIn } from "../helpers/http";

let alice: { cookie: string; userId: string };
let bob: { cookie: string; userId: string };
let essayId: string;

beforeEach(async () => {
  alice = await signIn("alice@example.test");
  bob = await signIn("bob@example.test");
  const res = await createEssay(req("POST", "/api/essays", { cookie: alice.cookie, body: sampleEssay }), undefined as never);
  essayId = (await json(res)).id;
  await consent(req("POST", "/api/consent", { cookie: bob.cookie, body: { consentType: "ai_processing", action: "grant" } }), undefined as never);
});

describe("per-user authorization", () => {
  it("lets the owner read their essay", async () => {
    const res = await getEssay(req("GET", `/api/essays/${essayId}`, { cookie: alice.cookie }), ctx({ id: essayId }));
    expect(res.status).toBe(200);
    expect((await json(res)).essay.draft).toBe(sampleEssay.draft);
  });

  it("never lists another student's essays", async () => {
    const res = await listEssays(req("GET", "/api/essays", { cookie: bob.cookie }), undefined as never);
    expect((await json(res)).essays).toEqual([]);
  });

  it("returns 404 (not 403) for every essay endpoint when the id belongs to someone else", async () => {
    const p = ctx({ id: essayId });
    const attempts: Response[] = [
      await getEssay(req("GET", `/api/essays/${essayId}`, { cookie: bob.cookie }), p),
      await patchEssay(req("PATCH", `/api/essays/${essayId}`, { cookie: bob.cookie, body: { title: "pwned" } }), p),
      await autosave(req("PUT", `/api/essays/${essayId}/draft`, { cookie: bob.cookie, body: { draft: "overwritten" } }), p),
      await listVersions(req("GET", `/api/essays/${essayId}/versions`, { cookie: bob.cookie }), p),
      await saveVersion(req("POST", `/api/essays/${essayId}/versions`, { cookie: bob.cookie, body: { content: "x", note: null } }), p),
      await getVersion(req("GET", `/api/essays/${essayId}/versions/1`, { cookie: bob.cookie }), ctx({ id: essayId, n: "1" })),
      await exportEssay(req("GET", `/api/essays/${essayId}/export`, { cookie: bob.cookie }), p),
      await listFeedback(req("GET", `/api/essays/${essayId}/feedback`, { cookie: bob.cookie }), p),
      await deleteFeedback(req("DELETE", `/api/essays/${essayId}/feedback`, { cookie: bob.cookie }), p),
      await runAi(req("POST", `/api/essays/${essayId}/ai/full_feedback`, { cookie: bob.cookie, body: {} }), ctx({ id: essayId, kind: "full_feedback" })),
      await duplicate(req("POST", `/api/essays/${essayId}/duplicate`, { cookie: bob.cookie }), p),
      await listNotes(req("GET", `/api/essays/${essayId}/brainstorm-notes`, { cookie: bob.cookie }), p),
      await deleteEssay(req("DELETE", `/api/essays/${essayId}`, { cookie: bob.cookie }), p),
    ];
    for (const res of attempts) {
      expect(res.status).toBe(404);
      const body = await res.text();
      expect(body).not.toContain(sampleEssay.draft);
    }
    // Alice's essay is untouched.
    const still = await serviceGetEssay(alice.userId, essayId);
    expect(still.title).toBe(sampleEssay.title);
    expect(still.draft).toBe(sampleEssay.draft);
  });

  it("returns 404 for malformed ids", async () => {
    const res = await getEssay(req("GET", "/api/essays/../../etc", { cookie: alice.cookie }), ctx({ id: "../../etc" }));
    expect(res.status).toBe(404);
  });

  it("rejects cross-site state-changing requests", async () => {
    const res = await patchEssay(
      req("PATCH", `/api/essays/${essayId}`, { cookie: alice.cookie, body: { title: "x" }, origin: "https://evil.example" }),
      ctx({ id: essayId }),
    );
    expect(res.status).toBe(403);
    expect((await json(res)).error.code).toBe("cross_site_request");
  });
});
