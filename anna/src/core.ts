import { countWords } from "../../src/lib/wordcount";
import {
  buildSystemPrompt,
  buildUserMessage,
} from "../../src/server/ai/prompts";
import {
  fullFeedbackSchema,
  jsonSchemaFor,
  SCHEMA_VERSION,
} from "../../src/server/ai/schemas";
import { applyGuards } from "../../src/server/ai/guard";
import { redactIdentifiers } from "../../src/server/redact";
import type { FeedbackLanguage } from "../../src/i18n/config";
export const PREFIX = "truedraft/v1/";
export const MAX_TEXT = 20000;
export type Version = { id: string; prompt: string; draft: string; at: string };
export type Review = {
  versionId: string;
  language: FeedbackLanguage;
  data: unknown;
  usage?: unknown;
  model?: string;
  at: string;
};
export type RecordData = {
  schema: 1;
  id: string;
  retentionDays: number;
  versions: Version[];
  reviews: Review[];
  pending?: { id: string; versionId: string; at: string };
};
export type Envelope<T> =
  T | { ok: true; result: T } | { ok: false; error: { code: string } };
export type Stored = {
  exists: boolean;
  value?: RecordData;
  etag?: string;
  generation?: number;
};
export type Written = { etag: string; generation: number };
export type Listed = { items: { key: string }[]; next_cursor?: string };
export type Completion = {
  stopReason: string;
  content: { text: string };
  usage?: unknown;
  model?: string;
};
export type Host = {
  storage: {
    get: (a: { key: string }) => Promise<Envelope<Stored>>;
    set: (a: {
      key: string;
      value: unknown;
      if_match?: string;
      ttl_seconds?: number;
    }) => Promise<Envelope<Written>>;
    delete: (a: {
      key: string;
      if_match?: string;
    }) => Promise<Envelope<object>>;
    list: (a: {
      prefix: string;
      limit: number;
      cursor?: string;
    }) => Promise<Envelope<Listed>>;
  };
  llm: { complete: (a: object, b?: object) => Promise<Envelope<Completion>> };
};
export function result<T>(r: Envelope<T>): T {
  if (r && typeof r === "object" && "ok" in r) {
    if (r.ok === false)
      throw new Error(
        (r as { error: { code: string } }).error?.code || "host_error",
      );
    return (r as { result: T }).result;
  }
  return r as T;
}
export function errorCode(error: unknown): string {
  const known = [
    "precondition_failed",
    "aps_required",
    "APP_QUOTA_EXCEEDED",
    "APP_NOT_GRANTED",
    "input_limits",
    "not_found",
    "pending_analysis",
    "version_limit_export_first",
    "consent_required",
    "quota_exceeded",
    "invalid_feedback",
  ];
  const e = error as { code?: unknown; message?: unknown };
  for (const candidate of [e?.code, e?.message])
    if (typeof candidate === "string" && known.includes(candidate))
      return candidate;
  // The official real-APS dev bridge wraps HTTP errors as transport errors.
  const message = typeof e?.message === "string" ? e.message : "";
  const match = message.match(/"code"\s*:\s*"([A-Za-z_]+)"/);
  return match && known.includes(match[1]) ? match[1] : "request_failed";
}
export function validateInput(prompt: string, draft: string) {
  if (
    !prompt.trim() ||
    !draft.trim() ||
    prompt.length > 4000 ||
    draft.length > MAX_TEXT
  )
    throw new Error("input_limits");
}
export function key(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error("invalid_id");
  return PREFIX + id;
}
export async function read(host: Host, id: string) {
  const r = result(await host.storage.get({ key: key(id) }));
  if (!r?.exists) throw new Error("not_found");
  if (!r.etag || r.value?.schema !== 1 || r.value?.id !== id)
    throw new Error("aps_required");
  return { data: r.value as RecordData, etag: r.etag as string };
}
export async function write(host: Host, data: RecordData, etag?: string) {
  const r = result(
    await host.storage.set({
      key: key(data.id),
      value: data,
      ...(etag ? { if_match: etag } : {}),
      ttl_seconds: data.retentionDays * 86400,
    }),
  );
  if (!r?.etag || !Number.isInteger(r.generation))
    throw new Error("aps_required");
  return r.etag as string;
}
export async function probe(host: Host) {
  const k = "truedraft/probe/" + crypto.randomUUID();
  result(await host.storage.set({ key: k, value: 1, ttl_seconds: 60 }));
  try {
    try {
      result(
        await host.storage.set({
          key: k,
          value: 2,
          if_match: "deliberately-invalid-etag",
          ttl_seconds: 60,
        }),
      );
    } catch (e) {
      if (errorCode(e) === "precondition_failed") return;
      throw e;
    }
    throw new Error("aps_required");
  } finally {
    result(await host.storage.delete({ key: k }));
  }
}
export function request(v: Version, language: FeedbackLanguage) {
  validateInput(v.prompt, v.draft);
  return {
    systemPrompt:
      buildSystemPrompt("full_feedback", language) +
      "\nReturn feedback DATA only, never the JSON Schema itself. Do not use type/properties/required wrappers. Begin the top-level object with material. The following describes the required data shape: " +
      JSON.stringify(jsonSchemaFor("full_feedback")),
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: buildUserMessage({
            kind: "full_feedback",
            essayPrompt: redactIdentifiers(v.prompt).text,
            essay: redactIdentifiers(v.draft).text,
          }),
        },
      },
    ],
    maxTokens: 4096,
    temperature: 0.2,
  };
}
export function parseFeedback(response: Envelope<Completion>, v: Version) {
  const r = result(response);
  if (
    r?.stopReason !== "endTurn" ||
    typeof r.content?.text !== "string" ||
    r.content.text.length > 60000
  )
    throw new Error("invalid_feedback");
  const text = r.content.text
    .trim()
    .replace(/^```(?:json)?\s*/, "")
    .replace(/\s*```$/, "");
  const decoded: unknown = JSON.parse(text);
  // Some host models wrap DATA in a schema-shaped envelope. Unwrap only this exact
  // two-key form; the same complete feedback schema still validates every value.
  const envelope = decoded as { type?: unknown; properties?: unknown };
  const payload =
    decoded &&
    typeof decoded === "object" &&
    Object.keys(decoded).length === 2 &&
    envelope.type === "object" &&
    envelope.properties &&
    typeof envelope.properties === "object"
      ? envelope.properties
      : decoded;
  const parsed = fullFeedbackSchema.parse(payload);
  const data = applyGuards("full_feedback", parsed, {
    draft: redactIdentifiers(v.draft).text,
    selection: "",
    wordCount: countWords(v.draft),
    wordLimit: null,
  });
  return {
    data,
    usage: r.usage,
    model: r.model,
    schemaVersion: SCHEMA_VERSION,
  };
}
