"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { apiFetch } from "@/lib/api-client";
import type { DeferrableStep } from "@/lib/planning";
import { useToast } from "@/components/ui/Toaster";

/** Toggle "I'll come back to this later" for an optional step. */
export function DeferStep({ step, deferred }: { step: DeferrableStep; deferred: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const notify = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const res = await apiFetch("/api/profile/defer", { method: "PUT", body: { step, deferred: !deferred } });
        setBusy(false);
        if (res.ok) router.refresh();
        else notify(t(`errors.${res.code}` as never), "error");
      }}
    >
      {deferred ? t(`journey.undefer.${step}` as never) : t(`journey.defer.${step}` as never)}
    </button>
  );
}
