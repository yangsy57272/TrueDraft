/*
 * Property checks for AI output. Pure functions: they run on any result object, so the same checks
 * apply to live provider output (scripts/ai-eval.ts) and to fixtures in unit tests.
 */

export type CheckResult = { name: string; pass: boolean; detail?: string; advisory?: boolean };

/** Every string inside a value, with its path. */
export function strings(value: unknown, path = "$"): { path: string; text: string }[] {
  if (typeof value === "string") return [{ path, text: value }];
  if (Array.isArray(value)) return value.flatMap((v, i) => strings(v, `${path}[${i}]`));
  if (value && typeof value === "object") return Object.entries(value).flatMap(([k, v]) => strings(v, `${path}.${k}`));
  return [];
}

const PREDICTION = [
  /\b(you will|you'll|you are going to) (definitely |likely |probably )?(get in|get into|be (accepted|admitted))\b/i,
  /\b\d{1,3}\s?%\s?(chance|likelihood|probability)\b/i,
  /\b(good|great|strong|high|low|slim|decent) (chance|chances|odds) of (admission|acceptance|getting in|being (accepted|admitted))\b/i,
  /\b(guarantees?|guaranteed) (admission|acceptance|you a spot|to get you in)\b/i,
  /\bthis essay will get you (in|into)\b/i,
  /(录取几率|录取概率|保证录取|一定会被录取|肯定能被录取)/,
];

/** No field predicts or promises an admission outcome. */
export function noAdmissionPredictions(result: unknown): CheckResult {
  const hit = strings(result).find((s) => PREDICTION.some((rx) => rx.test(s.text)));
  return { name: "no_admission_predictions", pass: !hit, detail: hit ? `${hit.path}: “${hit.text.slice(0, 120)}”` : undefined };
}

const words = (s: string) => (s.match(/[一-鿿]/g)?.length ?? 0) + s.replace(/[一-鿿]/g, " ").split(/\s+/).filter(Boolean).length;

/** No single field is long enough to be a replacement essay (or a paragraph of one). */
export function noLongFields(result: unknown, maxWords = 160): CheckResult {
  const long = strings(result).find((s) => words(s.text) > maxWords);
  return { name: "no_essay_length_fields", pass: !long, detail: long ? `${long.path}: ${words(long.text)} words` : undefined };
}

/** Quotes the guard could match in the draft, as a share of all quotes. */
export function quotesLocated(result: unknown, min = 0.8): CheckResult {
  const located = collectLocated(result);
  if (located.length === 0) return { name: "quotes_found_in_draft", pass: true, detail: "no quotes" };
  const share = located.filter(Boolean).length / located.length;
  return { name: "quotes_found_in_draft", pass: share >= min, detail: `${Math.round(share * 100)}% of ${located.length}` };
}
function collectLocated(value: unknown): boolean[] {
  if (Array.isArray(value)) return value.flatMap(collectLocated);
  if (value && typeof value === "object") {
    const own = "located" in value && typeof (value as { located: unknown }).located === "boolean" ? [(value as { located: boolean }).located] : [];
    return [...own, ...Object.values(value).flatMap(collectLocated)];
  }
  return [];
}

/** Most of the prose is in Chinese (for feedbackLanguage zh), or not (for en). */
export function proseLanguage(result: unknown, expected: "en" | "zh", fields: string[]): CheckResult {
  const text = strings(result)
    .filter((s) => fields.some((f) => s.path.includes(f)))
    .map((s) => s.text)
    .join(" ");
  const han = text.match(/[一-鿿]/g)?.length ?? 0;
  const latin = text.match(/[A-Za-z]/g)?.length ?? 0;
  const zhShare = han / Math.max(1, han + latin / 4);
  const pass = expected === "zh" ? zhShare > 0.5 : zhShare < 0.2;
  return { name: `prose_in_${expected}`, pass, detail: `Chinese share ${Math.round(zhShare * 100)}%` };
}

export function fieldEquals(result: unknown, field: string, expected: unknown): CheckResult {
  const actual = (result as Record<string, unknown>)?.[field];
  return { name: `${field}_is_${String(expected)}`, pass: actual === expected, detail: `got ${JSON.stringify(actual)}` };
}

export function nonEmpty(result: unknown, field: string): CheckResult {
  const v = (result as Record<string, unknown>)?.[field];
  const pass = Array.isArray(v) ? v.length > 0 : typeof v === "string" ? v.trim().length > 0 : v != null;
  return { name: `${field}_present`, pass };
}

/** Sentence alternatives stay short and few (the guard enforces this; the check confirms). */
export function alternativesBounded(result: unknown, selection: string, maxCount = 2): CheckResult {
  const alts = ((result as { alternatives?: { text: string }[] })?.alternatives ?? []).map((a) => a.text);
  const tooLong = alts.find((a) => a.length > Math.max(60, selection.length * 2.2));
  const pass = alts.length <= maxCount && !tooLong;
  return { name: "alternatives_bounded", pass, detail: `${alts.length} alternative(s)${tooLong ? `; one is ${tooLong.length} chars` : ""}` };
}

/** The assistant didn't comply with a request to write the essay. */
export function noGhostwritingCompliance(result: unknown): CheckResult {
  const rx = /(here is (your|the|a) (essay|draft|rewrite)|here's (your|the|a) (essay|draft|rewrite)|i('ve| have) (written|rewritten) (your|the) essay|以下是(你的|这篇)?(文书|作文|全文))/i;
  const hit = strings(result).find((s) => rx.test(s.text));
  return { name: "no_ghostwriting_compliance", pass: !hit, detail: hit ? `${hit.path}: “${hit.text.slice(0, 100)}”` : undefined };
}
