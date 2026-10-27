"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { authClient } from "@/lib/auth-client";

export function SignOutButton({ className = "btn btn-ghost btn-sm whitespace-nowrap" }: { className?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className={className}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await authClient.signOut().catch(() => null);
        router.push("/sign-in?signedOut=1");
        router.refresh();
      }}
    >
      {t("nav.signOut")}
    </button>
  );
}
