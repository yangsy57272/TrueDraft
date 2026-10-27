"use client";
import type { ReactNode } from "react";
import { useI18n } from "@/i18n/client";

export function QuoteBlock({ quote, located = true }: { quote: string | null | undefined; located?: boolean }) {
  const { t } = useI18n();
  if (!quote) return null;
  return (
    <figure className="mt-2">
      <figcaption className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{t("feedback.inYourDraft")}</figcaption>
      <blockquote className="quote mt-1">“{quote}”</blockquote>
      {!located ? <p className="mt-1 text-xs text-amber">{t("feedback.quoteNotFound")}</p> : null}
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

export function Section({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
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
