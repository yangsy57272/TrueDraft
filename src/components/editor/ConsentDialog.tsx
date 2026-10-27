"use client";
import Link from "next/link";
import { useId, useState } from "react";
import { useI18n } from "@/i18n/client";
import { Dialog } from "@/components/ui/Dialog";
import type { WorkspaceAi } from "./types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ai: WorkspaceAi;
  onAgree: () => Promise<void>;
  onSaveOnly: () => Promise<void>;
};

/** Shown immediately before the first AI analysis (and again if the policy version changes). */
export function ConsentDialog({ open, onOpenChange, ai, onAgree, onSaveOnly }: Props) {
  const { t, messages } = useI18n();
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const uid = useId();
  const provider = ai.providerName ?? "—";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setError(false);
      }}
      title={t("consent.title")}
      wide
      description={<p>{t("consent.body", { provider })}</p>}
      footer={
        <>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onSaveOnly();
              setBusy(false);
            }}
          >
            {t("consent.saveOnly")}
          </button>
          <button
            type="button"
            className="btn btn-accent"
            disabled={busy}
            onClick={async () => {
              if (!checked) {
                setError(true);
                document.getElementById(`${uid}-check`)?.focus();
                return;
              }
              setBusy(true);
              await onAgree();
              setBusy(false);
              setChecked(false);
            }}
          >
            {t("consent.agree")}
          </button>
        </>
      }
    >
      <p className="text-sm">
        {t("consent.providerTraining", {
          status: ai.noTrainingConfirmed ? t("privacy.status.trainingProviderConfirmed") : t("privacy.status.trainingProviderUnconfirmed"),
        })}
      </p>
      <p className="mt-3 text-sm text-ink-soft">{t("consent.redaction")}</p>
      <details className="mt-4 rounded-lg border border-line bg-paper p-3">
        <summary className="cursor-pointer font-semibold">{t("consent.learnTitle")}</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {messages.consent.learnList.map((x, i) => <li key={i}>{x}</li>)}
        </ul>
        <p className="mt-3 text-sm">
          <strong>{t("consent.notSentTitle")}: </strong>
          {t("consent.notSent")}
        </p>
      </details>
      <div className="mt-4 flex items-start gap-3">
        <input
          id={`${uid}-check`}
          type="checkbox"
          className="mt-1 h-5 w-5 shrink-0 accent-teal"
          checked={checked}
          onChange={(e) => {
            setChecked(e.target.checked);
            setError(false);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${uid}-err` : undefined}
        />
        <label htmlFor={`${uid}-check`} className="text-sm font-medium">{t("consent.checkbox")}</label>
      </div>
      {error ? <p id={`${uid}-err`} className="field-error" role="alert">{t("consent.checkboxRequired")}</p> : null}
      <p className="mt-4 text-sm">
        <Link href="/privacy" target="_blank">{t("consent.fullPolicy")}</Link>
      </p>
    </Dialog>
  );
}
