import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { requirePageUser } from "@/server/session";
import { EssayForm } from "@/components/editor/EssayForm";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("essayForm.newTitle") };
}

export default async function NewEssayPage() {
  const user = await requirePageUser();
  const { t } = await getT();
  return (
    <div className="container-prose py-10">
      <h1 className="text-3xl font-semibold">{t("essayForm.newTitle")}</h1>
      <p className="mt-2 text-ink-soft">{t("essayForm.newIntro")}</p>
      <div className="card mt-8 p-5 sm:p-8">
        <EssayForm mode={{ kind: "create" }} defaultLanguage={user.feedbackLanguage} />
      </div>
    </div>
  );
}
