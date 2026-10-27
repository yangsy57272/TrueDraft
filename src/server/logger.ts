import "server-only";

/**
 * Minimal structured logger.
 *
 * Privacy rule: log calls accept an event name plus a small set of scalar fields. Only allow-listed
 * keys are written, and string values are capped, so essay text, prompts, notes, or AI output can't
 * end up in application logs even if a caller passes them by mistake.
 */

const ALLOWED_KEYS = new Set([
  "userId",
  "essayId",
  "versionId",
  "runId",
  "kind",
  "status",
  "code",
  "provider",
  "model",
  "promptVersion",
  "durationMs",
  "attempt",
  "httpStatus",
  "route",
  "count",
  "errorName",
  "redactions",
]);

const MAX_STRING = 80;

type Scalar = string | number | boolean | null | undefined;
export type LogFields = Record<string, Scalar>;

export function sanitizeLogFields(fields: LogFields = {}): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (!ALLOWED_KEYS.has(key) || value === undefined) continue;
    if (typeof value === "string") {
      out[key] = value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value;
    } else {
      out[key] = value;
    }
  }
  return out;
}

function write(level: "info" | "warn" | "error", event: string, fields?: LogFields) {
  if (process.env.LOG_LEVEL === "silent") return;
  const line = JSON.stringify({ level, event, time: new Date().toISOString(), ...sanitizeLogFields(fields) });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export const logger = {
  info: (event: string, fields?: LogFields) => write("info", event, fields),
  warn: (event: string, fields?: LogFields) => write("warn", event, fields),
  error: (event: string, fields?: LogFields) => write("error", event, fields),
};

/** Describe an unknown error without including its message (which may echo user content). */
export function errorName(error: unknown): string {
  if (error instanceof Error) return error.name || "Error";
  return typeof error;
}
