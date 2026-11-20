"use client";
import { findQuoteEvidence } from "@/lib/feedback-evidence";

export function EvidenceTrace({
  draft,
  quote,
  zh,
}: {
  draft: string;
  quote: string;
  zh: boolean;
}) {
  const evidence = findQuoteEvidence(draft, quote);
  return (
    <details className="mt-3 rounded-lg border border-line p-3 text-sm">
      <summary className="cursor-pointer font-semibold">
        {zh ? "核对原文依据" : "Trace this to the source draft"}
      </summary>
      {evidence ? (
        <>
          <p className="mt-2">
            {zh
              ? `第 ${evidence.paragraph} 段 · 原文位置 ${evidence.start + 1}–${evidence.end}`
              : `Paragraph ${evidence.paragraph} · source characters ${evidence.start + 1}–${evidence.end}`}
          </p>
          <blockquote className="quote mt-2">{evidence.text}</blockquote>
          <p className="mt-2 text-xs">
            {zh
              ? "仅在匹配时统一标点、大小写与空白；文字匹配不代表反馈判断正确。"
              : "Matching normalizes punctuation, case and whitespace only. A located quote does not validate the advice."}
            {evidence.occurrences > 1
              ? zh
                ? ` 找到 ${evidence.occurrences} 处；这里显示第一处。`
                : ` Found ${evidence.occurrences} occurrences; showing the first.`
              : ""}
          </p>
        </>
      ) : (
        <p className="mt-2">
          {zh
            ? "未在这份原文中找到该引用。请核查反馈所用版本，不要把此引用当作已验证依据。"
            : "This quote was not found in this source draft. Check the analyzed version before relying on it."}
        </p>
      )}
    </details>
  );
}
