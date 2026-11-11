/** Public connection types only: never pass a credential to a client component. */
export type ConnectionProvider = "none" | "openai-compatible" | "anthropic";
export type AiConnectionSummary = {
  editable: boolean; provider: ConnectionProvider; baseUrl: string; model: string;
  hasKey: boolean; noKey: boolean; source: "saved" | "environment"; loadError: boolean;
};
export const AI_PRESETS = {
  openai: { provider: "openai-compatible", baseUrl: "https://api.openai.com/v1" },
  anthropic: { provider: "anthropic", baseUrl: "https://api.anthropic.com" },
  local: { provider: "openai-compatible", baseUrl: "http://127.0.0.1:8088/v1" },
  custom: { provider: "openai-compatible", baseUrl: "" },
} as const;
