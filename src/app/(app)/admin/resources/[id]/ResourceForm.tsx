"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { apiFetch } from "@/lib/api-client";
import { LICENSE_STATUSES, RESOURCE_ACCESS, RESOURCE_CATEGORIES, RESOURCE_COLLECTIONS } from "@/lib/constants";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toaster";

type Values = {
  slug: string;
  title: string;
  summary: string;
  contentOrUrl: string;
  contentType: "article" | "external_link";
  language: "en" | "zh-CN" | "multi";
  category: (typeof RESOURCE_CATEGORIES)[number];
  source: string;
  author: string;
  licenseStatus: (typeof LICENSE_STATUSES)[number];
  permissionNotes: string;
  collection: (typeof RESOURCE_COLLECTIONS)[number];
  access: (typeof RESOURCE_ACCESS)[number];
  retrievalAllowed: boolean;
  published: boolean;
};

const EMPTY: Values = {
  slug: "",
  title: "",
  summary: "",
  contentOrUrl: "",
  contentType: "article",
  language: "en",
  category: "craft",
  source: "",
  author: "",
  licenseStatus: "original",
  permissionNotes: "",
  collection: "original",
  access: "public",
  retrievalAllowed: false,
  published: false,
};

export function ResourceForm({ id, initial }: { id: string | null; initial: Values | null }) {
  const { t } = useI18n();
  const router = useRouter();
  const notify = useToast();
  const [v, setV] = useState<Values>(initial ?? EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const set = <K extends keyof Values>(k: K, value: Values[K]) => setV((cur) => ({ ...cur, [k]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = { ...v, permissionNotes: v.permissionNotes.trim() || null };
    const res = id
      ? await apiFetch(`/api/admin/resources/${id}`, { method: "PUT", body })
      : await apiFetch<{ id: string }>("/api/admin/resources", { method: "POST", body });
    setBusy(false);
    if (res.ok) {
      notify(t("admin.saved"));
      router.push("/admin/resources");
      router.refresh();
    } else {
      setError(res.code === "validation_failed" && res.details?.field ? `${t("errors.validation_failed")} (${res.details.field})` : t(`errors.${res.code}` as never));
    }
  }

  async function remove() {
    if (!id) return;
    const res = await apiFetch(`/api/admin/resources/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/admin/resources");
      router.refresh();
    } else setError(t(`errors.${res.code}` as never));
  }

  const text = (k: keyof Values, label: string, opts: { area?: boolean; rows?: number; help?: string } = {}) => (
    <div>
      <label htmlFor={`rf-${k}`} className="field-label">{label}</label>
      {opts.area ? (
        <textarea id={`rf-${k}`} className="input font-mono text-sm" rows={opts.rows ?? 4} value={v[k] as string} onChange={(e) => set(k, e.target.value as never)} aria-describedby={opts.help ? `rf-${k}-help` : undefined} />
      ) : (
        <input id={`rf-${k}`} className="input" value={v[k] as string} onChange={(e) => set(k, e.target.value as never)} aria-describedby={opts.help ? `rf-${k}-help` : undefined} />
      )}
      {opts.help ? <p id={`rf-${k}-help`} className="field-help">{opts.help}</p> : null}
    </div>
  );
  const select = <K extends keyof Values>(k: K, label: string, options: readonly string[]) => (
    <div>
      <label htmlFor={`rf-${k}`} className="field-label">{label}</label>
      <select id={`rf-${k}`} className="input" value={v[k] as string} onChange={(e) => set(k, e.target.value as Values[K])}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <form onSubmit={submit} className="card mt-6 space-y-5 p-6">
      {error ? <p className="notice notice-error" role="alert">{error}</p> : null}
      {text("title", t("admin.fields.title"))}
      {text("slug", t("admin.fields.slug"))}
      {text("summary", t("admin.fields.summary"), { area: true, rows: 2 })}
      <div className="grid gap-4 sm:grid-cols-3">
        {select("contentType", t("admin.fields.contentType"), ["article", "external_link"])}
        {select("language", t("admin.fields.language"), ["en", "zh-CN", "multi"])}
        {select("category", t("admin.fields.category"), RESOURCE_CATEGORIES)}
      </div>
      {text("contentOrUrl", t("admin.fields.body"), { area: true, rows: 12 })}
      <div className="grid gap-4 sm:grid-cols-2">
        {text("source", t("admin.fields.source"))}
        {text("author", t("admin.fields.author"))}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {select("licenseStatus", t("admin.fields.licenseStatus"), LICENSE_STATUSES)}
        {select("collection", t("admin.fields.collection"), RESOURCE_COLLECTIONS)}
        {select("access", t("admin.fields.access"), RESOURCE_ACCESS)}
      </div>
      {text("permissionNotes", t("admin.fields.permissionNotes"), { area: true, rows: 3, help: t("admin.fields.permissionHelp") })}
      <div className="flex items-start gap-3">
        <input id="rf-retrieval" type="checkbox" className="mt-1 h-4 w-4 accent-teal" checked={v.retrievalAllowed} onChange={(e) => set("retrievalAllowed", e.target.checked)} aria-describedby="rf-retrieval-help" />
        <div>
          <label htmlFor="rf-retrieval" className="font-semibold">{t("admin.fields.retrieval")}</label>
          <p id="rf-retrieval-help" className="field-help">{t("admin.fields.retrievalHelp")}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <input id="rf-published" type="checkbox" className="h-4 w-4 accent-teal" checked={v.published} onChange={(e) => set("published", e.target.checked)} />
        <label htmlFor="rf-published" className="font-semibold">{t("admin.fields.published")}</label>
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? t("common.saving") : t("admin.save")}</button>
        {id ? <button type="button" className="btn btn-danger" onClick={() => setConfirm(true)}>{t("admin.deleteResource")}</button> : null}
      </div>
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title={t("admin.deleteResource")} body={t("admin.deleteConfirm")} confirmLabel={t("common.delete")} onConfirm={remove} />
    </form>
  );
}
