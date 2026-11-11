import "server-only";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { isDesktopMode } from "@/config/production-guard";
import type { AiConnectionSummary, ConnectionProvider } from "@/lib/ai-connection";
import { decryptJson, encryptJson } from "../crypto";
import { ApiError } from "../errors";

export type AiConnection = {
  provider: ConnectionProvider | "mock"; baseUrl: string; model: string; apiKey: string;
  noKey: boolean; revision?: string; loadError?: boolean;
};
export const connectionInput = z.object({
  provider: z.enum(["none", "openai-compatible", "anthropic"]),
  baseUrl: z.string().trim().max(500).default(""),
  model: z.string().trim().max(200).default(""),
  apiKey: z.string().trim().max(4096).optional(),
  noKey: z.boolean().default(false),
});
export type ConnectionInput = z.infer<typeof connectionInput>;
const storedSchema = connectionInput.extend({ apiKey: z.string(), revision: z.string().uuid() });

export function aiSettingsEditable() {
  return isDesktopMode() && Boolean(process.env.TRUEDRAFT_AI_SETTINGS_PATH && process.env.TRUEDRAFT_DESKTOP_EMAIL);
}
function readSaved(): AiConnection | null {
  if (!aiSettingsEditable()) return null;
  const file = process.env.TRUEDRAFT_AI_SETTINGS_PATH!;
  if (!fs.existsSync(file)) return null;
  try {
    return storedSchema.parse(decryptJson(fs.readFileSync(file, "utf8"), "ai_configuration"));
  } catch {
    // Do not silently fall back to a different provider when a saved file cannot be read.
    return { provider: "none", baseUrl: "", model: "", apiKey: "", noKey: false, revision: "unreadable", loadError: true };
  }
}
export function getAiConnection(): AiConnection {
  const saved = readSaved();
  if (saved) return saved;
  const provider = ["anthropic", "openai-compatible", "mock"].includes(process.env.AI_PROVIDER ?? "") ? process.env.AI_PROVIDER as AiConnection["provider"] : "none";
  const apiKey = (provider === "anthropic" ? process.env.ANTHROPIC_API_KEY : process.env.AI_API_KEY) ?? "";
  return { provider, baseUrl: (provider === "anthropic" ? process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com" : process.env.AI_BASE_URL || "").replace(/\/$/, ""),
    model: process.env.AI_MODEL || (provider === "anthropic" ? "claude-opus-5-5" : ""), apiKey, noKey: !apiKey };
}
export function connectionOrigin() {
  try { return new URL(getAiConnection().baseUrl).origin; } catch { return "configured service"; }
}
export function connectionSummary(): AiConnectionSummary {
  const c = getAiConnection();
  let publicUrl = "";
  try {
    const url = new URL(c.baseUrl); url.username = ""; url.password = ""; url.search = ""; url.hash = "";
    publicUrl = url.toString().replace(/\/$/, "");
  } catch { /* A broken legacy URL can be replaced in settings. */ }
  return { editable: aiSettingsEditable(), provider: c.provider === "mock" ? "none" : c.provider,
    baseUrl: publicUrl, model: c.model, hasKey: Boolean(c.apiKey), noKey: c.noKey,
    source: c.revision ? "saved" : "environment", loadError: Boolean(c.loadError) };
}
export function normalizeAiUrl(value: string, provider: ConnectionProvider) {
  let url: URL;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
    const local = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(value) || /^[^/]+\.local(?::|\/|$)/i.test(value);
    value = `${local ? "http" : "https"}://${value}`;
  }
  try { url = new URL(value); } catch { throw new ApiError(400, "ai_url_invalid"); }
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.search) throw new ApiError(400, "ai_url_invalid");
  const local = /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|\[::1\])$/i.test(url.hostname) || url.hostname.endsWith(".local");
  if (url.protocol === "http:" && !local) throw new ApiError(400, "ai_https_required");
  url.hash = "";
  let pathname = url.pathname.replace(/\/+$/, "");
  if (provider === "openai-compatible") {
    pathname = pathname.replace(/\/chat\/completions$/, "").replace(/\/models$/, "");
    if (!pathname) pathname = "/v1";
  } else pathname = pathname.replace(/\/v1(?:\/messages)?$/, "");
  url.pathname = pathname;
  return url.toString().replace(/\/$/, "");
}
export function resolveConnection(input: ConnectionInput, requireModel = true): AiConnection {
  if (input.provider === "none") return { provider: "none", baseUrl: "", model: "", apiKey: "", noKey: false };
  const baseUrl = normalizeAiUrl(input.baseUrl, input.provider);
  const previous = getAiConnection();
  const sameDestination = previous.provider === input.provider && previous.baseUrl === baseUrl;
  const apiKey = input.noKey && input.provider === "openai-compatible" ? "" : input.apiKey || (sameDestination ? previous.apiKey : "");
  if (/\s/.test(apiKey)) throw new ApiError(400, "ai_key_invalid");
  if (!apiKey && (input.provider === "anthropic" || !input.noKey)) throw new ApiError(400, "ai_key_required");
  if (requireModel && !input.model) throw new ApiError(400, "ai_model_required");
  return { provider: input.provider, baseUrl, model: input.model, apiKey, noKey: !apiKey };
}
export function saveConnection(input: ConnectionInput) {
  if (!aiSettingsEditable()) throw new ApiError(403, "forbidden");
  const resolved = resolveConnection(input);
  const previous = readSaved();
  if (previous && !previous.loadError && previous.provider === resolved.provider && previous.baseUrl === resolved.baseUrl && previous.model === resolved.model && previous.apiKey === resolved.apiKey && previous.noKey === resolved.noKey) return connectionSummary();
  const connection = { ...resolved, revision: randomUUID() };
  const file = process.env.TRUEDRAFT_AI_SETTINGS_PATH!;
  const staging = `${file}.${randomUUID()}.tmp`;
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    fs.writeFileSync(staging, encryptJson(connection, "ai_configuration"), { mode: 0o600, flag: "wx" });
    fs.renameSync(staging, file);
  } finally { if (fs.existsSync(staging)) fs.unlinkSync(staging); }
  return connectionSummary();
}
