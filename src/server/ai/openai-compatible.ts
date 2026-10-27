import "server-only";
import { AiProviderError, parseJsonText, type AiProvider, type StructuredRequest, type StructuredResponse } from "./provider";

/**
 * Generic adapter for any provider exposing an OpenAI-compatible Chat Completions endpoint with
 * JSON-schema response formats (for example a self-hosted gateway or a regional provider).
 * Configure AI_BASE_URL, AI_API_KEY, and AI_MODEL.
 */
export class OpenAiCompatibleProvider implements AiProvider {
  kind = "openai-compatible";
  model = process.env.AI_MODEL || "";
  private baseUrl = (process.env.AI_BASE_URL || "").replace(/\/$/, "");

  async generate(request: StructuredRequest): Promise<StructuredResponse> {
    const temperature = process.env.AI_TEMPERATURE ? Number(process.env.AI_TEMPERATURE) : 0.3;
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        signal: request.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.AI_API_KEY}` },
        body: JSON.stringify({
          model: this.model,
          stream: true,
          temperature,
          max_tokens: request.maxOutputTokens,
          messages: [
            { role: "system", content: request.system },
            { role: "user", content: request.user },
          ],
          response_format: {
            type: "json_schema",
            json_schema: { name: request.schemaName, strict: true, schema: request.jsonSchema },
          },
        }),
      });
    } catch {
      throw new AiProviderError(request.signal.aborted ? "timeout" : "unavailable", true);
    }

    if (!response.ok || !response.body) {
      await response.body?.cancel();
      if (response.status === 401 || response.status === 403) throw new AiProviderError("auth");
      if (response.status === 429) throw new AiProviderError("rate_limited", true);
      if (response.status === 400 || response.status === 404) throw new AiProviderError("bad_request");
      throw new AiProviderError("unavailable", response.status >= 500);
    }

    let text = "";
    let finishReason: string | null = null;
    let id: string | null = null;
    let model = this.model;
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = "";
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();
          if (data === "[DONE]") continue;
          let chunk: {
            id?: string;
            model?: string;
            choices?: { delta?: { content?: string; refusal?: string }; finish_reason?: string | null }[];
          };
          try {
            chunk = JSON.parse(data);
          } catch {
            continue;
          }
          id = chunk.id ?? id;
          model = chunk.model ?? model;
          const choice = chunk.choices?.[0];
          if (choice?.delta?.refusal) throw new AiProviderError("refused");
          if (choice?.delta?.content) {
            text += choice.delta.content;
            request.onProgress?.(text);
          }
          if (choice?.finish_reason) finishReason = choice.finish_reason;
        }
      }
    } catch (error) {
      if (error instanceof AiProviderError) throw error;
      throw new AiProviderError(request.signal.aborted ? "timeout" : "unavailable", true);
    }
    if (finishReason === "length") throw new AiProviderError("truncated");
    if (finishReason === "content_filter") throw new AiProviderError("refused");
    return { json: parseJsonText(text), model, providerRef: id };
  }
}
