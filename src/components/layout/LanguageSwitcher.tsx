"use client";
import { useRouter } from "next/navigation";
import { useId, useTransition } from "react";
import { LOCALE_LABELS, LOCALES, type Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import { apiFetch } from "@/lib/api-client";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const id = useId();

  async function change(next: Locale) {
    await apiFetch("/api/locale", { method: "POST", body: { locale: next } });
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className={compact ? "sr-only" : "text-sm font-medium text-ink-soft"}>
        {t("nav.language")}
      </label>
      <select
        id={id}
        className="input !min-h-9 !w-auto !py-1 text-sm"
        value={locale}
        disabled={pending}
        onChange={(e) => change(e.target.value as Locale)}
      >
        {LOCALES.map((l) => (
          <option key={l} value={l} lang={l === "zh-CN" ? "zh-Hans" : "en"}>
            {LOCALE_LABELS[l]}
          </option>
        ))}
      </select>
    </div>
  );
}
