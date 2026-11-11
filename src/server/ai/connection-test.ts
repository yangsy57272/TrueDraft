import "server-only";
import { ApiError } from "../errors";
import { OpenAiCompatibleProvider } from "./openai-compatible";
import { AnthropicProvider } from "./anthropic";
import { AiProviderError } from "./provider";
import { resolveConnection, type ConnectionInput } from "./connection-settings";

export async function testAiConnection(input: ConnectionInput, action: "models" | "test") {
  const c = resolveConnection(input, action === "test");
  if (c.provider === "none") throw new ApiError(400, "ai_provider_required");
  try {
    if (action === "models") {
      const headers: Record<string, string> = c.provider === "anthropic"
        ? { "x-api-key": c.apiKey, "anthropic-version": "2023-06-01" }
        : c.apiKey ? { Authorization: `Bearer ${c.apiKey}` } : {};
      const response = await fetch(`${c.baseUrl}${c.provider === "anthropic" ? "/v1" : ""}/models`, {
        headers, signal: AbortSignal.timeout(15_000), redirect: "error", cache: "no-store",
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new ApiError(400, response.status === 401 || response.status === 403 ? "ai_key_rejected" : "ai_models_unavailable");
      }
      const text = await response.text();
      if (text.length > 1_000_000) throw new ApiError(400, "ai_models_unavailable");
      const data = JSON.parse(text) as { data?: { id?: unknown }[] };
      const models = Array.isArray(data.data) ? [...new Set(data.data.flatMap(m => typeof m?.id === "string" && m.id.length <= 200 && (!c.apiKey || !m.id.includes(c.apiKey)) ? [m.id] : []))].slice(0, 300).sort() : [];
      if (!models.length) throw new ApiError(400, "ai_models_unavailable");
      return { models };
    }
    const provider = c.provider === "anthropic" ? new AnthropicProvider(undefined, c) : new OpenAiCompatibleProvider(c);
    const response = await provider.generate({
      system: "Connection test. Return only the JSON object {\"ok\":true}.", user: "Test connection. No personal data.",
      schemaName: "connection_test", jsonSchema: { type: "object", properties: { ok: { type: "boolean" } }, required: ["ok"], additionalProperties: false },
      maxOutputTokens: 128, signal: AbortSignal.timeout(60_000),
    });
    if (!response.json || typeof response.json !== "object" || (response.json as { ok?: unknown }).ok !== true) throw new ApiError(400, "ai_format_unsupported");
    return { connected: true, model: c.model };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof AiProviderError) {
      const codes: Partial<Record<typeof error.code, string>> = { auth: "ai_key_rejected", bad_request: "ai_format_unsupported", malformed: "ai_format_unsupported", truncated: "ai_format_unsupported", timeout: "ai_test_timeout", rate_limited: "ai_test_rate_limited" };
      throw new ApiError(400, codes[error.code] ?? "ai_connection_failed");
    }
    throw new ApiError(400, error instanceof Error && error.name === "TimeoutError" ? "ai_test_timeout" : "ai_connection_failed");
  }
}
