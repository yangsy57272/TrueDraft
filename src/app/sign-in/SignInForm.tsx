"use client";
import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { authClient } from "@/lib/auth-client";

export function SignInForm({ showDevHint }: { showDevHint: boolean }) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError(t("auth.invalidEmail"));
      return;
    }
    setState("sending");
    const result = await authClient.signIn.magicLink({ email: value, callbackURL: "/dashboard", errorCallbackURL: "/sign-in?error=link" });
    if (result.error) {
      setState("idle");
      setError(result.error.status === 429 ? t("auth.tooMany") : t("common.unknownError"));
      return;
    }
    setState("sent");
  }

  if (state === "sent") {
    return (
      <div className="card mt-8 p-6" role="status" aria-live="polite">
        <h2 className="text-xl font-semibold">{t("auth.sentTitle")}</h2>
        <p className="mt-2 text-ink-soft">{t("auth.sentBody", { email: email.trim() })}</p>
        {showDevHint ? <p className="notice notice-warn mt-4 text-sm">{t("auth.devHint")}</p> : null}
        <button type="button" className="btn btn-secondary mt-5" onClick={() => setState("idle")}>
          {t("auth.useDifferent")}
        </button>
      </div>
    );
  }

  return (
    <form className="card mt-8 p-6" onSubmit={submit} noValidate>
      <label htmlFor="email" className="field-label">{t("auth.emailLabel")}</label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        className="input"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "email-help email-error" : "email-help"}
        required
      />
      <p id="email-help" className="field-help">{t("auth.emailHelp")}</p>
      {error ? <p id="email-error" className="field-error" role="alert">{error}</p> : null}
      <button type="submit" className="btn btn-primary mt-5 w-full" disabled={state === "sending"}>
        {state === "sending" ? t("auth.sending") : t("auth.submit")}
      </button>
      <p className="mt-4 text-xs text-ink-soft">
        {t("auth.agePrompt")} <Link href="/privacy">{t("nav.privacy")}</Link> · <Link href="/responsible-ai">{t("nav.integrity")}</Link>
      </p>
    </form>
  );
}
