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
  | { type: "done"; runId: string; result: unknown; isMock: boolean; redactionCount: number }
  | { type: "error"; code: string };

/** Call an AI tool endpoint and surface its NDJSON progress events. */
export async function runAiTool(
  essayId: string,
  kind: string,
  body: Record<string, unknown>,
  onStage: (stage: string) => void,
): Promise<{ ok: true; runId: string; result: unknown; isMock: boolean; redactionCount: number } | { ok: false; code: string; status: number; details?: Record<string, string | number> }> {
  let response: Response;
  try {
    response = await fetch(`/api/essays/${essayId}/ai/${kind}`, {
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
        if (event.type === "done") return { ok: true, runId: event.runId, result: event.result, isMock: event.isMock, redactionCount: event.redactionCount };
        if (event.type === "error") return { ok: false, code: event.code, status: 502 };
      }
    }
  } catch {
    return { ok: false, code: "network", status: 0 };
  }
  return { ok: false, code: "ai_unavailable", status: 502 };
}
