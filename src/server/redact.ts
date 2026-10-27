/**
 * Best-effort removal of obvious direct identifiers before text is sent to an AI provider.
 * This NEVER changes what is saved; it only affects the copy sent for analysis.
 * Automated redaction is imperfect, and the UI says so.
 */

type Rule = { label: string; pattern: RegExp };

const RULES: Rule[] = [
  { label: "[EMAIL]", pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi },
  { label: "[URL]", pattern: /\bhttps?:\/\/[^\s<>"]+/gi },
  // Chinese resident identity card: 17 digits + digit or X
  { label: "[ID NUMBER]", pattern: /(?<!\d)\d{6}(?:18|19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx](?!\d)/g },
  // US SSN
  { label: "[ID NUMBER]", pattern: /(?<!\d)\d{3}-\d{2}-\d{4}(?!\d)/g },
  // Passport-like: 1-2 letters followed by 7-8 digits (e.g. E12345678)
  { label: "[ID NUMBER]", pattern: /\b[A-Z]{1,2}\d{7,8}\b/g },
  // Chinese mobile numbers, optionally with +86
  { label: "[PHONE]", pattern: /(?:\+?86[\s-]?)?(?<!\d)1[3-9]\d[\s-]?\d{4}[\s-]?\d{4}(?!\d)/g },
  // International / North American phone numbers with separators
  { label: "[PHONE]", pattern: /(?:\+\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}(?!\d)/g },
  // Long digit runs that look like account or card numbers
  { label: "[NUMBER]", pattern: /(?<!\d)(?:\d[ -]?){12,19}(?!\d)/g },
];

export type RedactionResult = { text: string; count: number };

export function redactIdentifiers(input: string): RedactionResult {
  let text = input;
  let count = 0;
  for (const rule of RULES) {
    text = text.replace(rule.pattern, () => {
      count += 1;
      return rule.label;
    });
  }
  return { text, count };
}
