"use client";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useI18n } from "@/i18n/client";
import { FEEDBACK_LANGUAGES, LOCALE_LABELS, LOCALES, type FeedbackLanguage, type Locale } from "@/i18n/config";
import { formatDate } from "@/i18n/translate";
import { apiFetch } from "@/lib/api-client";
import { RETENTION_OPTIONS, type RetentionOption } from "@/lib/constants";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toaster";

type Props = {
  email: string;
  displayName: string;
  preferredLanguage: Locale;
  feedbackLanguage: FeedbackLanguage;
  retention: string;
  consent: { grantedAt: string; policyVersion: string; current: boolean } | null;
};

export function SettingsClient(props: Props) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const notify = useToast();
  const uid = useId();
  const [prefs, setPrefs] = useState({ preferredLanguage: props.preferredLanguage, feedbackLanguage: props.feedbackLanguage, displayName: props.displayName });
  const [retention, setRetention] = useState<RetentionOption>(props.retention as RetentionOption);
  const [busy, setBusy] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [confirmError, setConfirmError] = useState(false);

  async function savePrefs(e: React.FormEvent) {
    e.preventDefault();
    setBusy("prefs");
    const res = await apiFetch("/api/account/preferences", { method: "PATCH", body: prefs });
    setBusy(null);
    if (res.ok) {
      notify(t("settings.prefsSaved"));
      router.refresh();
    } else notify(t(`errors.${res.code}` as never), "error");
  }

  async function saveRetention(e: React.FormEvent) {
    e.preventDefault();
    setBusy("retention");
    const res = await apiFetch<{ purged: number }>("/api/account/retention", { method: "POST", body: { retention } });
    setBusy(null);
    if (res.ok) {
      notify(res.data.purged ? `${t("settings.retentionSaved")} ${t("settings.retentionPurged", { count: res.data.purged })}` : t("settings.retentionSaved"));
      router.refresh();
    } else notify(t(`errors.${res.code}` as never), "error");
  }

  async function withdraw() {
    setBusy("consent");
    const res = await apiFetch("/api/consent", { method: "POST", body: { consentType: "ai_processing", action: "withdraw" } });
    setBusy(null);
    if (res.ok) {
      notify(t("settings.withdrawn"));
      router.refresh();
    } else notify(t(`errors.${res.code}` as never), "error");
  }

  async function deleteAccount() {
    if (confirmText.trim() !== t("settings.deleteConfirmWord")) {
      setConfirmError(true);
      return;
    }
    setBusy("delete");
    const res = await apiFetch("/api/account", { method: "DELETE", body: { confirm: "DELETE" } });
    setBusy(null);
    if (res.ok) {
      window.location.href = "/sign-in?deleted=1";
    } else notify(t(`errors.${res.code}` as never), "error");
  }

  return (
    <div className="mt-8 space-y-8">
      <section className="card p-6" aria-labelledby={`${uid}-prefs`}>
        <h2 id={`${uid}-prefs`} className="text-xl font-semibold">{t("settings.preferences")}</h2>
        <form onSubmit={savePrefs} className="mt-4 space-y-4">
          <div>
            <p className="field-label">{t("settings.email")}</p>
            <p className="text-ink-soft">{props.email}</p>
          </div>
          <div>
            <label htmlFor={`${uid}-name`} className="field-label">{t("settings.displayName")} <span className="font-normal text-ink-faint">({t("common.optional")})</span></label>
            <input id={`${uid}-name`} className="input" maxLength={60} value={prefs.displayName} onChange={(e) => setPrefs({ ...prefs, displayName: e.target.value })} aria-describedby={`${uid}-name-help`} />
            <p id={`${uid}-name-help`} className="field-help">{t("settings.displayNameHelp")}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={`${uid}-ui`} className="field-label">{t("settings.interfaceLanguage")}</label>
              <select id={`${uid}-ui`} className="input" value={prefs.preferredLanguage} onChange={(e) => setPrefs({ ...prefs, preferredLanguage: e.target.value as Locale })}>
                {LOCALES.map((l) => <option key={l} value={l}>{LOCALE_LABELS[l]}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor={`${uid}-fb`} className="field-label">{t("settings.defaultFeedbackLanguage")}</label>
              <select id={`${uid}-fb`} className="input" value={prefs.feedbackLanguage} onChange={(e) => setPrefs({ ...prefs, feedbackLanguage: e.target.value as FeedbackLanguage })}>
                {FEEDBACK_LANGUAGES.map((l) => <option key={l} value={l}>{t(`feedbackLang.${l}` as never)}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy === "prefs"}>{busy === "prefs" ? t("common.saving") : t("settings.savePrefs")}</button>
        </form>
      </section>

      <section className="card p-6" aria-labelledby={`${uid}-ret`}>
        <h2 id={`${uid}-ret`} className="text-xl font-semibold">{t("settings.retentionTitle")}</h2>
        <form onSubmit={saveRetention} className="mt-3">
          <fieldset>
            <legend className="text-sm text-ink-soft">{t("settings.retentionHelp")}</legend>
            <div className="mt-3 space-y-1">
              {RETENTION_OPTIONS.map((o) => (
                <label key={o} className="flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-2 hover:bg-paper-2">
                  <input type="radio" name="retention" value={o} checked={retention === o} onChange={() => setRetention(o)} className="h-4 w-4 accent-teal" />
                  <span>{t(`settings.retentionOptions.${o}` as never)}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <button type="submit" className="btn btn-primary mt-4" disabled={busy === "retention"}>{busy === "retention" ? t("common.saving") : t("common.save")}</button>
        </form>
      </section>

      <section className="card p-6" aria-labelledby={`${uid}-consent`}>
        <h2 id={`${uid}-consent`} className="text-xl font-semibold">{t("settings.consentTitle")}</h2>
        <div className="mt-3">
          <p className="font-semibold">{t("settings.aiConsent")}</p>
          <p className="mt-1 text-sm text-ink-soft">
            {props.consent
              ? props.consent.current
                ? t("settings.aiConsentGranted", { date: formatDate(props.consent.grantedAt, locale, true), version: props.consent.policyVersion })
                : t("settings.aiConsentOutdated")
              : t("settings.aiConsentNone")}
          </p>
          {props.consent ? (
            <button type="button" className="btn btn-secondary btn-sm mt-3" onClick={withdraw} disabled={busy === "consent"}>{t("settings.withdraw")}</button>
          ) : null}
        </div>
        <p className="mt-4 text-sm text-ink-soft">{t("settings.noOptional")}</p>
      </section>

      <section className="card p-6" aria-labelledby={`${uid}-export`}>
        <h2 id={`${uid}-export`} className="text-xl font-semibold">{t("settings.exportTitle")}</h2>
        <p className="mt-2 text-sm text-ink-soft">{t("settings.exportBody")}</p>
        <a href="/api/account/export" className="btn btn-secondary mt-4" download>{t("settings.exportButton")}</a>
      </section>

      <section className="card border-[#e3b9ad] p-6" aria-labelledby={`${uid}-delete`}>
        <h2 id={`${uid}-delete`} className="text-xl font-semibold">{t("settings.deleteTitle")}</h2>
        <p className="mt-2 text-sm text-ink-soft">{t("settings.deleteBody")}</p>
        <button type="button" className="btn btn-danger mt-4" onClick={() => setDeleteOpen(true)}>{t("settings.deleteButton")}</button>
      </section>

      <Dialog
        open={deleteOpen}
        onOpenChange={(o) => {
          setDeleteOpen(o);
          setConfirmText("");
          setConfirmError(false);
        }}
        title={t("settings.deleteDialogTitle")}
        description={<p>{t("settings.deleteDialogBody")}</p>}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setDeleteOpen(false)}>{t("common.cancel")}</button>
            <button type="button" className="btn btn-accent" onClick={deleteAccount} disabled={busy === "delete"}>
              {busy === "delete" ? t("common.deleting") : t("settings.deleteFinal")}
            </button>
          </>
        }
      >
        <label htmlFor={`${uid}-confirm`} className="field-label">{t("settings.deleteConfirmLabel")}</label>
        <input
          id={`${uid}-confirm`}
          className="input"
          autoComplete="off"
          value={confirmText}
          onChange={(e) => {
            setConfirmText(e.target.value);
            setConfirmError(false);
          }}
          aria-invalid={confirmError ? true : undefined}
          aria-describedby={confirmError ? `${uid}-confirm-err` : undefined}
        />
        {confirmError ? <p id={`${uid}-confirm-err`} className="field-error" role="alert">{t("settings.deleteMismatch")}</p> : null}
      </Dialog>
    </div>
  );
}
