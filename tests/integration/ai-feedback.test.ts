import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { feedbackRun } from "@/db/schema";
import { POST as createEssay } from "@/app/api/essays/route";
import { POST as runAi } from "@/app/api/essays/[id]/ai/[kind]/route";
import { GET as getRun } from "@/app/api/essays/[id]/feedback/[runId]/route";
import { POST as consent } from "@/app/api/consent/route";
import * as providerModule from "@/server/ai/provider";
import { AiProviderError, type AiProvider, type StructuredRequest } from "@/server/ai/provider";
import { getEssay, listEssays, listVersions } from "@/server/services/essays";
import { PUT as setTask } from "@/app/api/essays/[id]/feedback/[runId]/tasks/[index]/route";
import { PUT as autosave } from "@/app/api/essays/[id]/draft/route";
import { GET as exportAccount } from "@/app/api/account/export/route";
import { auditEvent, essay as essayTable } from "@/db/schema";
import { recoverStuckRuns } from "@/server/ai/limits";
import { ctx, json, readStream, req, sampleEssay, signIn } from "../helpers/http";
import { validFeedback } from "../helpers/fixtures";

let me: { cookie: string; userId: string };
let essayId: string;

beforeEach(async () => {
  me = await signIn("ai@example.test");
  essayId = (await json(await createEssay(req("POST", "/api/essays", { cookie: me.cookie, body: sampleEssay }), undefined as never))).id;
});
afterEach(() => vi.restoreAllMocks());

const grant = () => consent(req("POST", "/api/consent", { cookie: me.cookie, body: { consentType: "ai_processing", action: "grant" } }), undefined as never);
const run = (kind: string, body: Record<string, unknown> = {}) =>
  runAi(req("POST", `/api/essays/${essayId}/ai/${kind}`, { cookie: me.cookie, body }), ctx({ id: essayId, kind }));

/** A provider that records requests and returns a canned (schema-valid) payload. */
function fakeProvider(respond: (r: StructuredRequest) => unknown | Promise<unknown>, calls: StructuredRequest[] = []): AiProvider {
  return {
    kind: "fake",
    model: "fake-model",
    async generate(request) {
      calls.push(request);
      request.onProgress?.('{"summary":"x","categories":[],"passage_comments":[],"revision_plan":[]');
      return { json: await respond(request), model: "fake-model-2026", providerRef: "msg_123" };
    },
  };
}


describe("AI feedback", () => {
  it("requires consent before any AI processing", async () => {
    const res = await run("full_feedback", { content: sampleEssay.draft });
    expect(res.status).toBe(403);
    expect((await json(res)).error.code).toBe("consent_required");
  });

  it("returns structured feedback, stores it encrypted, and records model + prompt version", async () => {
    await grant();
    const calls: StructuredRequest[] = [];
    vi.spyOn(providerModule, "getProvider").mockResolvedValue(fakeProvider(() => validFeedback, calls));
    const events = await readStream(await run("full_feedback", { content: sampleEssay.draft }));
    const stages = events.filter((e) => e.type === "stage").map((e) => e.stage);
    expect(stages).toContain("checking");
    expect(stages).toContain("structure");
    const done = events.find((e) => e.type === "done");
    expect(done.result.summary).toBe("Clear topic.");
    expect(done.result.passage_comments[0].located).toBe(true);
    expect(done.result.passage_comments[1].located).toBe(false);
    expect(done.result.computed.wordCount).toBeGreaterThan(5);

    const [row] = await db.select().from(feedbackRun).where(eq(feedbackRun.id, done.runId));
    expect(row.status).toBe("completed");
    expect(row.modelName).toBe("fake-model-2026");
    expect(row.promptVersion).toMatch(/^coach-/);
    expect(row.encryptedStructuredResult).not.toContain("Clear topic");

    expect((await listEssays(me.userId))[0].latestFeedbackId).toBe(done.runId);

    const fetched = await json(await getRun(req("GET", "/x", { cookie: me.cookie }), ctx({ id: essayId, runId: done.runId })));
    expect(fetched.run.result.summary).toBe("Clear topic.");
  });

  it("attaches feedback to a saved version, creating one for unsaved edits", async () => {
    await grant();
    vi.spyOn(providerModule, "getProvider").mockResolvedValue(fakeProvider(() => validFeedback));
    await readStream(await run("full_feedback", { content: sampleEssay.draft + " A new sentence." }));
    const versions = await listVersions(me.userId, essayId);
    expect(versions).toHaveLength(2);
  });

  it("pins feedback to the submitted text without touching a newer working draft", async () => {
    await grant();
    vi.spyOn(providerModule, "getProvider").mockResolvedValue(fakeProvider(() => validFeedback));
    const submitted = sampleEssay.draft + " Submitted for feedback.";
    const pending = run("full_feedback", { content: submitted });
    await autosave(req("PUT", `/api/essays/${essayId}/draft`, { cookie: me.cookie, body: { draft: submitted + " Typed during feedback.", baseRevision: 0 } }), ctx({ id: essayId }));
    await readStream(await pending);
    expect((await getEssay(me.userId, essayId)).draft).toBe(submitted + " Typed during feedback.");
    const versions = await listVersions(me.userId, essayId);
    expect(versions[0].versionNumber).toBe(2);
  });

  it("brainstorming leaves no trace of the conversation or the AI's reply unless a note is saved", async () => {
    await grant();
    const DETAIL = "my great-aunt's turquoise abacus from Kashgar";
    vi.spyOn(providerModule, "getProvider").mockResolvedValue(
      fakeProvider(() => ({
        acknowledgement: `You mentioned ${DETAIL}.`,
        questions: [`What did ${DETAIL} sound like?`, "When did you first notice it?"],
        threads_noticed: [`Patience around ${DETAIL}`],
        boundary_note: null,
      })),
    );
    const events = await readStream(await run("brainstorm", { conversation: [{ role: "student", text: `I keep thinking about ${DETAIL}.` }] }));
    const done = events.find((e) => e.type === "done");
    expect(JSON.stringify(done.result)).toContain(DETAIL); // shown to the student once

    const runs = await db.select().from(feedbackRun).where(eq(feedbackRun.essayId, essayId));
    const brainstormRun = runs.find((r) => r.kind === "brainstorm")!;
    expect(brainstormRun.status).toBe("completed");
    expect(brainstormRun.encryptedStructuredResult).toBeNull();
    expect(brainstormRun.encryptedRequest).toBeNull();

    const exported = JSON.stringify(await (await exportAccount(req("GET", "/api/account/export", { cookie: me.cookie }), undefined as never)).json());
    expect(exported).not.toContain("turquoise abacus");
    expect(JSON.stringify(await db.select().from(auditEvent))).not.toContain("turquoise");
  });

  it("retries once when feedback is well-formed but incomplete, and never shows an incomplete report", async () => {
    await grant();
    const incomplete = { ...validFeedback, categories: validFeedback.categories.slice(0, 6) };
    let calls = 0;
    vi.spyOn(providerModule, "getProvider").mockResolvedValue(fakeProvider(() => (++calls === 1 ? incomplete : validFeedback)));
    const events = await readStream(await run("full_feedback", { content: sampleEssay.draft }));
    const done = events.find((e) => e.type === "done");
    expect(calls).toBe(2);
    expect(done.result.categories).toHaveLength(8);

    calls = 0;
    vi.spyOn(providerModule, "getProvider").mockResolvedValue(fakeProvider(() => ({ ...validFeedback, revision_plan: validFeedback.revision_plan.slice(0, 1) })));
    const failed = await readStream(await run("full_feedback", { content: sampleEssay.draft + " More." }));
    expect(failed.find((e) => e.type === "error")?.code).toBe("ai_incomplete");
    const rows = await db.select().from(feedbackRun).where(eq(feedbackRun.essayId, essayId));
    const failedRow = rows.find((r) => r.status === "failed")!;
    expect(failedRow.errorCode).toBe("ai_incomplete");
    expect(failedRow.encryptedStructuredResult).toBeNull();
  });

  it("reports truncated responses distinctly", async () => {
    await grant();
    vi.spyOn(providerModule, "getProvider").mockResolvedValue({
      kind: "fake",
      model: "fake",
      async generate() {
        throw new AiProviderError("truncated");
      },
    });
    const events = await readStream(await run("full_feedback", { content: sampleEssay.draft }));
    expect(events.find((e) => e.type === "error")?.code).toBe("ai_truncated");
  });

  it("returns an honest insufficient-material result instead of padded feedback", async () => {
    await grant();
    vi.spyOn(providerModule, "getProvider").mockResolvedValue(
      fakeProvider(() => ({
        ...validFeedback,
        material: "insufficient",
        insufficient_reason: "Only two sentences so far.",
        strengths: [],
        categories: [],
        passage_comments: [],
        revision_plan: [],
        questions_for_student: ["What happened at the stall that night?"],
      })),
    );
    const events = await readStream(await run("full_feedback", { content: "Two short sentences. That is all." }));
    const done = events.find((e) => e.type === "done");
    expect(done.result).toMatchObject({ material: "insufficient", insufficient_reason: "Only two sentences so far.", categories: [] });
  });

  it("stores the student's progress on revision tasks per task, owner only", async () => {
    await grant();
    vi.spyOn(providerModule, "getProvider").mockResolvedValue(fakeProvider(() => validFeedback));
    const done = (await readStream(await run("full_feedback", { content: sampleEssay.draft }))).find((e) => e.type === "done");
    const runId = done.runId as string;
    const put = (index: number, state: string, cookie = me.cookie) =>
      setTask(req("PUT", "/x", { cookie, body: { state } }), ctx({ id: essayId, runId, index: String(index) }));
    const results = await Promise.all([put(0, "done"), put(1, "doing"), put(2, "done")]);
    expect(results.map((r) => r.status)).toEqual([200, 200, 200]);
    const [row] = await db.select().from(feedbackRun).where(eq(feedbackRun.id, runId));
    expect(row.taskStates).toEqual({ "0": "done", "1": "doing", "2": "done" });
    expect((await put(3, "done")).status).toBe(404); // only three tasks
    expect((await put(0, "finished")).status).toBe(400);
    const intruder = await signIn("intruder@example.test");
    expect((await put(0, "todo", intruder.cookie)).status).toBe(404);
  });

  it("rejects malformed provider output and never fabricates feedback", async () => {
    await grant();
    vi.spyOn(providerModule, "getProvider").mockResolvedValue(fakeProvider(() => ({ summary: 42 })));
    const events = await readStream(await run("full_feedback", { content: sampleEssay.draft }));
    const err = events.find((e) => e.type === "error");
    expect(err.code).toBe("ai_malformed");
    expect(events.find((e) => e.type === "done")).toBeUndefined();
    const rows = await db.select().from(feedbackRun).where(eq(feedbackRun.essayId, essayId));
    expect(rows[0].status).toBe("failed");
    expect(rows[0].encryptedStructuredResult).toBeNull();
  });

  it("handles provider outages with a limited retry and a friendly error code", async () => {
    await grant();
    let attempts = 0;
    vi.spyOn(providerModule, "getProvider").mockResolvedValue(
      fakeProvider(() => {
        attempts += 1;
        throw new AiProviderError("unavailable", true);
      }),
    );
    const events = await readStream(await run("full_feedback", { content: sampleEssay.draft }));
    expect(attempts).toBe(2); // 1 try + AI_MAX_RETRIES=1
    const err = events.find((e) => e.type === "error");
    expect(err.code).toBe("ai_unavailable");
    expect(JSON.stringify(events)).not.toMatch(/stack|Error:/);
  });

  it("does not retry non-retryable failures (e.g. refusals)", async () => {
    await grant();
    let attempts = 0;
    vi.spyOn(providerModule, "getProvider").mockResolvedValue(
      fakeProvider(() => {
        attempts += 1;
        throw new AiProviderError("refused");
      }),
    );
    const events = await readStream(await run("full_feedback", { content: sampleEssay.draft }));
    expect(attempts).toBe(1);
    expect(events.find((e) => e.type === "error").code).toBe("ai_refused");
  });

  it("works end-to-end with the built-in mock provider, including simulated failure", async () => {
    await grant();
    const ok = await readStream(await run("full_feedback", { content: sampleEssay.draft }));
    expect(ok.find((e) => e.type === "done").isMock).toBe(true);
    const failed = await readStream(await run("full_feedback", { content: sampleEssay.draft + " [[mock:fail]]" }));
    expect(failed.find((e) => e.type === "error").code).toBe("ai_unavailable");
  });

  it("returns 503 when no AI provider is configured", async () => {
    await grant();
    const prev = process.env.AI_PROVIDER;
    process.env.AI_PROVIDER = "";
    try {
      const res = await run("full_feedback", { content: sampleEssay.draft });
      expect(res.status).toBe(503);
      expect((await json(res)).error.code).toBe("ai_not_configured");
    } finally {
      process.env.AI_PROVIDER = prev;
    }
  });

  it("validates feedback requests", async () => {
    await grant();
    expect((await run("not_a_tool", {})).status).toBe(404);
    const noSelection = await run("sentence", { sentenceMode: "clearer" });
    expect((await json(noSelection)).error.code).toBe("selection_required");
    const badMode = await run("sentence", { selection: "x", sentenceMode: "write_my_essay" });
    expect(badMode.status).toBe(400);
    const tooLong = await run("sentence", { selection: "a".repeat(1201), sentenceMode: "clearer" });
    expect(tooLong.status).toBe(400);
    const empty = await run("full_feedback", { content: "   " });
    expect((await json(empty)).error.code).toBe("empty_draft");
    const huge = await run("full_feedback", { content: "a ".repeat(10001) });
    expect(huge.status).toBe(400);
  });

  it("rate-limits AI requests per student", async () => {
    await grant();
    const prev = process.env.AI_REQUESTS_PER_HOUR;
    vi.resetModules();
    process.env.AI_REQUESTS_PER_HOUR = "2";
    try {
      const { POST } = await import("@/app/api/essays/[id]/ai/[kind]/route");
      const call = () => POST(req("POST", "/x", { cookie: me.cookie, body: {} }), ctx({ id: essayId, kind: "prompt_decoder" }));
      expect((await call()).status).toBe(200);
      expect((await call()).status).toBe(200);
      const limited = await call();
      expect(limited.status).toBe(429);
      expect((await json(limited)).error.code).toBe("rate_limited");
    } finally {
      process.env.AI_REQUESTS_PER_HOUR = prev;
    }
  });

  it("removes sentence alternatives that would add new essay content", async () => {
    await grant();
    const selection = "This taught me hard work.";
    vi.spyOn(providerModule, "getProvider").mockResolvedValue(
      fakeProvider(() => ({
        diagnosis: "Generic.",
        alternatives: [
          { text: "Counting people taught me to look twice.", explanation: "Specific." },
          { text: "Long invented paragraph. ".repeat(40), explanation: "Too long." },
          { text: "Third option", explanation: "Over the limit of two." },
        ],
        tradeoffs: "",
        translation: null,
        zh_explanation: null,
        voice_reminder: "Choose what sounds like you.",
        boundary_note: null,
      })),
    );
    const content = `${sampleEssay.draft} ${selection}`;
    const events = await readStream(await run("sentence", { selection, sentenceMode: "clearer", content }));
    const done = events.find((e) => e.type === "done");
    expect(done.result.alternatives).toHaveLength(1);
    expect(done.result.removedAlternatives).toBe(1); // the third was already cut by the two-item cap
  });

  it("only gives sentence feedback on passages from the student's own draft", async () => {
    await grant();
    const calls: StructuredRequest[] = [];
    vi.spyOn(providerModule, "getProvider").mockResolvedValue(fakeProvider(() => ({}), calls));
    const res = await run("sentence", { selection: "A paragraph pasted from somewhere else entirely.", sentenceMode: "clearer", content: sampleEssay.draft });
    expect(res.status).toBe(400);
    expect((await json(res)).error.code).toBe("selection_not_in_draft");
    expect(calls).toHaveLength(0);
  });
});

describe("AI limits: concurrency, deduplication, usage, budget, recovery", () => {
  const withUsage = (calls: { n: number }, delayMs = 0): AiProvider => ({
    kind: "fake",
    model: "fake-model",
    async generate() {
      calls.n++;
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
      return { json: validFeedback, model: "fake-model", providerRef: null, usage: { inputTokens: 1000, outputTokens: 500 } };
    },
  });
  const errorCode = (events: { type: string; code?: string }[]) => events.find((e) => e.type === "error")?.code;
  afterEach(() => {
    for (const k of ["AI_DAILY_TOKEN_BUDGET", "AI_DAILY_BUDGET_USD", "AI_PRICE_INPUT_PER_MTOK_USD", "AI_PRICE_OUTPUT_PER_MTOK_USD", "AI_DEDUP_WINDOW_HOURS"]) delete process.env[k];
  });

  it("allows one run in flight per student", async () => {
    await grant();
    const calls = { n: 0 };
    vi.spyOn(providerModule, "getProvider").mockResolvedValue(withUsage(calls, 300));
    const [a, b] = await Promise.all([
      run("full_feedback", { content: sampleEssay.draft + " One." }).then(readStream),
      run("full_feedback", { content: sampleEssay.draft + " Two." }).then(readStream),
    ]);
    const codes = [errorCode(a), errorCode(b)];
    expect(codes.filter((c) => c === "ai_run_in_progress")).toHaveLength(1);
    expect(calls.n).toBe(1);
  });

  it("reuses an identical recent result instead of calling the AI again", async () => {
    await grant();
    const calls = { n: 0 };
    vi.spyOn(providerModule, "getProvider").mockResolvedValue(withUsage(calls));
    const first = (await readStream(await run("full_feedback", { content: sampleEssay.draft }))).find((e) => e.type === "done");
    const second = (await readStream(await run("full_feedback", { content: sampleEssay.draft }))).find((e) => e.type === "done");
    expect(calls.n).toBe(1);
    expect(second.reused).toBe(true);
    expect(second.runId).toBe(first.runId);
    // Any change to the text means a new request.
    await readStream(await run("full_feedback", { content: sampleEssay.draft + " Changed." }));
    expect(calls.n).toBe(2);
    // Deduplication can be switched off.
    process.env.AI_DEDUP_WINDOW_HOURS = "0";
    await readStream(await run("full_feedback", { content: sampleEssay.draft }));
    expect(calls.n).toBe(3);
  });

  it("records token usage and estimated cost, and stops at the daily ceiling", async () => {
    await grant();
    process.env.AI_PRICE_INPUT_PER_MTOK_USD = "3";
    process.env.AI_PRICE_OUTPUT_PER_MTOK_USD = "15";
    const calls = { n: 0 };
    vi.spyOn(providerModule, "getProvider").mockResolvedValue(withUsage(calls));
    await readStream(await run("full_feedback", { content: sampleEssay.draft + " A." }));
    const [row] = await db.select().from(feedbackRun).where(eq(feedbackRun.essayId, essayId)).orderBy(feedbackRun.createdAt);
    const done = (await db.select().from(feedbackRun).where(eq(feedbackRun.essayId, essayId))).find((r) => r.status === "completed")!;
    expect(row).toBeDefined();
    expect(done).toMatchObject({ inputTokens: 1000, outputTokens: 500, costMicroUsd: 1000 * 3 + 500 * 15 });

    process.env.AI_DAILY_TOKEN_BUDGET = "1500";
    const blocked = await readStream(await run("full_feedback", { content: sampleEssay.draft + " B." }));
    expect(errorCode(blocked)).toBe("ai_budget_reached");
    expect(calls.n).toBe(1);
    delete process.env.AI_DAILY_TOKEN_BUDGET;
    process.env.AI_DAILY_BUDGET_USD = "0.01"; // 10,000 micro-dollars; 10,500 already spent
    expect(errorCode(await readStream(await run("full_feedback", { content: sampleEssay.draft + " C." })))).toBe("ai_budget_reached");
  });

  it("marks runs stuck in pending as interrupted, freeing the student's slot", async () => {
    await grant();
    const [{ id: stuckId }] = await db
      .insert(feedbackRun)
      .values({ essayId, kind: "full_feedback", feedbackLanguage: "en", provider: "fake", modelName: "fake", promptVersion: "p", schemaVersion: "s", status: "pending", createdAt: new Date(Date.now() - 6 * 3_600_000) })
      .returning({ id: feedbackRun.id });
    const calls = { n: 0 };
    vi.spyOn(providerModule, "getProvider").mockResolvedValue(withUsage(calls));
    // The stuck run would otherwise block this request (one run in flight per student).
    const events = await readStream(await run("full_feedback", { content: sampleEssay.draft + " After a crash." }));
    expect(events.some((e) => e.type === "done")).toBe(true);
    const [stuck] = await db.select().from(feedbackRun).where(eq(feedbackRun.id, stuckId));
    expect(stuck).toMatchObject({ status: "failed", errorCode: "ai_interrupted" });
    // A recent pending run is left alone.
    await db.insert(feedbackRun).values({ essayId, kind: "full_feedback", feedbackLanguage: "en", provider: "fake", modelName: "fake", promptVersion: "p", schemaVersion: "s", status: "pending" });
    expect(await recoverStuckRuns()).toBe(0);
    expect((await db.select().from(essayTable)).length).toBe(1);
  });
});
