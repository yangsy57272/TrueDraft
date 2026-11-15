import { describe, it, expect } from "vitest";
import {
  key,
  errorCode,
  parseFeedback,
  probe,
  read,
  request,
  write,
  type Host,
  type RecordData,
  type Written,
  type Envelope,
  type Completion,
} from "../../anna/src/core";
import { fullFeedbackSchema } from "../../src/server/ai/schemas";
const id = "11111111-1111-4111-8111-111111111111";
const v = {
  id: "v1",
  at: "2026-11-15",
  prompt: "Describe a lesson.",
  draft: "I learned to listen. Contact fictional@example.com.",
};
function aps() {
  const buckets = new Map<
    string,
    Map<string, { value: RecordData; etag: string; generation: number }>
  >();
  return (user: string) => {
    const bucket = buckets.get(user) ?? new Map();
    buckets.set(user, bucket);
    return {
      storage: {
        get: async ({ key }: { key: string }) =>
          bucket.has(key)
            ? { exists: true, ...bucket.get(key) }
            : { exists: false },
        set: async ({
          key,
          value,
          if_match,
        }: {
          key: string;
          value: RecordData;
          if_match?: string;
        }) => {
          const old = bucket.get(key);
          if (if_match && old?.etag !== if_match)
            throw new Error("precondition_failed");
          const gen = (old?.generation ?? 0) + 1;
          const row = {
            value: structuredClone(value),
            etag: String(gen),
            generation: gen,
          };
          bucket.set(key, row);
          return row;
        },
        delete: async ({
          key,
          if_match,
        }: {
          key: string;
          if_match?: string;
        }) => {
          if (if_match && bucket.get(key)?.etag !== if_match)
            throw new Error("precondition_failed");
          bucket.delete(key);
          return {};
        },
        list: async () => ({
          items: [...bucket.keys()].map((key) => ({ key })),
        }),
      },
      llm: {
        complete: async () => {
          throw new Error("not_live");
        },
      },
    } as Host;
  };
}
const record = (): RecordData => ({
  schema: 1,
  id,
  retentionDays: 30,
  versions: [v],
  reviews: [],
});
describe("Anna adapter contract (simulated host, not platform verification)", () => {
  it("uses no user id, cross-app scope or entry payload, redacts model copy only", () => {
    const r = request(v, "en");
    const text = JSON.stringify(r);
    expect(text).not.toContain("fictional@example.com");
    expect(text).toContain("[EMAIL]");
    expect(v.draft).toContain("fictional@example.com");
    expect(Object.keys(r)).not.toContain("user_id");
  });
  it("rejects arbitrary IDs and excessive or blank input", () => {
    expect(() => key("../other")).toThrow();
    expect(() => request({ ...v, draft: "x".repeat(20001) }, "en")).toThrow();
    expect(() => request({ ...v, prompt: "" }, "en")).toThrow();
  });
  it("refuses legacy stores that silently ignore conflict guards", async () => {
    const h = aps()("u");
    h.storage.set = async () => ({}) as Written;
    await expect(probe(h)).rejects.toThrow("aps_required");
  });
  it("tests isolation against simulated host buckets, including guessed ids", async () => {
    const host = aps(),
      a = host("a"),
      b = host("b");
    await write(a, record());
    await expect(read(b, id)).rejects.toThrow("not_found");
    expect((await read(a, id)).data.versions[0].draft).toEqual(v.draft);
  });
  it("tests reopen, version retention, optimistic save/delete conflict", async () => {
    const host = aps(),
      h = host("a");
    await probe(h);
    const tag = await write(h, record());
    const x = await read(h, id);
    expect(x.data.versions[0].id).toBe("v1");
    await write(
      h,
      { ...x.data, versions: [...x.data.versions, { ...v, id: "v2" }] },
      tag,
    );
    await expect(write(h, record(), tag)).rejects.toThrow(
      "precondition_failed",
    );
    await expect(
      h.storage.delete({ key: key(id), if_match: tag }),
    ).rejects.toThrow("precondition_failed");
    const cur = await read(h, id);
    await h.storage.delete({ key: key(id), if_match: cur.etag });
    await expect(read(h, id)).rejects.toThrow("not_found");
  });
  it("rejects host errors, refusals, truncated and malformed output", () => {
    for (const response of [
      { ok: false, error: { code: "APP_QUOTA_EXCEEDED" } },
      { stopReason: "contentFilter", content: { text: "{}" } },
      { stopReason: "maxTokens", content: { text: "{}" } },
      { stopReason: "endTurn", content: { text: "not JSON" } },
    ])
      expect(() =>
        parseFeedback(response as Envelope<Completion>, v),
      ).toThrow();
  });
  it("applies existing schema and quote grounding to feedback", () => {
    const sample = fullFeedbackSchema.parse({
      material: "insufficient",
      insufficient_reason: "Need more reflection.",
      summary: "A starting point.",
      strengths: [
        { point: "A lesson is stated.", evidence_quote: "Invented quotation." },
      ],
      primary_priority: {
        title: "Reflect",
        explanation: "Explain the change.",
        zh_note: null,
      },
      prompt_alignment: { status: "partly", explanation: "A lesson is named." },
      categories: [],
      passage_comments: [],
      revision_plan: [],
      voice_check: [],
      questions_for_student: ["What changed?"],
      limitations: "Limited material; this is coaching.",
    });
    const r = parseFeedback(
      { stopReason: "endTurn", content: { text: JSON.stringify(sample) } },
      v,
    );
    expect(
      (r.data as { strengths: { located: boolean }[] }).strengths[0].located,
    ).toBe(false);
    const wrapped = parseFeedback(
      {
        stopReason: "endTurn",
        content: {
          text: JSON.stringify({ type: "object", properties: sample }),
        },
      },
      v,
    );
    expect(wrapped.data).toEqual(r.data);
    expect(() =>
      parseFeedback(
        {
          stopReason: "endTurn",
          content: {
            text: JSON.stringify({
              type: "object",
              properties: { material: { type: "string" } },
            }),
          },
        },
        v,
      ),
    ).toThrow();
  });
});

it("normalizes official real-APS HTTP412 transport envelope without leaking payloads", () => {
  expect(
    errorCode(
      new Error(
        'storage.set HTTP 412: {"detail":{"error":{"code":"precondition_failed","message":"private payload"}}}',
      ),
    ),
  ).toBe("precondition_failed");
  expect(errorCode(new Error("sensitive unrecognized error"))).toBe(
    "request_failed",
  );
});
