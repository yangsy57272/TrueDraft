import type { FinalRead, FullFeedback, SentenceFeedback, SentenceMode, ToolKind, WordCountHelp } from "./schemas";

/**
 * Post-validation guardrails applied to every AI result before it is stored or shown.
 *
 * - Quotes are checked against the student's actual draft; unlocatable quotes are flagged so the
 *   UI does not pretend they come from the essay.
 * - Sentence alternatives that are much longer than the selected passage are dropped, so the
 *   tool can't be used to generate new essay content.
 * - Word counts are computed on the server, never trusted from the model.
 */

export function normalizeForMatch(text: string) {
  return text
    .toLowerCase()
    .replace(/[‘’`´]/g, "'")
    .replace(/[“”«»„]/g, '"')
    .replace(/[…]/g, "...")
    .replace(/\s+/g, " ")
    .trim();
}

export function quoteAppearsIn(draft: string, quote: string | null | undefined) {
  if (!quote) return false;
  const q = normalizeForMatch(quote).replace(/^\.\.\.|\.\.\.$/g, "").trim();
  if (q.length < 3) return false;
  return normalizeForMatch(draft).includes(q);
}

export function maxAlternativeLength(selection: string) {
  return Math.max(160, Math.round(selection.length * 2) + 60);
}

type GuardContext = {
  draft: string;
  selection: string;
  mode?: SentenceMode;
  wordCount: number;
  wordLimit: number | null;
};

export function applyGuards(kind: ToolKind, data: unknown, ctx: GuardContext): unknown {
  switch (kind) {
    case "full_feedback": {
      const d = data as FullFeedback;
      return {
        ...d,
        strengths: d.strengths.map((s) => ({ ...s, located: quoteAppearsIn(ctx.draft, s.evidence_quote) })),
        categories: d.categories.map((c) => ({ ...c, located: quoteAppearsIn(ctx.draft, c.passage_quote) })),
        passage_comments: d.passage_comments.map((c) => ({ ...c, located: quoteAppearsIn(ctx.draft, c.quote) })),
        computed: { wordCount: ctx.wordCount, wordLimit: ctx.wordLimit },
      };
    }
    case "sentence": {
      const d = data as SentenceFeedback;
      const limit = maxAlternativeLength(ctx.selection);
      const allowAlternatives = ctx.mode !== "translate";
      const alternatives = allowAlternatives ? d.alternatives.filter((a) => a.text.trim() && a.text.length <= limit).slice(0, 2) : [];
      return {
        ...d,
        alternatives,
        removedAlternatives: d.alternatives.length - alternatives.length,
      };
    }
    case "word_count": {
      const d = data as WordCountHelp;
      const mark = <T extends { quote: string }>(items: T[]) => items.map((i) => ({ ...i, located: quoteAppearsIn(ctx.draft, i.quote) }));
      return {
        ...d,
        repeated_ideas: mark(d.repeated_ideas),
        unnecessary_setup: mark(d.unnecessary_setup),
        redundant_modifiers: mark(d.redundant_modifiers),
        condensable_passages: mark(d.condensable_passages),
        preserve: mark(d.preserve),
        computed: { wordCount: ctx.wordCount, wordLimit: ctx.wordLimit },
      };
    }
    case "final_read": {
      const d = data as FinalRead;
      const mark = <T extends { quote: string }>(items: T[]) => items.map((i) => ({ ...i, located: quoteAppearsIn(ctx.draft, i.quote) }));
      return {
        ...d,
        clarity_issues: mark(d.clarity_issues),
        grammar_issues: mark(d.grammar_issues),
        computed: { wordCount: ctx.wordCount, wordLimit: ctx.wordLimit },
      };
    }
    default:
      return data;
  }
}
