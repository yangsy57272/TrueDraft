import Link from "next/link";
import { getT } from "@/i18n/server";
import { getCurrentUser } from "@/server/session";
import { Logo } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MobileNav } from "./MobileNav";
import { SignOutButton } from "./SignOutButton";

export async function SiteHeader() {
  const { t } = await getT();
  const user = await getCurrentUser();
  const publicLinks = [
    { href: "/how-it-works", label: t("nav.howItWorks") },
    { href: "/sample-feedback", label: t("nav.sample") },
    { href: "/schools", label: t("nav.schools") },
    { href: "/cds", label: t("nav.cdsGuide") },
    { href: "/resources", label: t("nav.resources") },
    { href: "/privacy", label: t("nav.privacy") },
    { href: "/responsible-ai", label: t("nav.integrity") },
  ];
  const accountLinks = user
    ? [
        { href: "/journey", label: t("nav.journey") },
        { href: "/profile", label: t("nav.profile") },
        { href: "/majors", label: t("nav.majors") },
        { href: "/schools", label: t("nav.schools") },
        { href: "/my-list", label: t("nav.myList") },
        { href: "/dashboard", label: t("nav.essays") },
        { href: "/essays/new", label: t("nav.newEssay") },
        { href: "/library", label: t("nav.library") },
        { href: "/settings", label: t("nav.settings") },
        ...(user.isAdmin ? [{ href: "/admin", label: t("nav.admin") }] : []),
      ]
    : [];
  const desktopLinks = user
    ? [
        { href: "/journey", label: t("nav.journey") },
        { href: "/dashboard", label: t("nav.essays") },
        { href: "/schools", label: t("nav.schools") },
        { href: "/my-list", label: t("nav.myList") },
      ]
    : publicLinks.slice(0, 5);
  const mobileExtra = user ? publicLinks.filter((l) => l.href !== "/schools") : publicLinks;

  return (
    <header className="border-b border-line bg-paper/95">
      <a href="#main" className="sr-only-focusable btn btn-primary absolute left-3 top-3 z-50">
        {t("nav.skipToContent")}
      </a>
      <div className="container-page flex h-16 items-center justify-between gap-3">
        <Link href={user ? "/journey" : "/"} className="no-underline" aria-label={`${t("nav.home")}`}>
          <Logo />
        </Link>
        <nav aria-label={t("nav.primary")} className="hidden lg:block">
          <ul className="flex items-center gap-1 text-sm">
            {desktopLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="whitespace-nowrap rounded-md px-2.5 py-2 text-ink-soft no-underline hover:bg-paper-2 hover:text-ink">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <LanguageSwitcher compact />
          {user ? (
            <>
              <Link href="/settings" className="btn btn-ghost btn-sm whitespace-nowrap">
                {t("nav.settings")}
              </Link>
              {user.isAdmin ? (
                <Link href="/admin" className="btn btn-ghost btn-sm">
                  {t("nav.admin")}
                </Link>
              ) : null}
              <SignOutButton />
            </>
          ) : (
            <Link href="/sign-in" className="btn btn-primary btn-sm">
              {t("nav.signIn")}
            </Link>
          )}
        </div>
        <MobileNav links={mobileExtra} accountLinks={accountLinks} signedIn={Boolean(user)} />
      </div>
    </header>
  );
}
