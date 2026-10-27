import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auditEvent } from "@/db/schema";
import { POST as createEssay } from "@/app/api/essays/route";
import { PUT as autosave } from "@/app/api/essays/[id]/draft/route";
import { POST as runAi } from "@/app/api/essays/[id]/ai/[kind]/route";
import { POST as consent } from "@/app/api/consent/route";
import * as providerModule from "@/server/ai/provider";
import type { StructuredRequest } from "@/server/ai/provider";
import { setAnalyticsSink } from "@/server/analytics";
import { getEssay } from "@/server/services/essays";
import { ctx, json, readStream, req, signIn } from "../helpers/http";

const SECRET_SENTENCE = "My grandmother Wei hid the letters under the blue rice jar in 2019";
const essayBody = {
  title: "Private essay",
  applicationType: "personal_statement",
  promptText: "Tell us about a family tradition.",
  wordLimit: 650,
  draft: `${SECRET_SENTENCE}. Contact me at wei.student@example.com or 13812345678. ID 110101200501011234.`,
  feedbackLanguage: "en",
  focusAreas: [],
  context: "Please be gentle, this is personal.",
};

let logs: string[] = [];
let analytics: string[] = [];

beforeEach(() => {
  logs = [];
  analytics = [];
  for (const level of ["log", "info", "warn", "error", "debug"] as const) {
    vi.spyOn(console, level).mockImplementation((...args: unknown[]) => void logs.push(args.map(String).join(" ")));
  }
  setAnalyticsSink((event, props) => analytics.push(JSON.stringify({ event, props })));
});
afterEach(() => {
  vi.restoreAllMocks();
  setAnalyticsSink(null);
});

describe("privacy protections", () => {
  it("never writes essay text to logs, analytics, or audit metadata — even when the provider fails", async () => {
    const me = await signIn("private@example.test");
    const created = await json(await createEssay(req("POST", "/api/essays", { cookie: me.cookie, body: essayBody }), undefined as never));
    const id = created.id;
    await autosave(req("PUT", "/x", { cookie: me.cookie, body: { draft: essayBody.draft + " more" } }), ctx({ id }));
    await consent(req("POST", "/x", { cookie: me.cookie, body: { consentType: "ai_processing", action: "grant" } }), undefined as never);
    await readStream(await runAi(req("POST", "/x", { cookie: me.cookie, body: { content: essayBody.draft } }), ctx({ id, kind: "full_feedback" })));
    await readStream(await runAi(req("POST", "/x", { cookie: me.cookie, body: { content: essayBody.draft + " [[mock:fail]]" } }), ctx({ id, kind: "full_feedback" })));
    await readStream(await runAi(req("POST", "/x", { cookie: me.cookie, body: { content: essayBody.draft + " [[mock:malformed]]" } }), ctx({ id, kind: "full_feedback" })));

    expect(logs.length).toBeGreaterThan(0); // the logger did run
    const everything = [...logs, ...analytics].join("\n");
    for (const fragment of ["grandmother", "rice jar", "wei.student", "13812345678", "be gentle", "family tradition"]) {
      expect(everything).not.toContain(fragment);
    }
    const audits = await db.select().from(auditEvent).where(eq(auditEvent.userId, me.userId));
    expect(JSON.stringify(audits)).not.toContain("grandmother");
    expect(analytics.some((a) => a.includes("feedback_completed"))).toBe(true);
  });

  it("redacts direct identifiers in what is sent to the AI provider but not in the saved essay", async () => {
    const me = await signIn("redact@example.test");
    const id = (await json(await createEssay(req("POST", "/api/essays", { cookie: me.cookie, body: essayBody }), undefined as never))).id;
    await consent(req("POST", "/x", { cookie: me.cookie, body: { consentType: "ai_processing", action: "grant" } }), undefined as never);
    const calls: StructuredRequest[] = [];
    vi.spyOn(providerModule, "getProvider").mockResolvedValue({
      kind: "fake",
      model: "fake",
      async generate(r) {
        calls.push(r);
        throw new providerModule.AiProviderError("refused");
      },
    });
    await readStream(await runAi(req("POST", "/x", { cookie: me.cookie, body: { content: essayBody.draft } }), ctx({ id, kind: "full_feedback" })));
    const sent = calls[0].user;
    expect(sent).toContain(SECRET_SENTENCE); // the essay itself is needed for feedback
    expect(sent).not.toContain("wei.student@example.com");
    expect(sent).not.toContain("13812345678");
    expect(sent).not.toContain("110101200501011234");
    expect(sent).toContain("[EMAIL]");
    expect(sent).toContain("[PHONE]");
    expect(sent).toContain("[ID NUMBER]");
    // Account details are never part of the request.
    expect(sent + calls[0].system).not.toContain("redact@example.test");
    // The stored original is unchanged.
    expect((await getEssay(me.userId, id)).draft).toBe(essayBody.draft);
  });
});
