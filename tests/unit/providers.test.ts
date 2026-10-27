import { afterEach, describe, expect, it, vi } from "vitest";
import { AnthropicProvider } from "@/server/ai/anthropic";
import { OpenAiCompatibleProvider } from "@/server/ai/openai-compatible";
import { AiProviderError } from "@/server/ai/provider";
import { jsonSchemaFor } from "@/server/ai/schemas";

const sse = (events: { event?: string; data: unknown }[]) =>
  new Response(events.map((e) => `${e.event ? `event: ${e.event}\n` : ""}data: ${JSON.stringify(e.data)}\n\n`).join(""), {
    headers: { "content-type": "text/event-stream" },
  });

function anthropicStream(text: string, stopReason = "end_turn") {
  return sse([
    { event: "message_start", data: { type: "message_start", message: { id: "msg_1", type: "message", role: "assistant", model: "claude-opus-5-5", content: [], stop_reason: null, usage: { input_tokens: 10, output_tokens: 0 } } } },
    { event: "content_block_start", data: { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } } },
    { event: "content_block_delta", data: { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: text.slice(0, 5) } } },
    { event: "content_block_delta", data: { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: text.slice(5) } } },
    { event: "content_block_stop", data: { type: "content_block_stop", index: 0 } },
    { event: "message_delta", data: { type: "message_delta", delta: { stop_reason: stopReason }, usage: { output_tokens: 20 } } },
    { event: "message_stop", data: { type: "message_stop" } },
  ]);
}

const request = (signal = new AbortController().signal) => ({
  system: "SYSTEM",
  user: "USER",
  schemaName: "brainstorm",
  jsonSchema: jsonSchemaFor("brainstorm"),
  maxOutputTokens: 1000,
  signal,
});

afterEach(() => vi.unstubAllGlobals());

describe("Anthropic adapter", () => {
  it("sends a structured-output streaming request and parses the result", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    let body: Record<string, unknown> = {};
    let headers: Headers = new Headers();
    const fetchImpl = vi.fn(async (_url: unknown, init?: RequestInit) => {
      body = JSON.parse(String(init?.body));
      headers = new Headers(init?.headers);
      return anthropicStream('{"acknowledgement":"Hi","questions":["Why?"],"threads_noticed":[],"boundary_note":null}');
    });
    const snapshots: string[] = [];
    const provider = new AnthropicProvider(fetchImpl as unknown as typeof fetch);
    const res = await provider.generate({ ...request(), onProgress: (s) => snapshots.push(s) });

    expect(res.json).toEqual({ acknowledgement: "Hi", questions: ["Why?"], threads_noticed: [], boundary_note: null });
    expect(res.providerRef).toBe("msg_1");
    expect(body.stream).toBe(true);
    expect(body.system).toBe("SYSTEM");
    expect(body.model).toBe(process.env.AI_MODEL || "claude-opus-5-5");
    expect(body.output_config).toMatchObject({ effort: "medium", format: { type: "json_schema" } });
    expect(body).not.toHaveProperty("temperature");
    expect(`${headers.get("x-api-key") ?? ""} ${headers.get("authorization") ?? ""}`).toContain("test-key");
    expect(snapshots.length).toBeGreaterThan(0);
  });

  it("maps refusals, truncation, and HTTP errors to safe error codes", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    const run = (response: Response) => new AnthropicProvider((async () => response) as unknown as typeof fetch).generate(request());
    await expect(run(anthropicStream("{}", "refusal"))).rejects.toMatchObject({ code: "refused" });
    await expect(run(anthropicStream('{"a":', "max_tokens"))).rejects.toMatchObject({ code: "truncated" });
    const err = (status: number) => new Response(JSON.stringify({ type: "error", error: { type: "x", message: "raw provider detail" } }), { status, headers: { "content-type": "application/json" } });
    await expect(run(err(401))).rejects.toMatchObject({ code: "auth", retryable: false });
    await expect(run(err(429))).rejects.toMatchObject({ code: "rate_limited", retryable: true });
    await expect(run(err(529))).rejects.toMatchObject({ code: "unavailable", retryable: true });
    await expect(run(err(400))).rejects.toBeInstanceOf(AiProviderError);
  });
});

describe("OpenAI-compatible adapter", () => {
  it("requests strict JSON-schema output and assembles streamed content", async () => {
    process.env.AI_BASE_URL = "https://llm.example/v1";
    process.env.AI_API_KEY = "k";
    process.env.AI_MODEL = "some-model";
    let body: Record<string, any> = {}; // eslint-disable-line @typescript-eslint/no-explicit-any
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      expect(url).toBe("https://llm.example/v1/chat/completions");
      body = JSON.parse(String(init.body));
      return sse([
        { data: { id: "c1", model: "some-model", choices: [{ delta: { content: '{"acknowledgement":"Hi",' } }] } },
        { data: { id: "c1", choices: [{ delta: { content: '"questions":[],"threads_noticed":[],"boundary_note":null}' }, finish_reason: "stop" }] } },
      ]);
    });
    const res = await new OpenAiCompatibleProvider().generate(request());
    expect(res.json).toMatchObject({ acknowledgement: "Hi" });
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(body.temperature).toBeLessThanOrEqual(0.5);
    expect(body.messages[0]).toEqual({ role: "system", content: "SYSTEM" });
    delete process.env.AI_MODEL;
  });

  it("treats a length cut-off as truncated output", async () => {
    process.env.AI_BASE_URL = "https://llm.example/v1";
    vi.stubGlobal("fetch", async () => sse([{ data: { choices: [{ delta: { content: '{"a":' }, finish_reason: "length" }] } }]));
    await expect(new OpenAiCompatibleProvider().generate(request())).rejects.toMatchObject({ code: "truncated" });
  });
});
