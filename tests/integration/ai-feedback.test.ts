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
import { listEssays, listVersions } from "@/server/services/essays";
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
    const events = await readStream(await run("sentence", { selection, sentenceMode: "clearer" }));
    const done = events.find((e) => e.type === "done");
    expect(done.result.alternatives).toHaveLength(1);
    expect(done.result.removedAlternatives).toBe(1); // the third was already cut by the two-item cap
  });
});
