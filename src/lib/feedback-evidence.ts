import { normalizeForMatch } from "../server/ai/guard";

/** Map the same punctuation/whitespace normalization used by the guard back to original offsets. */
export function findQuoteEvidence(draft: string, quote: string) {
  let normalized = "";
  const offsets: { start: number; end: number }[] = [];
  for (let i = 0; i < draft.length; i++) {
    const char = draft[i];
    const value = /\s/.test(char) ? " " : char.toLowerCase().replace(/[‘’`´]/g, "'").replace(/[“”«»„]/g, '"').replace(/…/g, "...");
    if (value === " " && (!normalized || normalized.endsWith(" "))) {
      if (offsets.length && normalized.endsWith(" ")) offsets[offsets.length - 1].end = i + 1;
      continue;
    }
    normalized += value;
    for (let j = 0; j < value.length; j++) offsets.push({ start: i, end: i + 1 });
  }
  const needle = normalizeForMatch(quote).replace(/^\.\.\.|\.\.\.$/g, "").trim();
  if (needle.length < 3) return null;
  const at = normalized.indexOf(needle);
  if (at < 0) return null;
  const start = offsets[at].start;
  const end = offsets[at + needle.length - 1].end;
  const paragraph = draft.slice(0, start).split(/\n\s*\n/).length;
  let occurrences = 0, next = 0;
  while ((next = normalized.indexOf(needle, next)) >= 0) { occurrences++; next += needle.length; }
  return { start, end, paragraph, occurrences, text: draft.slice(start, end) };
}
