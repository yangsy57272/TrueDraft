import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { getCurrentUser } from "@/server/session";
import { SignInForm } from "./SignInForm";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("nav.signIn") };
}

export default async function SignInPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (await getCurrentUser()) redirect("/dashboard");
  const { t } = await getT();
  const params = await searchParams;
  const showDevHint = process.env.NODE_ENV !== "production" && (process.env.EMAIL_TRANSPORT ?? "console") === "console";
  return (
    <div className="container-prose max-w-lg py-14">
      <h1 className="text-3xl font-semibold">{t("auth.title")}</h1>
      <p className="mt-3 text-ink-soft">{t("auth.intro")}</p>
      {params.error ? <p className="notice notice-error mt-6" role="alert">{t("auth.linkError")}</p> : null}
      {params.signedOut ? <p className="notice notice-info mt-6" role="status">{t("auth.signedOut")}</p> : null}
      {params.deleted ? <p className="notice notice-info mt-6" role="status">{t("settings.deleted")}</p> : null}
      <SignInForm showDevHint={showDevHint} />
    </div>
  );
}
