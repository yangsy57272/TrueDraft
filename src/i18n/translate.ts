import { brand } from "@/config/brand";
import type { Locale } from "./config";
import en, { type Messages } from "./messages/en";
import zhCN from "./messages/zh-CN";

export const MESSAGES: Record<Locale, Messages> = { en, "zh-CN": zhCN };

type Join<K, P> = K extends string ? (P extends string ? `${K}.${P}` : never) : never;
/** Dot-paths to string leaves of the message tree. */
export type MessageKey<T = Messages> = {
  [K in keyof T & string]: T[K] extends string ? K : T[K] extends readonly unknown[] ? never : Join<K, MessageKey<T[K]>>;
}[keyof T & string];

export type TranslateVars = Record<string, string | number>;

function lookup(messages: Messages, key: string): unknown {
  return key.split(".").reduce<unknown>((node, part) => (node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined), messages);
}

export function interpolate(template: string, vars: TranslateVars = {}) {
  return template.replace(/\{(\w+)\}/g, (match, name) => {
    if (name in vars) return String(vars[name]);
    if (name === "brand") return brand.name;
    return match;
  });
}

export function createTranslator(locale: Locale) {
  const messages = MESSAGES[locale];
  const t = (key: MessageKey, vars?: TranslateVars): string => {
    const value = lookup(messages, key) ?? lookup(MESSAGES.en, key);
    return typeof value === "string" ? interpolate(value, vars) : key;
  };
  return { t, messages, locale };
}

export type Translator = ReturnType<typeof createTranslator>["t"];

export function formatDate(date: Date | string, locale: Locale, withTime = false) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale === "zh-CN" ? "zh-CN" : "en-US", {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" } : {}),
  }).format(d);
}
