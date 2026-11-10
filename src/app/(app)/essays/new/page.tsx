import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { requirePageUser } from "@/server/session";
import { EssayForm } from "@/components/editor/EssayForm";
import { listEntries } from "@/server/services/college-list";
import { getSupplementPrompt } from "@/server/services/supplements";
import { wordLimitFor } from "@/lib/supplements";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("essayForm.newTitle") };
}

export default async function NewEssayPage({ searchParams }: { searchParams: Promise<{ listEntry?: string; school?: string; supp?: string; n?: string; type?: string }> }) {
  const user = await requirePageUser();
  const { t, locale } = await getT();
  const sp = await searchParams;
  const entries = await listEntries(user.id);
  const listOptions = entries.map((e) => ({ id: e.id, name: locale === "zh-CN" && e.schoolNameZh ? e.schoolNameZh : e.schoolName }));
  const supp = sp.supp && sp.n ? await getSupplementPrompt(sp.supp, Number(sp.n)) : null;
  // A supplement prompt links to the school's list entry automatically when the school is on the list.
  const linked = entries.find((e) => e.id === sp.listEntry) ?? (supp ? entries.find((e) => e.schoolId === supp.schoolId) : undefined);
  let initial: Parameters<typeof EssayForm>[0]["initial"] = linked
    ? { listEntryId: linked.id, applicationType: "supplemental" as const, targetSchool: linked.schoolName.slice(0, 160), title: `${linked.schoolName} supplement`.slice(0, 160) }
    : undefined;
  if (supp) {
    const limit = wordLimitFor(supp.prompt);
    const promptText = supp.prompt.unit === "characters" && supp.prompt.limitText ? `${supp.prompt.prompt}\n\n(${supp.prompt.limitText})` : supp.prompt.prompt;
    initial = {
      ...initial,
      applicationType: "supplemental",
      targetSchool: supp.schoolName.slice(0, 160),
      title: `${supp.schoolName} supplement #${supp.prompt.order}`.slice(0, 160),
      promptText: promptText.slice(0, 4000),
      wordLimit: limit ? String(limit) : "",
    };
  } else if (sp.type === "personal_statement") {
    initial = { ...initial, applicationType: "personal_statement", title: t("guide.essayTitle"), wordLimit: "650" };
  }
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
