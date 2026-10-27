import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { AiProviderError, parseJsonText, type AiProvider, type StructuredRequest, type StructuredResponse } from "./provider";

type Effort = "low" | "medium" | "high" | "xhigh" | "max";

/**
 * Claude via the official Anthropic SDK, using structured outputs (output_config.format) and
 * streaming. SDK-level retries are disabled; the orchestrator owns retry policy.
 */
export class AnthropicProvider implements AiProvider {
  kind = "anthropic";
  model = process.env.AI_MODEL || "claude-opus-5-5";
  private client: Anthropic;

  /** `fetchImpl` is only for tests; production uses the SDK's default HTTP client. */
  constructor(fetchImpl?: typeof fetch) {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      baseURL: process.env.ANTHROPIC_BASE_URL || undefined,
      maxRetries: 0,
      ...(fetchImpl ? { fetch: fetchImpl } : {}),
    });
  }

  async generate(request: StructuredRequest): Promise<StructuredResponse> {
    const effort = (process.env.AI_EFFORT || "medium") as Effort;
    try {
      const stream = this.client.messages.stream(
        {
          model: this.model,
          max_tokens: request.maxOutputTokens,
          system: request.system,
          messages: [{ role: "user", content: request.user }],
          output_config: { effort, format: { type: "json_schema", schema: request.jsonSchema } },
        },
        { signal: request.signal },
      );
      if (request.onProgress) {
        stream.on("text", (_delta, snapshot) => request.onProgress?.(snapshot));
      }
      const message = await stream.finalMessage();

      if (message.stop_reason === "refusal") throw new AiProviderError("refused");
      if (message.stop_reason === "max_tokens") throw new AiProviderError("truncated");
      const textOut = message.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");
      return { json: parseJsonText(textOut), model: message.model, providerRef: message.id };
    } catch (error) {
      throw mapAnthropicError(error, request.signal);
    }
  }
}

function mapAnthropicError(error: unknown, signal: AbortSignal): AiProviderError {
  if (error instanceof AiProviderError) return error;
  if (signal.aborted) return new AiProviderError("timeout", true);
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return new AiProviderError("auth");
  }
  if (error instanceof Anthropic.RateLimitError) return new AiProviderError("rate_limited", true);
  if (error instanceof Anthropic.BadRequestError || error instanceof Anthropic.NotFoundError) {
    return new AiProviderError("bad_request");
  }
  if (error instanceof Anthropic.APIConnectionTimeoutError) return new AiProviderError("timeout", true);
  if (error instanceof Anthropic.APIUserAbortError) return new AiProviderError("timeout", true);
  if (error instanceof Anthropic.APIConnectionError) return new AiProviderError("unavailable", true);
  if (error instanceof Anthropic.APIError) {
    const status = error.status ?? 0;
    return new AiProviderError("unavailable", status >= 500 || status === 408 || status === 409);
  }
  return new AiProviderError("unavailable", true);
}
