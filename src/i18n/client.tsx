"use client";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Locale } from "./config";
import { createTranslator } from "./translate";

const I18nContext = createContext<ReturnType<typeof createTranslator> | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo(() => createTranslator(locale), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
