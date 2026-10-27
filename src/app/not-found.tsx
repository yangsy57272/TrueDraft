import Link from "next/link";
import { getT } from "@/i18n/server";

export default async function NotFound() {
  const { t } = await getT();
  return (
    <div className="container-prose py-20 text-center">
      <h1 className="text-3xl font-semibold">{t("errors.notFoundTitle")}</h1>
      <p className="mt-3 text-ink-soft">{t("errors.notFoundBody")}</p>
      <Link href="/" className="btn btn-primary mt-6">{t("errors.goHome")}</Link>
    </div>
  );
}
