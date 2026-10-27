"use client";
import { DropdownMenu } from "radix-ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { apiFetch } from "@/lib/api-client";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toaster";

export function EssayActions({ essayId, title }: { essayId: string; title: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const notify = useToast();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  async function duplicate() {
    const res = await apiFetch<{ id: string }>(`/api/essays/${essayId}/duplicate`, { method: "POST" });
    if (res.ok) {
      notify(t("dashboard.duplicated"));
      router.refresh();
    } else notify(t(`errors.${res.code}` as never), "error");
  }

  async function remove() {
    setBusy(true);
    const res = await apiFetch(`/api/essays/${essayId}`, { method: "DELETE" });
    setBusy(false);
    setConfirm(false);
    if (res.ok) {
      notify(t("dashboard.deleted"));
      router.refresh();
    } else notify(t(`errors.${res.code}` as never), "error");
  }

  const item = "cursor-pointer rounded-md px-3 py-2 text-sm outline-none data-[highlighted]:bg-paper-2";
  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger className="btn btn-ghost btn-sm" aria-label={t("dashboard.actionsFor", { title })}>
          <span aria-hidden="true">⋯</span>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="end" sideOffset={4} className="z-40 min-w-48 rounded-lg border border-line bg-card p-1 shadow-lg">
            <DropdownMenu.Item className={item} onSelect={duplicate}>{t("dashboard.duplicate")}</DropdownMenu.Item>
            <DropdownMenu.Item className={item} onSelect={() => (window.location.href = `/api/essays/${essayId}/export?format=md`)}>
              {t("editor.exportMd")}
            </DropdownMenu.Item>
            <DropdownMenu.Item className={item} onSelect={() => (window.location.href = `/api/essays/${essayId}/export?format=txt`)}>
              {t("editor.exportTxt")}
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="my-1 h-px bg-line" />
            <DropdownMenu.Item className={`${item} text-coral-dark`} onSelect={() => setConfirm(true)}>{t("dashboard.delete")}</DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={t("dashboard.deleteTitle")}
        body={t("dashboard.deleteBody", { title })}
        confirmLabel={t("dashboard.deleteConfirm")}
        busy={busy}
        onConfirm={remove}
      />
    </>
  );
}
