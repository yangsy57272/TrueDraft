"use client";
import { useI18n } from "@/i18n/client";

/** Generic error boundary. Never shows stack traces or raw error messages. */
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const { t } = useI18n();
  return (
    <div className="container-prose py-20 text-center">
      <h1 className="text-3xl font-semibold">{t("errors.errorTitle")}</h1>
      <p className="mt-3 text-ink-soft">{t("common.unknownError")}</p>
      <button type="button" className="btn btn-primary mt-6" onClick={reset}>{t("common.tryAgain")}</button>
    </div>
  );
}
