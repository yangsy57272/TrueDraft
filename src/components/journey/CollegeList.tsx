"use client";
import Link from "next/link";
import { useId, useRef, useState } from "react";
import { useI18n } from "@/i18n/client";
import { apiFetch, newId } from "@/lib/api-client";
import { APPLICATION_PLATFORMS, APPLICATION_ROUNDS, APPLICATION_STATUSES, LIST_CATEGORIES } from "@/lib/planning";
import { ConfirmDialog } from "@/components/ui/Dialog";
import type { Deadline } from "@/lib/deadlines";
import { DeadlineList, DeadlineOverview, type DeadlineOps } from "./Deadlines";
import { useToast } from "@/components/ui/Toaster";

export type ListEntry = {
  id: string;
  schoolId: string | null;
  schoolSlug: string | null;
  schoolName: string;
  schoolNameZh: string | null;
  category: string;
  round: string;
  platform: string | null;
  deadlines: Deadline[];
  intendedMajor: string | null;
  status: string;
  notes: string;
  checklist: { id: string; key?: string | null; label?: string; done: boolean }[];
  essays: { id: string; title: string; status: string; draftWordCount: number; wordLimit: number | null }[];
};

const CATEGORY_ICON: Record<string, string> = { reach: "▲", target: "●", likely: "▼", unsure: "?" };

type FormFields = Pick<ListEntry, "category" | "round" | "platform" | "intendedMajor" | "status" | "notes">;
const FORM_KEYS = ["category", "round", "platform", "intendedMajor", "status", "notes"] as const;
const formOf = (e: ListEntry): FormFields => ({
  category: e.category,
  round: e.round,
  platform: e.platform,
  intendedMajor: e.intendedMajor,
  status: e.status,
  notes: e.notes,
});
const norm = (v: string | null | undefined) => (v == null ? "" : v);

type ListOps = {
  saveFields: (entryId: string, patch: Partial<FormFields>) => Promise<boolean>;
  setItem: (entryId: string, itemId: string, done: boolean) => void;
  addItem: (entryId: string, label: string) => void;
  removeItem: (entryId: string, itemId: string) => void;
  removeEntry: (entryId: string) => Promise<boolean>;
  deadlines: (entryId: string) => DeadlineOps;
};

function EntryCard({ entry, ops }: { entry: ListEntry; ops: ListOps }) {
  const { t, locale } = useI18n();
  const uid = useId();
  const [form, setForm] = useState<FormFields>(() => formOf(entry));
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [newItem, setNewItem] = useState("");
  const v = entry; // what the server has confirmed; the header always shows this
  const name = locale === "zh-CN" && v.schoolNameZh ? v.schoolNameZh : v.schoolName;
  const changed = FORM_KEYS.filter((k) => norm(form[k]) !== norm(entry[k]));
  const dirty = changed.length > 0;
  const set = (patch: Partial<FormFields>) => setForm((cur) => ({ ...cur, ...patch }));

  async function save() {
    const patch: Partial<FormFields> = {};
    for (const k of changed) (patch as Record<string, unknown>)[k] = form[k] === "" ? null : form[k];
    setSaving(true);
    const ok = await ops.saveFields(entry.id, patch);
    setSaving(false);
    // On success the parent replaces `entry` with the server's copy, so `changed` becomes empty.
    if (ok) setForm((cur) => ({ ...cur, ...patch }));
  }

  const done = v.checklist.filter((c) => c.done).length;
  const id = (s: string) => `${uid}-${s}`;
  const essayHref = `/essays/new?listEntry=${entry.id}&school=${encodeURIComponent(v.schoolName)}`;

  return (
    <li className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold">{name}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
            <span className="badge badge-neutral">
              <span aria-hidden="true">{CATEGORY_ICON[v.category]}</span>
              {t(`list.categories.${v.category}` as never)}
            </span>
            <span>{t(`list.rounds.${v.round}` as never)}</span>
            <span>· {t(`list.statuses.${v.status}` as never)}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {v.schoolSlug ? <Link href={`/schools/${v.schoolSlug}`} className="btn btn-ghost btn-sm">{t("list.viewSchool")}</Link> : null}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirm(true)}>{t("list.remove")}</button>
        </div>
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-semibold">{t("common.edit")}</summary>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor={id("cat")} className="field-label text-sm">{t("list.category")}</label>
            <select id={id("cat")} className="input" value={form.category} onChange={(e) => set({ category: e.target.value })} aria-describedby={id("cath")}>
              {LIST_CATEGORIES.map((c) => <option key={c} value={c}>{t(`list.categories.${c}` as never)}</option>)}
            </select>
            <p id={id("cath")} className="field-help">{t("list.categoryHelp")}</p>
          </div>
          <div>
            <label htmlFor={id("round")} className="field-label text-sm">{t("list.round")}</label>
            <select id={id("round")} className="input" value={form.round} onChange={(e) => set({ round: e.target.value })}>
              {APPLICATION_ROUNDS.map((r) => <option key={r} value={r}>{t(`list.rounds.${r}` as never)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor={id("plat")} className="field-label text-sm">{t("list.platform")}</label>
            <select id={id("plat")} className="input" value={form.platform ?? ""} onChange={(e) => set({ platform: e.target.value || null })}>
              <option value="">—</option>
              {APPLICATION_PLATFORMS.map((p) => <option key={p} value={p}>{t(`list.platforms.${p}` as never)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor={id("status")} className="field-label text-sm">{t("list.status")}</label>
            <select id={id("status")} className="input" value={form.status} onChange={(e) => set({ status: e.target.value })}>
              {APPLICATION_STATUSES.map((s) => <option key={s} value={s}>{t(`list.statuses.${s}` as never)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor={id("major")} className="field-label text-sm">{t("list.intendedMajor")}</label>
            <input id={id("major")} className="input" maxLength={120} value={form.intendedMajor ?? ""} onChange={(e) => set({ intendedMajor: e.target.value })} />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label htmlFor={id("notes")} className="field-label text-sm">{t("list.notes")}</label>
            <textarea id={id("notes")} className="input" rows={2} maxLength={4000} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" className="btn btn-primary btn-sm" disabled={!dirty || saving} onClick={() => void save()}>
            {saving ? t("common.saving") : t("list.save")}
          </button>
          {dirty && !saving ? (
            <>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm(formOf(entry))}>{t("list.discard")}</button>
              <span className="text-xs text-ink-soft">{t("list.unsavedFields")}</span>
            </>
          ) : null}
        </div>
      </details>

      <div className="mt-5 grid gap-6 md:grid-cols-2">
        <fieldset>
          <legend className="text-sm font-semibold">
            {t("list.checklist")} <span className="font-normal text-ink-soft">· {t("list.progress", { done, total: v.checklist.length })}</span>
          </legend>
          <ul className="mt-2 space-y-1">
            {v.checklist.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2">
                <label className="flex min-h-9 min-w-0 cursor-pointer items-center gap-3 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-teal" checked={c.done} onChange={(e) => ops.setItem(entry.id, c.id, e.target.checked)} />
                  <span className={c.done ? "text-ink-soft line-through" : ""}>{c.key ? t(`list.checklistItems.${c.key}` as never) : c.label}</span>
                </label>
                {!c.key ? (
                  <button type="button" className="btn btn-ghost btn-sm !min-h-8 !px-2 text-xs" onClick={() => ops.removeItem(entry.id, c.id)}>
                    {t("list.removeItem")}<span className="sr-only">: {c.label}</span>
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newItem.trim()) return;
              ops.addItem(entry.id, newItem);
              setNewItem("");
            }}
          >
            <label htmlFor={id("ni")} className="sr-only">{t("list.newItem")}</label>
            <input id={id("ni")} className="input !min-h-9" placeholder={t("list.newItem")} maxLength={80} value={newItem} onChange={(e) => setNewItem(e.target.value)} />
            <button type="submit" className="btn btn-secondary btn-sm">{t("list.addItem")}</button>
          </form>
        </fieldset>
        <div className="md:col-span-2">
          <DeadlineList deadlines={v.deadlines} ops={ops.deadlines(entry.id)} />
        </div>
        <div>
          <h3 className="text-sm font-semibold">{t("list.essays")}</h3>
          {v.essays.length === 0 ? <p className="mt-2 text-sm text-ink-soft">{t("list.noEssays")}</p> : null}
          <ul className="mt-2 space-y-1 text-sm">
            {v.essays.map((e) => (
              <li key={e.id}>
                <Link href={`/essays/${e.id}`}>{e.title}</Link>{" "}
                <span className="text-ink-soft">
                  · {e.wordLimit ? t("common.wordsOfLimit", { count: e.draftWordCount, limit: e.wordLimit }) : t("common.wordsShort", { count: e.draftWordCount })} · {t(`status.${e.status}` as never)}
                </span>
              </li>
            ))}
          </ul>
          <Link href={essayHref} className="btn btn-secondary btn-sm mt-3">+ {t("list.startEssay")}</Link>
        </div>
      </div>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={t("list.remove")}
        body={t("list.removeConfirm", { name })}
        confirmLabel={t("list.remove")}
        onConfirm={async () => {
          await ops.removeEntry(entry.id);
          setConfirm(false);
        }}
      />
    </li>
  );
}

export function CollegeList({ entries }: { entries: ListEntry[] }) {
  const { t, locale } = useI18n();
  const notify = useToast();
  // The single client-side copy of the list. Every change is applied from the server's response.
  const [items, setItems] = useState(entries);
  const [custom, setCustom] = useState("");
  const [adding, setAdding] = useState(false);

  // Checklist operations still waiting for the server, per entry and item, so a response to an
  // earlier operation doesn't briefly undo a later click.
  const pending = useRef(new Map<string, Map<string, { done: boolean; seq: number }>>());
  const queues = useRef(new Map<string, Promise<unknown>>());
  const seq = useRef(0);

  const overlay = (e: ListEntry): ListEntry => {
    const p = pending.current.get(e.id);
    if (!p?.size) return e;
    return { ...e, checklist: e.checklist.map((c) => (p.has(c.id) ? { ...c, done: p.get(c.id)!.done } : c)) };
  };
  const applyServer = (server: ListEntry) => setItems((cur) => cur.map((e) => (e.id === server.id ? overlay(server) : e)));
  const patchLocal = (entryId: string, change: (e: ListEntry) => ListEntry) => setItems((cur) => cur.map((e) => (e.id === entryId ? change(e) : e)));
  const fail = (code: string) => notify(t(`errors.${code}` as never), "error");

  /** Checklist operations for one entry run one after another, in click order. */
  function enqueue(entryId: string, op: () => Promise<void>) {
    const next = (queues.current.get(entryId) ?? Promise.resolve()).then(op, op);
    queues.current.set(entryId, next);
    return next;
  }

  const ops: ListOps = {
    async saveFields(entryId, patch) {
      if (Object.keys(patch).length === 0) return true;
      const res = await apiFetch<{ entry: ListEntry }>(`/api/list/${entryId}`, { method: "PATCH", body: patch });
      if (!res.ok) {
        fail(res.code);
        return false;
      }
      applyServer(res.data.entry);
      notify(t("list.saved"));
      return true;
    },
    setItem(entryId, itemId, done) {
      const mine = ++seq.current;
      const map = pending.current.get(entryId) ?? new Map();
      pending.current.set(entryId, map);
      const before = items.find((e) => e.id === entryId)?.checklist.find((c) => c.id === itemId)?.done ?? !done;
      map.set(itemId, { done, seq: mine });
      patchLocal(entryId, (e) => ({ ...e, checklist: e.checklist.map((c) => (c.id === itemId ? { ...c, done } : c)) }));
      void enqueue(entryId, async () => {
        const res = await apiFetch<{ entry: ListEntry }>(`/api/list/${entryId}/checklist/${itemId}`, { method: "PATCH", body: { done } });
        const latest = map.get(itemId)?.seq === mine;
        if (latest) map.delete(itemId);
        if (res.ok) {
          applyServer(res.data.entry);
        } else {
          // Roll back only this item, and only if no newer click on it is waiting.
          if (latest) patchLocal(entryId, (e) => ({ ...e, checklist: e.checklist.map((c) => (c.id === itemId ? { ...c, done: before } : c)) }));
          fail(res.code);
        }
      });
    },
    addItem(entryId, label) {
      const itemId = newId();
      const clean = label.trim().slice(0, 80);
      patchLocal(entryId, (e) => ({ ...e, checklist: [...e.checklist, { id: itemId, key: null, label: clean, done: false }] }));
      void enqueue(entryId, async () => {
        const res = await apiFetch<{ entry: ListEntry }>(`/api/list/${entryId}/checklist`, { method: "POST", body: { label: clean, itemId } });
        if (res.ok) applyServer(res.data.entry);
        else {
          patchLocal(entryId, (e) => ({ ...e, checklist: e.checklist.filter((c) => c.id !== itemId) }));
          fail(res.code);
        }
      });
    },
    removeItem(entryId, itemId) {
      const entry = items.find((e) => e.id === entryId);
      const index = entry?.checklist.findIndex((c) => c.id === itemId) ?? -1;
      const removed = index >= 0 ? entry!.checklist[index] : null;
      patchLocal(entryId, (e) => ({ ...e, checklist: e.checklist.filter((c) => c.id !== itemId) }));
      void enqueue(entryId, async () => {
        const res = await apiFetch<{ entry: ListEntry }>(`/api/list/${entryId}/checklist/${itemId}`, { method: "DELETE" });
        if (res.ok) applyServer(res.data.entry);
        else {
          if (removed) patchLocal(entryId, (e) => {
            const checklist = [...e.checklist];
            checklist.splice(Math.min(index, checklist.length), 0, removed);
            return { ...e, checklist };
          });
          fail(res.code);
        }
      });
    },
    deadlines(entryId) {
      return {
        add(input) {
          const itemId = newId();
          patchLocal(entryId, (e) => ({ ...e, deadlines: [...e.deadlines, { ...input, id: itemId }] }));
          void enqueue(entryId, async () => {
            const res = await apiFetch<{ entry: ListEntry }>(`/api/list/${entryId}/deadlines`, { method: "POST", body: { ...input, itemId } });
            if (res.ok) applyServer(res.data.entry);
            else {
              patchLocal(entryId, (e) => ({ ...e, deadlines: e.deadlines.filter((d) => d.id !== itemId) }));
              fail(res.code);
            }
          });
        },
        update(deadlineId, patch) {
          const before = items.find((e) => e.id === entryId)?.deadlines.find((d) => d.id === deadlineId);
          patchLocal(entryId, (e) => ({ ...e, deadlines: e.deadlines.map((d) => (d.id === deadlineId ? { ...d, ...patch } : d)) }));
          void enqueue(entryId, async () => {
            const res = await apiFetch<{ entry: ListEntry }>(`/api/list/${entryId}/deadlines/${deadlineId}`, { method: "PATCH", body: patch });
            if (res.ok) applyServer(res.data.entry);
            else {
              if (before) patchLocal(entryId, (e) => ({ ...e, deadlines: e.deadlines.map((d) => (d.id === deadlineId ? before : d)) }));
              fail(res.code);
            }
          });
        },
        remove(deadlineId) {
          const entry = items.find((e) => e.id === entryId);
          const removed = entry?.deadlines.find((d) => d.id === deadlineId);
          patchLocal(entryId, (e) => ({ ...e, deadlines: e.deadlines.filter((d) => d.id !== deadlineId) }));
          void enqueue(entryId, async () => {
            const res = await apiFetch<{ entry: ListEntry }>(`/api/list/${entryId}/deadlines/${deadlineId}`, { method: "DELETE" });
            if (res.ok) applyServer(res.data.entry);
            else {
              if (removed) patchLocal(entryId, (e) => ({ ...e, deadlines: [...e.deadlines, removed] }));
              fail(res.code);
            }
          });
        },
      };
    },
    async removeEntry(entryId) {
      const res = await apiFetch(`/api/list/${entryId}`, { method: "DELETE" });
      if (!res.ok) {
        fail(res.code);
        return false;
      }
      setItems((cur) => cur.filter((e) => e.id !== entryId));
      notify(t("list.removed"));
      return true;
    },
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-semibold">{items.length === 1 ? t("list.countOne") : t("list.counts", { count: items.length })}</p>
          <Link href="/schools" className="btn btn-primary btn-sm">{t("list.explore")}</Link>
        </div>
        {items.length === 0 ? <p className="notice mt-4">{t("list.empty")}</p> : null}
        <ul className="mt-4 space-y-4">
          {items.map((e) => (
            <EntryCard key={e.id} entry={e} ops={ops} />
          ))}
        </ul>
        <form
          className="card mt-6 flex flex-wrap items-end gap-3 p-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!custom.trim() || adding) return;
            setAdding(true);
            const res = await apiFetch<{ entry: ListEntry }>("/api/list", { method: "POST", body: { customSchoolName: custom.trim() } });
            setAdding(false);
            if (res.ok) {
              setCustom("");
              setItems((cur) => [...cur, res.data.entry]);
              notify(t("schools.added"));
            } else fail(res.code);
          }}
        >
          <div className="min-w-0 flex-1">
            <label htmlFor="custom-school" className="field-label text-sm">{t("list.addCustom")}</label>
            <input id="custom-school" className="input" maxLength={160} placeholder={t("list.customName")} value={custom} onChange={(e) => setCustom(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-secondary" disabled={adding}>{t("list.add")}</button>
        </form>
      </div>
      <aside id="deadlines" className="card h-fit scroll-mt-24 border-t-4 p-5" style={{ borderTopColor: "#15803d" }} aria-labelledby="upcoming">
        <h2 id="upcoming" className="text-lg font-semibold">{t("list.upcoming")}</h2>
        <DeadlineOverview entries={items.map((e) => ({ id: e.id, name: locale === "zh-CN" && e.schoolNameZh ? e.schoolNameZh : e.schoolName, deadlines: e.deadlines }))} />
      </aside>
    </div>
  );
}
