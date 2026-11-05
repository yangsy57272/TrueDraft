"use client";
import { createContext, useContext, type ReactNode } from "react";
import { useI18n } from "@/i18n/client";

/** Provided by the essay workspace: select a quoted passage in the editor. */
export const ShowPassageContext = createContext<((quote: string) => void) | null>(null);

export function QuoteBlock({ quote, located = true }: { quote: string | null | undefined; located?: boolean }) {
  const { t } = useI18n();
  const showPassage = useContext(ShowPassageContext);
  if (!quote) return null;
  return (
    <figure className="mt-2">
      <figcaption className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{t("feedback.inYourDraft")}</figcaption>
      <blockquote className="quote mt-1">“{quote}”</blockquote>
      {!located ? <p className="mt-1 text-xs text-amber">{t("feedback.quoteNotFound")}</p> : null}
      {located && showPassage ? (
        <button type="button" className="mt-1 text-xs font-semibold text-teal underline underline-offset-4" onClick={() => showPassage(quote)}>
          {t("feedback.showPassage")}
        </button>
      ) : null}
    </figure>
  );
}

export function ZhNote({ text }: { text: string | null | undefined }) {
  const { t } = useI18n();
  if (!text) return null;
  return (
    <p className="mt-2 rounded-md bg-sage-soft px-3 py-2 text-sm" lang="zh-Hans">
      <span className="font-semibold">{t("feedback.chineseNote")}：</span>
      {text}
    </p>
  );
}

const LABEL_STYLE: Record<string, { cls: string; icon: string }> = {
  strong_foundation: { cls: "badge-strong", icon: "●" },
  developing: { cls: "badge-developing", icon: "◐" },
  needs_attention: { cls: "badge-attention", icon: "○" },
};

export function DiagnosticBadge({ label }: { label: string }) {
  const { t } = useI18n();
  const style = LABEL_STYLE[label] ?? LABEL_STYLE.developing;
  return (
    <span className={`badge ${style.cls}`}>
      <span aria-hidden="true">{style.icon}</span>
      {t(`feedback.label.${label}` as never)}
    </span>
  );
}

const PRIORITY_STYLE: Record<string, { cls: string; icon: string }> = {
  high: { cls: "badge-attention", icon: "▲" },
  medium: { cls: "badge-developing", icon: "■" },
  low: { cls: "badge-neutral", icon: "▽" },
};

export function PriorityBadge({ priority }: { priority: string }) {
  const { t } = useI18n();
  const style = PRIORITY_STYLE[priority] ?? PRIORITY_STYLE.low;
  return (
    <span className={`badge ${style.cls}`}>
      <span aria-hidden="true">{style.icon}</span>
      {t(`feedback.priority.${priority}` as never)}
    </span>
  );
}

export function Section({ title, children, id, collapsible = false, defaultOpen = true }: { title: string; children: ReactNode; id?: string; collapsible?: boolean; defaultOpen?: boolean }) {
  if (collapsible) {
    return (
      <details className="group mt-4 rounded-xl border border-line bg-card first:mt-0" open={defaultOpen}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3">
          <h3 id={id} className="font-serif text-base font-semibold">{title}</h3>
          <span aria-hidden="true" className="text-ink-soft transition group-open:rotate-180">▾</span>
        </summary>
        <div className="border-t border-line px-4 py-3">{children}</div>
      </details>
    );
  }
  return (
    <section aria-labelledby={id} className="mt-8 first:mt-0">
      <h3 id={id} className="font-serif text-lg font-semibold">
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function BoundaryNote({ text }: { text: string | null | undefined }) {
  const { t } = useI18n();
  if (!text) return null;
  return (
    <div className="notice notice-info mt-3">
      <strong>{t("tools.boundary")}: </strong>
      {text}
    </div>
  );
}
