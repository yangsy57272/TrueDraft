import "server-only";
import { getAiProviderKind, isAiConfigured } from "@/config/deployment";

export type StructuredRequest = {
  system: string;
  user: string;
  schemaName: string;
  jsonSchema: Record<string, unknown>;
  maxOutputTokens: number;
  /** Receives the accumulated raw output text while streaming (used only for progress stages). */
  onProgress?: (snapshot: string) => void;
  signal: AbortSignal;
};

export type StructuredResponse = { json: unknown; model: string; providerRef: string | null };

export type AiErrorCode =
  | "not_configured"
  | "unavailable"
  | "timeout"
  | "rate_limited"
  | "auth"
  | "refused"
  | "truncated"
  | "malformed"
  | "bad_request";

export class AiProviderError extends Error {
  constructor(
    public code: AiErrorCode,
    public retryable = false,
  ) {
    super(code);
    this.name = "AiProviderError";
  }
}

export interface AiProvider {
  kind: string;
  model: string;
  generate(request: StructuredRequest): Promise<StructuredResponse>;
}

export function aiSettings() {
  return {
    timeoutMs: Number(process.env.AI_TIMEOUT_MS ?? 120_000),
    maxRetries: Math.min(3, Number(process.env.AI_MAX_RETRIES ?? 1)),
    maxOutputTokens: Number(process.env.AI_MAX_OUTPUT_TOKENS ?? 16_000),
  };
}

/** Parse model text as JSON, tolerating a stray code fence. */
export function parseJsonText(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    throw new AiProviderError("malformed");
  }
}

export async function getProvider(): Promise<AiProvider> {
  if (!isAiConfigured()) throw new AiProviderError("not_configured");
  const kind = getAiProviderKind();
  if (kind === "anthropic") {
    const { AnthropicProvider } = await import("./anthropic");
    return new AnthropicProvider();
  }
  if (kind === "openai-compatible") {
    const { OpenAiCompatibleProvider } = await import("./openai-compatible");
    return new OpenAiCompatibleProvider();
  }
  if (kind === "mock") {
    const { MockProvider } = await import("./mock");
    return new MockProvider();
  }
  throw new AiProviderError("not_configured");
}
