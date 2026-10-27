"use client";
import { Dialog } from "radix-ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/client";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { SignOutButton } from "./SignOutButton";

export type NavLink = { href: string; label: string };

export function MobileNav({ links, signedIn, accountLinks }: { links: NavLink[]; signedIn: boolean; accountLinks: NavLink[] }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="btn btn-secondary btn-sm lg:hidden" aria-label={t("nav.menu")}>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span>{t("nav.menu")}</span>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-[min(22rem,100vw)] flex-col gap-4 overflow-y-auto border-l border-line bg-paper p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <Dialog.Title className="font-serif text-lg font-semibold">{t("nav.menu")}</Dialog.Title>
            <Dialog.Description className="sr-only">{t("nav.primary")}</Dialog.Description>
            <Dialog.Close className="btn btn-ghost btn-sm" aria-label={t("nav.closeMenu")}>
              <span aria-hidden="true">✕</span>
            </Dialog.Close>
          </div>
          <nav aria-label={t("nav.primary")}>
            <ul className="flex flex-col">
              {[...accountLinks, ...links].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="block rounded-md px-3 py-3 text-ink no-underline hover:bg-paper-2"
                    aria-current={pathname === l.href ? "page" : undefined}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <LanguageSwitcher />
          {signedIn ? (
            <SignOutButton className="btn btn-secondary" />
          ) : (
            <Link href="/sign-in" className="btn btn-primary">
              {t("nav.signIn")}
            </Link>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
