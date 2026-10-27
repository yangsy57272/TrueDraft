"use client";
import { Dialog as RadixDialog } from "radix-ui";
import { useEffect, useRef, type ReactNode } from "react";
import { useI18n } from "@/i18n/client";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
};

/** Accessible modal dialog (focus trap, Escape to close, labelled by its title). */
export function Dialog({ open, onOpenChange, title, description, children, footer, wide }: Props) {
  const { t } = useI18n();
  // Controlled dialogs have no Radix trigger, so remember what had focus and restore it on close.
  const returnFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (open && document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
      returnFocus.current = document.activeElement;
    }
  }, [open]);
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-ink/40 motion-safe:animate-[fade-in_150ms_ease-out]" />
        <RadixDialog.Content
          onCloseAutoFocus={(event) => {
            if (returnFocus.current?.isConnected) {
              event.preventDefault();
              returnFocus.current.focus();
            }
          }}
          className={`fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-line bg-card p-5 shadow-xl sm:p-6 ${wide ? "max-w-2xl" : "max-w-lg"}`}
        >
          <RadixDialog.Title className="font-serif text-xl font-semibold">{title}</RadixDialog.Title>
          {description ? (
            <RadixDialog.Description asChild>
              <div className="mt-2 text-ink-soft">{description}</div>
            </RadixDialog.Description>
          ) : (
            <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
          )}
          {children ? <div className="mt-4">{children}</div> : null}
          {footer ? <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div> : null}
          <RadixDialog.Close className="btn btn-ghost btn-sm absolute right-3 top-3" aria-label={t("common.close")}>
            <span aria-hidden="true">✕</span>
          </RadixDialog.Close>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

export function ConfirmDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
}) {
  const { t } = useI18n();
  return (
    <Dialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={props.title}
      description={props.body}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={() => props.onOpenChange(false)}>
            {t("common.cancel")}
          </button>
          <button type="button" className="btn btn-accent" onClick={props.onConfirm} disabled={props.busy}>
            {props.busy ? t("common.deleting") : props.confirmLabel}
          </button>
        </>
      }
    />
  );
}
