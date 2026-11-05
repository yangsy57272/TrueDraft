"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { apiFetch } from "@/lib/api-client";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toaster";

type SchoolValues = {
  slug: string;
  name: string;
  nameZh: string;
  city: string;
  state: string;
  control: "" | "public" | "private";
  website: string;
  cdsPageUrl: string;
  latestCdsYearListed: string;
  published: boolean;
};

export const EMPTY_SCHOOL: SchoolValues = { slug: "", name: "", nameZh: "", city: "", state: "", control: "", website: "", cdsPageUrl: "", latestCdsYearListed: "", published: true };

export function SchoolForm({ id, initial }: { id: string | null; initial: SchoolValues }) {
  const { t } = useI18n();
  const router = useRouter();
  const notify = useToast();
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const body = { ...v, control: v.control || null };
    const res = id ? await apiFetch(`/api/admin/schools/${id}`, { method: "PUT", body }) : await apiFetch<{ id: string }>("/api/admin/schools", { method: "POST", body });
    if (res.ok) {
      notify(t("adminSchools.saved"));
      if (!id && "data" in res) router.push(`/admin/schools/${(res.data as { id: string }).id}`);
      router.refresh();
    } else setError(`${t(`errors.${res.code}` as never)}${res.details?.field ? ` (${res.details.field})` : ""}`);
  }

  async function remove() {
    if (!id) return;
    const res = await apiFetch(`/api/admin/schools/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/admin/schools");
      router.refresh();
    } else setError(t(`errors.${res.code}` as never));
  }

  const text = (key: keyof SchoolValues) => (
    <div>
      <label htmlFor={`sf-${key}`} className="field-label text-sm">{t(`adminSchools.fields.${key}` as never)}</label>
      <input id={`sf-${key}`} className="input" value={v[key] as string} onChange={(e) => setV({ ...v, [key]: e.target.value })} />
    </div>
  );

  return (
    <form onSubmit={save} className="card space-y-4 p-5">
      {error ? <p className="notice notice-error text-sm" role="alert">{error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {text("name")}
        {text("nameZh")}
        {text("slug")}
        {text("city")}
        {text("state")}
        <div>
          <label htmlFor="sf-control" className="field-label text-sm">{t("adminSchools.fields.control")}</label>
          <select id="sf-control" className="input" value={v.control} onChange={(e) => setV({ ...v, control: e.target.value as SchoolValues["control"] })}>
            <option value="">{t("adminSchools.unset")}</option>
            <option value="public">{t("schools.controls.public")}</option>
            <option value="private">{t("schools.controls.private")}</option>
          </select>
        </div>
        {text("website")}
        {text("cdsPageUrl")}
        {text("latestCdsYearListed")}
      </div>
      <label className="flex items-center gap-3">
        <input type="checkbox" className="h-4 w-4 accent-teal" checked={v.published} onChange={(e) => setV({ ...v, published: e.target.checked })} />
        <span className="font-semibold">{t("adminSchools.fields.published")}</span>
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn btn-primary">{t("adminSchools.save")}</button>
        {id ? <button type="button" className="btn btn-danger" onClick={() => setConfirm(true)}>{t("adminSchools.delete")}</button> : null}
      </div>
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title={t("adminSchools.delete")} body={t("adminSchools.deleteConfirm")} confirmLabel={t("adminSchools.delete")} onConfirm={remove} />
    </form>
  );
}

export function DeleteDatasetButton({ datasetId }: { datasetId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirm(true)}>{t("adminSchools.delete")}</button>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={t("adminSchools.delete")}
        body={t("adminSchools.deleteConfirm")}
        confirmLabel={t("adminSchools.delete")}
        onConfirm={async () => {
          await apiFetch(`/api/admin/cds/${datasetId}`, { method: "DELETE" });
          setConfirm(false);
          router.refresh();
        }}
      />
    </>
  );
}

export function CsvImport() {
  const { t } = useI18n();
  const [csv, setCsv] = useState("");
  const [report, setReport] = useState<{ row: number; status: string; message?: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <section className="card p-5">
      <h2 className="text-lg font-semibold">{t("adminSchools.importTitle")}</h2>
      <p className="mt-1 text-sm text-ink-soft">{t("adminSchools.importIntro")}</p>
      <a href="/api/admin/cds/template" className="btn btn-ghost btn-sm mt-2" download>{t("adminSchools.template")}</a>
      <label htmlFor="csv" className="sr-only">CSV</label>
      <textarea id="csv" className="input mt-3 font-mono text-xs" rows={6} value={csv} onChange={(e) => setCsv(e.target.value)} />
      <button
        type="button"
        className="btn btn-primary btn-sm mt-2"
        disabled={!csv.trim()}
        onClick={async () => {
          setError(null);
          const res = await apiFetch<{ report: { row: number; status: string; message?: string }[] }>("/api/admin/cds/import", { method: "POST", body: { csv } });
          if (res.ok) setReport(res.data.report);
          else setError(`${t(`errors.${res.code}` as never)}${res.details?.columns ? `: ${res.details.columns}` : ""}`);
        }}
      >
        {t("adminSchools.importButton")}
      </button>
      {error ? <p className="notice notice-error mt-3 text-sm" role="alert">{error}</p> : null}
      {report ? (
        <ul className="mt-3 space-y-1 text-sm" role="status">
          {report.map((r) => (
            <li key={r.row} className={r.status === "error" ? "text-coral-dark" : ""}>
              {t("adminSchools.importResult", { row: r.row, status: r.message ? `${r.status} — ${r.message}` : r.status })}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
