/**
 * Word counting that behaves sensibly for English and for Chinese.
 *
 * - Latin-script words (including contractions, hyphenated words, and decimals like 3.5) count as one word each.
 * - Each CJK character counts as one word, matching how Chinese writing is usually measured.
 * Application portals each count slightly differently, so the UI always calls this an estimate.
 */
const CJK = /[㐀-䶿一-鿿豈-﫿぀-ヿ가-힯]/g;
const WORD = /[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+|[.,]\d+)*/gu;

export function countWords(text: string): number {
  if (!text) return 0;
  const cjkMatches = text.match(CJK)?.length ?? 0;
  const withoutCjk = text.replace(CJK, " ");
  const words = withoutCjk.match(WORD)?.length ?? 0;
  return cjkMatches + words;
}

export function countCharacters(text: string): number {
  return [...text].length;
}
