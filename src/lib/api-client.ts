"use client";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; code: string; details?: Record<string, string | number> };

/** JSON fetch helper for same-origin API calls. Never logs request or response bodies. */
export async function apiFetch<T = unknown>(url: string, init: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      method: init.method ?? "GET",
      headers: init.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: init.signal,
      credentials: "same-origin",
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return { ok: false, status: response.status, code: data?.error?.code ?? "internal_error", details: data?.error?.details };
    }
    return { ok: true, data: data as T };
  } catch (error) {
    if ((error as Error)?.name === "AbortError") return { ok: false, status: 0, code: "aborted" };
    return { ok: false, status: 0, code: "network" };
  }
}

export type AiStreamEvent =
  | { type: "stage"; stage: string }
  | { type: "done"; runId?: string; result?: unknown; isMock?: boolean; redactionCount?: number; [key: string]: unknown }
  | { type: "error"; code: string };

export type StreamOutcome<T = unknown> =
  | ({ ok: true; result: T; isMock: boolean; redactionCount: number; runId: string } & Record<string, unknown>)
  | { ok: false; code: string; status: number; details?: Record<string, string | number> };

/** Call an essay AI tool endpoint and surface its NDJSON progress events. */
export function runAiTool(essayId: string, kind: string, body: Record<string, unknown>, onStage: (stage: string) => void) {
  return runStreamingTool(`/api/essays/${essayId}/ai/${kind}`, body, onStage);
}

/** POST to any NDJSON-streaming AI endpoint and resolve with the final event. */
export async function runStreamingTool<T = unknown>(url: string, body: Record<string, unknown>, onStage: (stage: string) => void): Promise<StreamOutcome<T>> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "same-origin",
    });
  } catch {
    return { ok: false, code: "network", status: 0 };
  }
  if (!response.ok || !response.body) {
    const data = await response.json().catch(() => null);
    return { ok: false, code: data?.error?.code ?? "internal_error", status: response.status, details: data?.error?.details };
  }
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
        if (!line.trim()) continue;
        const event = JSON.parse(line) as AiStreamEvent;
        if (event.type === "stage") onStage(event.stage);
        if (event.type === "done") {
          const { type: _type, ...rest } = event as Record<string, unknown>;
          return { ok: true, runId: "", result: undefined as T, isMock: false, redactionCount: 0, ...rest } as StreamOutcome<T>;
        }
        if (event.type === "error") return { ok: false, code: event.code, status: 502 };
      }
    }
  } catch {
    return { ok: false, code: "network", status: 0 };
  }
  return { ok: false, code: "ai_unavailable", status: 502 };
}

/** Client-side id for new list items (falls back when crypto.randomUUID is unavailable). */
export function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
