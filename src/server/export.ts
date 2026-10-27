import "server-only";
import { brand } from "@/config/brand";
import type { Locale } from "@/i18n/config";
import { createTranslator, formatDate } from "@/i18n/translate";
import { countWords } from "@/lib/wordcount";
import type { FullFeedback } from "./ai/schemas";
import type { EssayDetail } from "./services/essays";

type Run = { createdAt: Date; modelName: string; result: unknown } | null;

/** Render the current draft plus its latest full feedback as Markdown or plain text. */
export function renderEssayExport(essay: EssayDetail, run: Run, format: "md" | "txt", locale: Locale) {
  const { t } = createTranslator(locale);
  const h = (level: number, text: string) => (format === "md" ? `${"#".repeat(level)} ${text}` : `${text}\n${"=".repeat(Math.min(60, text.length))}`);
  const bullet = (text: string) => `- ${text}`;
  const lines: string[] = [];

  lines.push(h(1, essay.title), "");
  lines.push(`${t("essayForm.applicationType")}: ${t(`appType.${essay.applicationType}` as never)}`);
  if (essay.targetSchool) lines.push(`${t("essayForm.targetSchool")}: ${essay.targetSchool}`);
  const words = countWords(essay.draft);
  lines.push(essay.wordLimit ? t("common.wordsOfLimit", { count: words, limit: essay.wordLimit }) : t("common.wordsShort", { count: words }));
  lines.push("", h(2, t("editor.promptHeading")), "", essay.promptText, "", h(2, t("editor.editorLabel")), "", essay.draft, "");

  const fb = run?.result as (FullFeedback & { computed?: unknown }) | undefined;
  if (fb) {
    lines.push(h(2, `${t("feedback.title")} — ${formatDate(run!.createdAt, locale, true)} (${run!.modelName})`), "");
    lines.push(t("feedback.aiNote"), "");
    lines.push(h(3, t("feedback.overall")), "", fb.summary, "");
    lines.push(h(3, t("feedback.strengths")), ...fb.strengths.map((s) => bullet(`${s.point} — “${s.evidence_quote}”`)), "");
    lines.push(h(3, t("feedback.primaryPriority")), "", `${fb.primary_priority.title}: ${fb.primary_priority.explanation}`, "");
    lines.push(h(3, t("feedback.promptAlignment")), "", `${t(`feedback.alignment.${fb.prompt_alignment.status}` as never)} — ${fb.prompt_alignment.explanation}`, "");
    lines.push(h(3, t("feedback.diagnostic")));
    for (const c of fb.categories) {
      lines.push(bullet(`${t(`feedback.category.${c.key}` as never)}: ${t(`feedback.label.${c.label}` as never)}. ${c.explanation} ${t("feedback.nextStep")}: ${c.next_step}`));
    }
    lines.push("", h(3, t("feedback.passages")));
    for (const p of fb.passage_comments) {
      lines.push(bullet(`[${t(`feedback.priority.${p.priority}` as never)}] “${p.quote}” — ${p.observation} ${p.why_it_matters} ${t("feedback.tryThis")}: ${p.revision_question}`));
    }
    lines.push("", h(3, t("feedback.revisionPlan")), ...fb.revision_plan.map((r, i) => `${i + 1}. ${r.task} (${r.why})`), "");
    lines.push(h(3, t("feedback.voiceCheck")), ...fb.voice_check.map((v) => bullet(`${v.question} ${v.note}`)), "");
    if (fb.questions_for_student.length) lines.push(h(3, t("feedback.questions")), ...fb.questions_for_student.map(bullet), "");
    lines.push(h(3, t("feedback.limitations")), "", fb.limitations, "");
  }
  lines.push("---", t("disclaimer.main"), `${brand.name} · ${formatDate(new Date(), locale)}`);
  return lines.join("\n");
}
