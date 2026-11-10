import type { Translator } from "@/i18n/translate";
import type { Fit, FitCategory, FitReason } from "@/lib/fit";

/** Colour per bucket: rose for reach, indigo for target, green for safety. All pass AA with white text. */
export const BUCKET_STYLE: Record<FitCategory, { color: string; soft: string; icon: string }> = {
  reach: { color: "#be123c", soft: "#ffe4e6", icon: "▲" },
  target: { color: "#4338ca", soft: "#e0e7ff", icon: "●" },
  likely: { color: "#15803d", soft: "#dcfce7", icon: "▼" },
};

export function fitReasonText(t: Translator, r: FitReason) {
  switch (r.code) {
    case "very_selective":
    case "admit_rate":
      return t(`recommend.reasons.${r.code}`, { rate: r.rate });
    case "score": {
      const text = t(`recommend.reasons.score_${r.position}`, { test: r.test.toUpperCase(), student: r.student, low: r.low, high: r.high });
      return r.approximate ? `${text} · ${t("recommend.reasons.approximate")}` : text;
    }
    case "no_range":
      return t("recommend.reasons.no_range", { test: r.test.toUpperCase() });
    default:
      return t(`recommend.reasons.${r.code}`);
  }
}

/** "Suggested: Target" panel for a school page, with the reasons and a reminder that it isn't a prediction. */
export function FitPanel({ fit, t }: { fit: Fit; t: Translator }) {
  const style = BUCKET_STYLE[fit.category];
  return (
    <section className="mt-6 rounded-2xl p-4 text-sm" style={{ background: style.soft }} aria-labelledby="fit-h">
      <h2 id="fit-h" className="flex items-center gap-2 font-sans text-base font-semibold" style={{ color: style.color }}>
        <span aria-hidden="true">{style.icon}</span>
        {t("recommend.suggested", { category: t(`recommend.buckets.${fit.category}.title`) })}
      </h2>
      <ul className="mt-1 list-disc pl-5 text-ink-soft">
        {fit.reasons.map((r, i) => (
          <li key={i}>{fitReasonText(t, r)}</li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-ink-soft">{t("recommend.disclaimer1")}</p>
    </section>
  );
}
