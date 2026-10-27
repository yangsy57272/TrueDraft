import Link from "next/link";
import { getT } from "@/i18n/server";
import { Logo } from "./Logo";

export async function SiteFooter() {
  const { t } = await getT();
  return (
    <footer className="mt-16 border-t border-line bg-paper-2">
      <div className="container-page grid gap-8 py-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-sm text-sm text-ink-soft">{t("footer.tagline")}</p>
          <p className="mt-4 text-sm text-ink-soft">{t("disclaimer.main")}</p>
        </div>
        <nav aria-label={t("footer.product")}>
          <h2 className="font-sans text-sm font-semibold uppercase tracking-wide text-ink-soft">{t("footer.product")}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/how-it-works">{t("nav.howItWorks")}</Link></li>
            <li><Link href="/sample-feedback">{t("nav.sample")}</Link></li>
            <li><Link href="/resources">{t("nav.resources")}</Link></li>
          </ul>
        </nav>
        <nav aria-label={t("footer.trust")}>
          <h2 className="font-sans text-sm font-semibold uppercase tracking-wide text-ink-soft">{t("footer.trust")}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/privacy">{t("nav.privacy")}</Link></li>
            <li><Link href="/responsible-ai">{t("nav.integrity")}</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-ink-soft sm:flex-row sm:justify-between">
          <p>{t("footer.notAffiliated")}</p>
          <p>{t("footer.copyright", { year: new Date().getFullYear() })}</p>
        </div>
      </div>
    </footer>
  );
}
