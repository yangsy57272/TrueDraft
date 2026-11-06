import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/source-serif-4";
import "./globals.css";
import { brand } from "@/config/brand";
import { getPrivacyFacts } from "@/config/deployment";
import { isDemoMode } from "@/config/production-guard";
import { htmlLang } from "@/i18n/config";
import { I18nProvider } from "@/i18n/client";
import { getT } from "@/i18n/server";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ToastProvider } from "@/components/ui/Toaster";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: { default: `${brand.name} — ${brand.tagline.en}`, template: `%s · ${brand.name}` },
    description: t("meta.description"),
    referrer: "no-referrer",
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#4f46e5" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { t, locale } = await getT();
  const facts = getPrivacyFacts();
  const devIssue =
    process.env.NODE_ENV !== "production" ? (!facts.aiConfigured ? t("dev.noAi") : facts.aiIsMock ? t("dev.mockAi") : null) : null;
  const demo = process.env.NODE_ENV === "production" && isDemoMode();

  return (
    <html lang={htmlLang(locale)}>
      <body className="flex min-h-screen flex-col">
        <I18nProvider locale={locale}>
          <ToastProvider>
            {demo ? (
              <div className="border-b border-[#ead9ab] bg-amber-soft px-4 py-2 text-center text-sm font-semibold text-[#4f3a08]" role="note">
                {t("dev.demoMode")}
              </div>
            ) : null}
            {devIssue ? (
              <div className="border-b border-[#ead9ab] bg-amber-soft px-4 py-2 text-center text-sm text-[#4f3a08]" role="note">
                {t("dev.configWarning", { issue: devIssue })}
              </div>
            ) : null}
            <SiteHeader />
            <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
              {children}
            </main>
            <SiteFooter />
          </ToastProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
