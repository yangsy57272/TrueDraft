export const LOCALES = ["en", "zh-CN"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "td_locale";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  "zh-CN": "简体中文",
};

/** Languages AI feedback can be returned in. "bilingual" = English with concise Chinese explanations. */
export const FEEDBACK_LANGUAGES = ["en", "zh-CN", "bilingual"] as const;
export type FeedbackLanguage = (typeof FEEDBACK_LANGUAGES)[number];

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function isFeedbackLanguage(value: unknown): value is FeedbackLanguage {
  return typeof value === "string" && (FEEDBACK_LANGUAGES as readonly string[]).includes(value);
}

export function htmlLang(locale: Locale) {
  return locale === "zh-CN" ? "zh-Hans" : "en";
}
