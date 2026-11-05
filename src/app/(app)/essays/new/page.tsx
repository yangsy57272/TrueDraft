import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { requirePageUser } from "@/server/session";
import { EssayForm } from "@/components/editor/EssayForm";
import { listEntries } from "@/server/services/college-list";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("essayForm.newTitle") };
}

export default async function NewEssayPage({ searchParams }: { searchParams: Promise<{ listEntry?: string; school?: string }> }) {
  const user = await requirePageUser();
  const { t, locale } = await getT();
  const sp = await searchParams;
  const entries = await listEntries(user.id);
  const listOptions = entries.map((e) => ({ id: e.id, name: locale === "zh-CN" && e.schoolNameZh ? e.schoolNameZh : e.schoolName }));
  const linked = entries.find((e) => e.id === sp.listEntry);
  const initial = linked
    ? { listEntryId: linked.id, applicationType: "supplemental" as const, targetSchool: linked.schoolName.slice(0, 160), title: `${linked.schoolName} supplement`.slice(0, 160) }
    : undefined;
  return (
    <div className="container-prose py-10">
      <h1 className="text-3xl font-semibold">{t("essayForm.newTitle")}</h1>
      <p className="mt-2 text-ink-soft">{t("essayForm.newIntro")}</p>
      <div className="card mt-8 p-5 sm:p-8">
        <EssayForm mode={{ kind: "create" }} defaultLanguage={user.feedbackLanguage} listOptions={listOptions} initial={initial} />
      </div>
    </div>
  );
}
