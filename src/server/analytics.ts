import "server-only";

/**
 * Product analytics boundary.
 *
 * TrueDraft ships with NO third-party analytics, advertising, or session-replay tools. This module
 * is the single place future aggregate analytics could be added. It only accepts a fixed set of
 * event names and enumerated/numeric properties; free text is rejected so essays, prompts, and
 * feedback can never be sent to an analytics provider.
 */

export const ANALYTICS_EVENTS = [
  "essay_created",
  "version_saved",
  "feedback_requested",
  "feedback_completed",
  "feedback_failed",
  "tool_used",
  "account_deleted",
] as const;
export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

const ALLOWED_PROPS: Record<string, "enum" | "number"> = {
  kind: "enum",
  language: "enum",
  applicationType: "enum",
  wordCountBucket: "enum",
  status: "enum",
};
const ENUM_PATTERN = /^[a-z0-9_-]{1,32}$/i;

export type AnalyticsSink = (event: AnalyticsEvent, props: Record<string, string | number>) => void;

let sink: AnalyticsSink | null = null;

/** Register a sink (none by default). Exposed for tests and future self-hosted aggregation. */
export function setAnalyticsSink(next: AnalyticsSink | null) {
  sink = next;
}

export function sanitizeAnalyticsProps(props: Record<string, unknown>): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(props)) {
    const kind = ALLOWED_PROPS[key];
    if (!kind) continue;
    if (kind === "number" && typeof value === "number" && Number.isFinite(value)) out[key] = value;
    if (kind === "enum" && typeof value === "string" && ENUM_PATTERN.test(value)) out[key] = value;
  }
  return out;
}

export function track(event: AnalyticsEvent, props: Record<string, unknown> = {}) {
  if (!sink || !ANALYTICS_EVENTS.includes(event)) return;
  sink(event, sanitizeAnalyticsProps(props));
}

export function wordCountBucket(count: number): string {
  if (count < 100) return "lt100";
  if (count < 300) return "100_299";
  if (count < 500) return "300_499";
  if (count < 700) return "500_699";
  return "700plus";
}
