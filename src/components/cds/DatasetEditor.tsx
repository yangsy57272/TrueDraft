"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { apiFetch, runStreamingTool } from "@/lib/api-client";
import { INITIAL_AI_PROGRESS, type AiProgress } from "@/lib/ai-progress";
import { C7_FACTORS, C7_LEVELS, CDS_FIELDS, CIP_CODES, CIP_FAMILIES, type CdsFieldDef } from "@/lib/planning";
import { ProgressStages } from "@/components/editor/ProgressStages";
import { useToast } from "@/components/ui/Toaster";

type Values = Record<string, string>; // form state as strings; converted on save

type Initial = {
  academicYear: string;
  sourceUrl: string;
  sourcePageRef: string;
  sourceDomainException: boolean;
  sourceExceptionReason: string;
  verificationMethod: string;
  data: Record<string, unknown>;
  verificationStatus: "draft" | "verified";
  published: boolean;
  notes: string;
};

function toForm(data: Record<string, unknown>): Values {
  const out: Values = {};
  for (const f of CDS_FIELDS) {
    const v = data[f.key];
    if (v === undefined || v === null) continue;
    out[f.key] = typeof v === "boolean" ? (v ? "true" : "false") : String(v);
  }
  const c7 = (data.c7 ?? {}) as Record<string, string>;
  for (const [k, v] of Object.entries(c7)) out[`c7_${k}`] = v;
  const j1 = (data.degreesByField ?? {}) as Record<string, number>;
  for (const [k, v] of Object.entries(j1)) out[`j1_${k}`] = String(v);
  return out;
}

function fromForm(values: Values) {
  const data: Record<string, unknown> = {};
  for (const f of CDS_FIELDS) {
    const raw = values[f.key]?.trim();
    if (!raw) continue;
    if (f.type === "bool") data[f.key] = raw === "true";
    else if (f.type === "monthday" || f.type === "enum") data[f.key] = raw;
    else data[f.key] = Number(raw.replace(/[,$%\s]/g, ""));
  }
  const c7: Record<string, string> = {};
  for (const factor of C7_FACTORS) if (values[`c7_${factor}`]) c7[factor] = values[`c7_${factor}`];
  if (Object.keys(c7).length) data.c7 = c7;
  const j1: Record<string, number> = {};
  for (const code of CIP_CODES) if (values[`j1_${code}`]?.trim()) j1[code] = Number(values[`j1_${code}`]);
  if (Object.keys(j1).length) data.degreesByField = j1;
  return data;
}

export function DatasetEditor({ schoolId, datasetId, initial }: { schoolId: string; datasetId: string | null; initial: Initial }) {
  const { t } = useI18n();
  const router = useRouter();
  const notify = useToast();
  const [meta, setMeta] = useState({
    academicYear: initial.academicYear,
    sourceUrl: initial.sourceUrl,
    sourcePageRef: initial.sourcePageRef,
    sourceDomainException: initial.sourceDomainException,
    sourceExceptionReason: initial.sourceExceptionReason,
    verificationMethod: initial.verificationMethod,
    verificationStatus: initial.verificationStatus,
    published: initial.published,
    notes: initial.notes,
  });
  const [values, setValues] = useState<Values>(toForm(initial.data));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [text, setText] = useState("");
  const [progress, setProgress] = useState<AiProgress | null>(null);
  const [uncertain, setUncertain] = useState<string[]>([]);
  const [prefilled, setPrefilled] = useState<Set<string>>(new Set());
  const set = (key: string, value: string) => setValues((v) => ({ ...v, [key]: value }));

  async function save() {
    setSaving(true);
    setError(null);
    const body = { ...meta, data: fromForm(values) };
    const res = datasetId
      ? await apiFetch(`/api/admin/cds/${datasetId}`, { method: "PUT", body })
      : await apiFetch<{ id: string }>(`/api/admin/schools/${schoolId}/cds`, { method: "POST", body });
    setSaving(false);
    if (res.ok) {
      notify(t("adminSchools.saved"));
      router.push(`/admin/schools/${schoolId}`);
      router.refresh();
    } else {
      setError(`${t(`errors.${res.code}` as never)}${res.details?.field ? ` (${res.details.field}${res.details.reason ? `: ${res.details.reason}` : ""})` : ""}`);
    }
  }

  async function prefill() {
    setError(null);
    setProgress(INITIAL_AI_PROGRESS);
    const res = await runStreamingTool<undefined>("/api/admin/cds/extract", { text }, setProgress);
    setProgress(null);
    if (!res.ok) {
      setError(t(`errors.${res.code}` as never));
      return;
    }
    const proposed = toForm((res as unknown as { data: Record<string, unknown> }).data ?? {});
    setValues((v) => ({ ...v, ...proposed }));
    setPrefilled(new Set(Object.keys(proposed)));
    setUncertain(((res as unknown as { uncertainFields?: string[] }).uncertainFields ?? []).slice(0, 20));
    notify(t("adminSchools.extractApplied"), "info");
  }

  const field = (f: CdsFieldDef) => {
    const id = `cds-${f.key}`;
    const label = (
      <label htmlFor={id} className="field-label text-sm">
        {t(`cdsFields.${f.key}` as never)} <span className="font-mono text-xs text-ink-faint">{f.item}</span>
        {prefilled.has(f.key) ? <span className="ml-2 badge badge-developing">AI</span> : null}
      </label>
    );
    if (f.type === "bool") {
      return (
        <div key={f.key}>
          {label}
          <select id={id} className="input" value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)}>
            <option value="">{t("adminSchools.unset")}</option>
            <option value="true">{t("adminSchools.yes")}</option>
            <option value="false">{t("adminSchools.no")}</option>
          </select>
        </div>
      );
    }
    if (f.type === "enum") {
      return (
        <div key={f.key}>
          {label}
          <select id={id} className="input" value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)}>
            <option value="">{t("adminSchools.unset")}</option>
            {f.options!.map((o) => <option key={o} value={o}>{t(`testPolicies.${o}` as never)}</option>)}
          </select>
        </div>
      );
    }
    return (
      <div key={f.key}>
        {label}
        <input id={id} className="input" inputMode={f.type === "monthday" ? "text" : "decimal"} placeholder={f.type === "monthday" ? "MM-DD" : ""} value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} />
      </div>
    );
  };

  const sections: [string, CdsFieldDef["section"]][] = [
    ["adminSchools.sectionB", "B"],
    ["adminSchools.sectionC", "C"],
    ["adminSchools.sectionG", "G"],
    ["adminSchools.sectionH", "H"],
    ["adminSchools.sectionI", "I"],
  ];

  return (
    <div className="space-y-6">
      <section className="card p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ds-year" className="field-label">{t("adminSchools.fields.academicYear")}</label>
            <input id="ds-year" className="input" value={meta.academicYear} onChange={(e) => setMeta({ ...meta, academicYear: e.target.value })} />
          </div>
          <div>
            <label htmlFor="ds-src" className="field-label">{t("adminSchools.fields.sourceUrl")}</label>
            <input id="ds-src" className="input" value={meta.sourceUrl} onChange={(e) => setMeta({ ...meta, sourceUrl: e.target.value })} />
          </div>
          <div>
            <label htmlFor="ds-ref" className="field-label">{t("adminSchools.fields.sourcePageRef")}</label>
            <input id="ds-ref" className="input" maxLength={200} value={meta.sourcePageRef} onChange={(e) => setMeta({ ...meta, sourcePageRef: e.target.value })} />
          </div>
          <div>
            <label htmlFor="ds-method" className="field-label">{t("adminSchools.fields.verificationMethod")}</label>
            <input id="ds-method" className="input" maxLength={200} value={meta.verificationMethod} onChange={(e) => setMeta({ ...meta, verificationMethod: e.target.value })} />
          </div>
        </div>
        <label className="mt-4 flex items-center gap-3">
          <input type="checkbox" className="h-4 w-4 accent-teal" checked={meta.sourceDomainException} onChange={(e) => setMeta({ ...meta, sourceDomainException: e.target.checked })} />
          <span className="text-sm font-semibold">{t("adminSchools.fields.sourceException")}</span>
        </label>
        {meta.sourceDomainException ? (
          <div className="mt-2">
            <label htmlFor="ds-exc" className="field-label text-sm">{t("adminSchools.fields.sourceExceptionReason")}</label>
            <input id="ds-exc" className="input" maxLength={500} value={meta.sourceExceptionReason} onChange={(e) => setMeta({ ...meta, sourceExceptionReason: e.target.value })} />
          </div>
        ) : null}
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-semibold">{t("adminSchools.extractTitle")}</h2>
        <p className="mt-1 text-sm text-ink-soft">{t("adminSchools.extractIntro")}</p>
        <label htmlFor="ds-text" className="sr-only">{t("adminSchools.extractTitle")}</label>
        <textarea id="ds-text" className="input mt-3 font-mono text-xs" rows={5} value={text} onChange={(e) => setText(e.target.value)} />
        <button type="button" className="btn btn-secondary btn-sm mt-2" disabled={text.trim().length < 20 || progress !== null} onClick={prefill}>
          {t("adminSchools.extractButton")}
        </button>
        {progress ? <div className="mt-3"><ProgressStages progress={progress} kind="cds_extract" /></div> : null}
        {uncertain.length ? <p className="notice notice-warn mt-3 text-sm">{t("adminSchools.extractUncertain", { fields: uncertain.join(", ") })}</p> : null}
      </section>

      {sections.map(([title, letter]) => (
        <section key={letter} className="card p-5">
          <h2 className="text-lg font-semibold">{t(title as never)}</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{CDS_FIELDS.filter((f) => f.section === letter).map(field)}</div>
        </section>
      ))}

      <section className="card p-5">
        <h2 className="text-lg font-semibold">{t("adminSchools.c7Section")}</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {C7_FACTORS.map((factor) => (
            <div key={factor} className="flex items-center justify-between gap-3">
              <label htmlFor={`c7-${factor}`} className="text-sm">{t(`c7.factors.${factor}` as never)}</label>
              <select id={`c7-${factor}`} className="input !w-44" value={values[`c7_${factor}`] ?? ""} onChange={(e) => set(`c7_${factor}`, e.target.value)}>
                <option value="">{t("adminSchools.unset")}</option>
                {C7_LEVELS.map((l) => <option key={l} value={l}>{t(`c7.levels.${l}` as never)}</option>)}
              </select>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-semibold">{t("adminSchools.sectionJ")}</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CIP_CODES.map((code) => (
            <div key={code}>
              <label htmlFor={`j1-${code}`} className="field-label text-sm">{code} · {CIP_FAMILIES[code].en}</label>
              <input id={`j1-${code}`} className="input" inputMode="decimal" value={values[`j1_${code}`] ?? ""} onChange={(e) => set(`j1_${code}`, e.target.value)} />
            </div>
          ))}
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <fieldset>
          <legend className="field-label">{t("adminSchools.fields.status")}</legend>
          {(["draft", "verified"] as const).map((s) => (
            <label key={s} className="flex min-h-10 items-center gap-3">
              <input type="radio" name="ds-status" className="h-4 w-4 accent-teal" checked={meta.verificationStatus === s} onChange={() => setMeta({ ...meta, verificationStatus: s, published: s === "draft" ? false : meta.published })} />
              <span>{s === "draft" ? t("adminSchools.statusDraft") : t("adminSchools.statusVerified")}</span>
            </label>
          ))}
        </fieldset>
        <label className="flex items-center gap-3">
          <input type="checkbox" className="h-4 w-4 accent-teal" checked={meta.published} disabled={meta.verificationStatus !== "verified"} onChange={(e) => setMeta({ ...meta, published: e.target.checked })} />
          <span className="font-semibold">{t("adminSchools.publishDataset")}</span>
        </label>
        <div>
          <label htmlFor="ds-notes" className="field-label">{t("adminSchools.fields.notes")}</label>
          <textarea id="ds-notes" className="input" rows={2} value={meta.notes} onChange={(e) => setMeta({ ...meta, notes: e.target.value })} />
        </div>
        {error ? <p className="notice notice-error text-sm" role="alert">{error}</p> : null}
        <button type="button" className="btn btn-primary" disabled={saving} onClick={save}>{saving ? t("common.saving") : t("adminSchools.save")}</button>
      </section>
    </div>
  );
}
