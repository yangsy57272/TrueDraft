import { beforeEach, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditEvent, consentRecord, essay, user } from "@/db/schema";
import { POST as createEssay } from "@/app/api/essays/route";
import { DELETE as deleteEssay } from "@/app/api/essays/[id]/route";
import { POST as runAi } from "@/app/api/essays/[id]/ai/[kind]/route";
import { DELETE as deleteAllFeedback } from "@/app/api/essays/[id]/feedback/route";
import { POST as saveNote } from "@/app/api/essays/[id]/brainstorm-notes/route";
import { GET as getConsent, POST as consent } from "@/app/api/consent/route";
import { DELETE as deleteAccount } from "@/app/api/account/route";
import { GET as exportData } from "@/app/api/account/export/route";
import { POST as setRetention } from "@/app/api/account/retention/route";
import { getUserFromHeaders } from "@/server/session";
import { hasCurrentConsent } from "@/server/services/consent";
import { purgeExpiredEssays } from "@/server/services/account";
import { ctx, json, readStream, req, sampleEssay, signIn } from "../helpers/http";

let me: { cookie: string; userId: string };
let essayId: string;

async function counts() {
  const r = await db.execute<{ versions: number; runs: number; notes: number; essays: number }>(sql`select
    (select count(*)::int from essay_version) as versions,
    (select count(*)::int from feedback_run) as runs,
    (select count(*)::int from brainstorm_note) as notes,
    (select count(*)::int from essay) as essays`);
  return r.rows[0];
}

beforeEach(async () => {
  me = await signIn("delete.me@example.test");
  essayId = (await json(await createEssay(req("POST", "/api/essays", { cookie: me.cookie, body: sampleEssay }), undefined as never))).id;
  await consent(req("POST", "/x", { cookie: me.cookie, body: { consentType: "ai_processing", action: "grant" } }), undefined as never);
  await readStream(await runAi(req("POST", "/x", { cookie: me.cookie, body: { content: sampleEssay.draft } }), ctx({ id: essayId, kind: "full_feedback" })));
  await saveNote(req("POST", "/x", { cookie: me.cookie, body: { turns: [{ role: "student", text: "the tea stall" }] } }), ctx({ id: essayId }));
});

describe("deletion", () => {
  it("deleting an essay removes every version, feedback run, and note (no orphans)", async () => {
    expect(await counts()).toMatchObject({ essays: 1, runs: 1, notes: 1 });
    const res = await deleteEssay(req("DELETE", "/x", { cookie: me.cookie }), ctx({ id: essayId }));
    expect(res.status).toBe(200);
    expect(await counts()).toEqual({ versions: 0, runs: 0, notes: 0, essays: 0 });
  });

  it("deletes all feedback for an essay but keeps its versions", async () => {
    const res = await deleteAllFeedback(req("DELETE", "/x", { cookie: me.cookie }), ctx({ id: essayId }));
    expect((await json(res)).deleted).toBe(1);
    const c = await counts();
    expect(c.runs).toBe(0);
    expect(c.versions).toBeGreaterThan(0);
  });

  it("exports all of the student's data, decrypted", async () => {
    const res = await exportData(req("GET", "/api/account/export", { cookie: me.cookie }), undefined as never);
    expect(res.headers.get("content-disposition")).toContain("attachment");
    const data = await res.json();
    expect(data.account.email).toBe("delete.me@example.test");
    expect(data.essays[0].currentDraft).toBe(sampleEssay.draft);
    expect(data.essays[0].versions[0].content).toBe(sampleEssay.draft);
    expect(data.essays[0].feedback[0].result.summary).toBeTruthy();
    expect(data.essays[0].brainstormNotes[0].content.turns[0].text).toBe("the tea stall");
    expect(data.consents[0].consentType).toBe("ai_processing");
  });

  it("requires typed confirmation to delete an account", async () => {
    const res = await deleteAccount(req("DELETE", "/api/account", { cookie: me.cookie, body: { confirm: "yes" } }), undefined as never);
    expect(res.status).toBe(400);
    expect(await getUserFromHeaders(new Headers({ cookie: me.cookie }))).not.toBeNull();
  });

  it("deleting the account removes all personal data and anonymizes the audit trail", async () => {
    const res = await deleteAccount(req("DELETE", "/api/account", { cookie: me.cookie, body: { confirm: "DELETE" } }), undefined as never);
    expect(res.status).toBe(200);
    expect(await counts()).toEqual({ versions: 0, runs: 0, notes: 0, essays: 0 });
    expect(await db.select().from(user)).toHaveLength(0);
    expect(await db.select().from(consentRecord)).toHaveLength(0);
    expect(await getUserFromHeaders(new Headers({ cookie: me.cookie }))).toBeNull();
    const audits = await db.select().from(auditEvent);
    expect(audits.every((a) => a.userId === null)).toBe(true);
    expect(JSON.stringify(audits)).not.toContain("delete.me@example.test");
    expect(audits.some((a) => a.eventType === "account_deleted")).toBe(true);
  });
});

describe("retention", () => {
  it("purges essays older than the chosen retention period", async () => {
    await db.update(essay).set({ updatedAt: new Date(Date.now() - 100 * 86400_000) }).where(eq(essay.id, essayId));
    // Default keeps everything.
    expect(await purgeExpiredEssays()).toBe(0);
    const res = await setRetention(req("POST", "/x", { cookie: me.cookie, body: { retention: "90_days" } }), undefined as never);
    expect((await json(res)).purged).toBe(1);
    expect(await counts()).toEqual({ versions: 0, runs: 0, notes: 0, essays: 0 });
  });
});

describe("consent", () => {
  it("records grants with the policy version and supports withdrawal", async () => {
    let status = await json(await getConsent(req("GET", "/x", { cookie: me.cookie }), undefined as never));
    expect(status.aiProcessing.current).toBe(true);
    expect(status.aiProcessing.policyVersion).toBe("2026-10-27");

    await consent(req("POST", "/x", { cookie: me.cookie, body: { consentType: "ai_processing", action: "withdraw" } }), undefined as never);
    status = await json(await getConsent(req("GET", "/x", { cookie: me.cookie }), undefined as never));
    expect(status.aiProcessing).toBeNull();
    const records = await db.select().from(consentRecord).where(eq(consentRecord.userId, me.userId));
    expect(records.every((r) => r.withdrawalTimestamp !== null)).toBe(true);

    // Withdrawal blocks AI but not saving.
    const blocked = await runAi(req("POST", "/x", { cookie: me.cookie, body: { content: "x y z" } }), ctx({ id: essayId, kind: "full_feedback" }));
    expect(blocked.status).toBe(403);
  });

  it("asks again when the privacy policy version changes", async () => {
    expect(await hasCurrentConsent(me.userId, "ai_processing")).toBe(true);
    process.env.PRIVACY_POLICY_VERSION = "2027-01-01";
    try {
      expect(await hasCurrentConsent(me.userId, "ai_processing")).toBe(false);
    } finally {
      process.env.PRIVACY_POLICY_VERSION = "2026-10-27";
    }
  });

  it("only accepts known consent types (no training consent exists)", async () => {
    const res = await consent(req("POST", "/x", { cookie: me.cookie, body: { consentType: "model_training", action: "grant" } }), undefined as never);
    expect(res.status).toBe(400);
  });
});
