"use client";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useI18n } from "@/i18n/client";
import { FEEDBACK_LANGUAGES, type FeedbackLanguage } from "@/i18n/config";
import { apiFetch } from "@/lib/api-client";
import { APPLICATION_TYPES, FOCUS_AREAS, type ApplicationType, type FocusArea } from "@/lib/constants";
import { countWords } from "@/lib/wordcount";
import { useToast } from "@/components/ui/Toaster";

export type EssayFormValues = {
  title: string;
  applicationType: ApplicationType;
  promptText: string;
  targetSchool: string;
  wordLimit: string;
  draft: string;
  feedbackLanguage: FeedbackLanguage;
  focusAreas: FocusArea[];
  context: string;
};

type Mode = { kind: "create" } | { kind: "edit"; essayId: string; onSaved?: () => void };

const MAX = { title: 160, prompt: 4000, context: 2000, draft: 20000 };

export function EssayForm({ initial, mode, defaultLanguage }: { initial?: Partial<EssayFormValues>; mode: Mode; defaultLanguage: FeedbackLanguage }) {
  const { t } = useI18n();
  const router = useRouter();
  const notify = useToast();
  const uid = useId();
  const [values, setValues] = useState<EssayFormValues>({
    title: "",
    applicationType: "personal_statement",
    promptText: "",
    targetSchool: "",
    wordLimit: "",
    draft: "",
    feedbackLanguage: defaultLanguage,
    focusAreas: [],
    context: "",
    ...initial,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof EssayFormValues, string>>>({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const set = <K extends keyof EssayFormValues>(key: K, value: EssayFormValues[K]) => setValues((v) => ({ ...v, [key]: value }));
  const id = (name: string) => `${uid}-${name}`;
  const describedBy = (name: keyof EssayFormValues, help = true) =>
    [help ? id(`${name}-help`) : null, errors[name] ? id(`${name}-error`) : null].filter(Boolean).join(" ") || undefined;

  function validate() {
    const next: typeof errors = {};
    if (!values.title.trim()) next.title = t("essayForm.errors.titleRequired");
    else if (values.title.length > MAX.title) next.title = t("essayForm.errors.tooLong", { max: MAX.title });
    if (!values.promptText.trim()) next.promptText = t("essayForm.errors.promptRequired");
    else if (values.promptText.length > MAX.prompt) next.promptText = t("essayForm.errors.tooLong", { max: MAX.prompt });
    if (values.wordLimit.trim() && !/^\d{1,4}$/.test(values.wordLimit.trim())) next.wordLimit = t("essayForm.errors.wordLimit");
    else if (values.wordLimit.trim() && (Number(values.wordLimit) < 1 || Number(values.wordLimit) > 5000)) next.wordLimit = t("essayForm.errors.wordLimit");
    if (values.context.length > MAX.context) next.context = t("essayForm.errors.tooLong", { max: MAX.context });
    if (values.draft.length > MAX.draft) next.draft = t("essayForm.errors.tooLong", { max: MAX.draft });
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!validate()) {
      const first = document.querySelector<HTMLElement>("[aria-invalid='true']");
      first?.focus();
      return;
    }
    setBusy(true);
    const payload = {
      title: values.title.trim(),
      applicationType: values.applicationType,
      promptText: values.promptText.trim(),
      targetSchool: values.targetSchool.trim() || null,
      wordLimit: values.wordLimit.trim() ? Number(values.wordLimit) : null,
      feedbackLanguage: values.feedbackLanguage,
      focusAreas: values.focusAreas,
      context: values.context.trim() || null,
    };
    if (mode.kind === "create") {
      const res = await apiFetch<{ id: string }>("/api/essays", { method: "POST", body: { ...payload, draft: values.draft } });
      setBusy(false);
      if (res.ok) router.push(`/essays/${res.data.id}`);
      else setFormError(t(`errors.${res.code}` as never));
    } else {
      const res = await apiFetch(`/api/essays/${mode.essayId}`, { method: "PATCH", body: payload });
      setBusy(false);
      if (res.ok) {
        notify(t("editor.detailsSaved"));
        mode.onSaved?.();
        router.refresh();
      } else setFormError(t(`errors.${res.code}` as never));
    }
  }

  const FieldError = ({ name }: { name: keyof EssayFormValues }) =>
    errors[name] ? (
      <p id={id(`${name}-error`)} className="field-error">
        {errors[name]}
      </p>
    ) : null;

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      {formError ? <p className="notice notice-error" role="alert">{formError}</p> : null}
      <div>
        <label htmlFor={id("title")} className="field-label">{t("essayForm.title")} <span className="font-normal text-ink-faint">({t("common.required")})</span></label>
        <input id={id("title")} className="input" value={values.title} maxLength={MAX.title} onChange={(e) => set("title", e.target.value)} aria-invalid={errors.title ? true : undefined} aria-describedby={describedBy("title")} required />
        <p id={id("title-help")} className="field-help">{t("essayForm.titleHelp")}</p>
        <FieldError name="title" />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor={id("type")} className="field-label">{t("essayForm.applicationType")}</label>
          <select id={id("type")} className="input" value={values.applicationType} onChange={(e) => set("applicationType", e.target.value as ApplicationType)}>
            {APPLICATION_TYPES.map((a) => <option key={a} value={a}>{t(`appType.${a}` as never)}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={id("lang")} className="field-label">{t("essayForm.feedbackLanguage")}</label>
          <select id={id("lang")} className="input" value={values.feedbackLanguage} onChange={(e) => set("feedbackLanguage", e.target.value as FeedbackLanguage)}>
            {FEEDBACK_LANGUAGES.map((l) => <option key={l} value={l}>{t(`feedbackLang.${l}` as never)}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor={id("promptText")} className="field-label">{t("essayForm.prompt")} <span className="font-normal text-ink-faint">({t("common.required")})</span></label>
        <textarea id={id("promptText")} className="input" rows={4} value={values.promptText} onChange={(e) => set("promptText", e.target.value)} aria-invalid={errors.promptText ? true : undefined} aria-describedby={describedBy("promptText")} required />
        <p id={id("promptText-help")} className="field-help">{t("essayForm.promptHelp")}</p>
        <FieldError name="promptText" />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor={id("targetSchool")} className="field-label">{t("essayForm.targetSchool")} <span className="font-normal text-ink-faint">({t("common.optional")})</span></label>
          <input id={id("targetSchool")} className="input" value={values.targetSchool} maxLength={160} onChange={(e) => set("targetSchool", e.target.value)} aria-describedby={describedBy("targetSchool")} />
          <p id={id("targetSchool-help")} className="field-help">{t("essayForm.targetSchoolHelp")}</p>
        </div>
        <div>
          <label htmlFor={id("wordLimit")} className="field-label">{t("essayForm.wordLimit")} <span className="font-normal text-ink-faint">({t("common.optional")})</span></label>
          <input id={id("wordLimit")} className="input" inputMode="numeric" value={values.wordLimit} onChange={(e) => set("wordLimit", e.target.value)} aria-invalid={errors.wordLimit ? true : undefined} aria-describedby={describedBy("wordLimit")} />
          <p id={id("wordLimit-help")} className="field-help">{t("essayForm.wordLimitHelp")}</p>
          <FieldError name="wordLimit" />
        </div>
      </div>

      {mode.kind === "create" ? (
        <div>
          <label htmlFor={id("draft")} className="field-label">{t("essayForm.draft")} <span className="font-normal text-ink-faint">({t("common.optional")})</span></label>
          <textarea id={id("draft")} className="input paper-lines font-serif text-[1.05rem]" rows={12} value={values.draft} onChange={(e) => set("draft", e.target.value)} aria-invalid={errors.draft ? true : undefined} aria-describedby={describedBy("draft")} />
          <p id={id("draft-help")} className="field-help">
            {t("essayForm.draftHelp")} · {t("common.wordsShort", { count: countWords(values.draft) })}
          </p>
          <FieldError name="draft" />
        </div>
      ) : null}

      <fieldset>
        <legend className="field-label">{t("essayForm.focusAreas")}</legend>
        <p className="field-help !mt-0 mb-2">{t("essayForm.focusHelp")}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {FOCUS_AREAS.map((f) => (
            <label key={f} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-line bg-card px-3 py-2 hover:bg-paper-2">
              <input
                type="checkbox"
                className="h-4 w-4 accent-teal"
                checked={values.focusAreas.includes(f)}
                onChange={(e) => set("focusAreas", e.target.checked ? [...values.focusAreas, f] : values.focusAreas.filter((x) => x !== f))}
              />
              <span>{t(`focus.${f}` as never)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor={id("context")} className="field-label">{t("essayForm.context")} <span className="font-normal text-ink-faint">({t("common.optional")})</span></label>
        <textarea id={id("context")} className="input" rows={3} value={values.context} onChange={(e) => set("context", e.target.value)} aria-invalid={errors.context ? true : undefined} aria-describedby={describedBy("context")} />
        <p id={id("context-help")} className="field-help">{t("essayForm.contextHelp")}</p>
        <FieldError name="context" />
      </div>

      {mode.kind === "create" ? (
        <p className="notice text-sm">
          <strong>{t("essayForm.notRequiredTitle")}: </strong>
          {t("essayForm.notRequired")}
        </p>
      ) : null}

      <button type="submit" className="btn btn-primary" disabled={busy}>
        {mode.kind === "create" ? (busy ? t("essayForm.creating") : t("essayForm.create")) : busy ? t("common.saving") : t("essayForm.saveDetails")}
      </button>
    </form>
  );
}
