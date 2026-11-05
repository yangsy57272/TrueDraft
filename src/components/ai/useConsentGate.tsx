"use client";
import { useCallback, useRef, useState } from "react";
import { useI18n } from "@/i18n/client";
import { apiFetch } from "@/lib/api-client";
import { ConsentDialog } from "@/components/editor/ConsentDialog";
import { useToast } from "@/components/ui/Toaster";
import type { WorkspaceAi } from "@/components/editor/types";

/**
 * Ask for AI-processing consent (once per policy version) before running an AI tool outside the
 * essay workspace. `ensure()` resolves true when the tool may run.
 */
export function useConsentGate(ai: WorkspaceAi) {
  const { t } = useI18n();
  const notify = useToast();
  const [granted, setGranted] = useState(ai.consentCurrent);
  const [open, setOpen] = useState(false);
  const pending = useRef<((ok: boolean) => void) | null>(null);

  const settle = (ok: boolean) => {
    pending.current?.(ok);
    pending.current = null;
  };

  const ensure = useCallback(() => {
    if (granted) return Promise.resolve(true);
    return new Promise<boolean>((resolve) => {
      pending.current = resolve;
      setOpen(true);
    });
  }, [granted]);

  const dialog = (
    <ConsentDialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) settle(false);
      }}
      ai={ai}
      saveOnlyLabel={t("common.cancel")}
      onAgree={async () => {
        const res = await apiFetch("/api/consent", { method: "POST", body: { consentType: "ai_processing", action: "grant" } });
        if (!res.ok) {
          notify(t(`errors.${res.code}` as never), "error");
          return;
        }
        setGranted(true);
        setOpen(false);
        settle(true);
      }}
      onSaveOnly={async () => {
        setOpen(false);
        settle(false);
      }}
    />
  );

  return { ensure, dialog, revoke: () => setGranted(false) };
}
