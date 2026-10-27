import { normalizeForMatch } from "@/server/ai/guard";

type Mark = { start: number; end: number; priority: string };

/** Find a quote in the essay tolerant of whitespace / curly-quote differences. */
function locate(text: string, quote: string): { start: number; end: number } | null {
  const direct = text.indexOf(quote);
  if (direct >= 0) return { start: direct, end: direct + quote.length };
  // Build a normalized copy with an index map back to the original.
  const map: number[] = [];
  let norm = "";
  for (let i = 0; i < text.length; i++) {
    const ch = normalizeForMatch(text[i]) || (/\s/.test(text[i]) ? " " : "");
    if (ch === " " && norm.endsWith(" ")) continue;
    for (const c of ch) {
      norm += c;
      map.push(i);
    }
  }
  const q = normalizeForMatch(quote);
  const at = norm.indexOf(q);
  if (at < 0) return null;
  return { start: map[at], end: map[at + q.length - 1] + 1 };
}

/** Read-only essay with the commented passages highlighted (underline + label, not colour alone). */
export function HighlightedEssay({ text, quotes }: { text: string; quotes: { quote: string; priority: string }[] }) {
  const marks: Mark[] = [];
  for (const q of quotes) {
    const found = locate(text, q.quote);
    if (found && !marks.some((m) => found.start < m.end && found.end > m.start)) marks.push({ ...found, priority: q.priority });
  }
  marks.sort((a, b) => a.start - b.start);
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  marks.forEach((m, i) => {
    if (m.start > cursor) parts.push(text.slice(cursor, m.start));
    parts.push(
      <mark key={i} className="rounded-sm bg-amber-soft px-0.5 text-ink underline decoration-amber decoration-2 underline-offset-4">
        <sup className="mr-0.5 font-sans text-xs font-bold text-amber" aria-hidden="true">{i + 1}</sup>
        {text.slice(m.start, m.end)}
      </mark>,
    );
    cursor = m.end;
  });
  parts.push(text.slice(cursor));
  return <div className="card mt-3 whitespace-pre-wrap p-5 font-serif text-[1.05rem] leading-relaxed">{parts}</div>;
}
