"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useI18n } from "@/i18n/client";
import { formatDate } from "@/i18n/translate";
import { apiFetch, newId } from "@/lib/api-client";
import { APPLICATION_PLATFORMS, APPLICATION_ROUNDS, APPLICATION_STATUSES, LIST_CATEGORIES } from "@/lib/planning";
import { ConfirmDialog } from "@/components/ui/Dialog";
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
  deadline: string | null;
  intendedMajor: string | null;
  status: string;
  notes: string;
  checklist: { id: string; key?: string | null; label?: string; done: boolean }[];
  essays: { id: string; title: string; status: string; draftWordCount: number; wordLimit: number | null }[];
};

const CATEGORY_ICON: Record<string, string> = { reach: "▲", target: "●", likely: "▼", unsure: "?" };

function EntryCard({ entry, onRemoved }: { entry: ListEntry; onRemoved: () => void }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const notify = useToast();
  const uid = useId();
  const [v, setV] = useState(entry);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [newItem, setNewItem] = useState("");
  const name = locale === "zh-CN" && v.schoolNameZh ? v.schoolNameZh : v.schoolName;
  const set = (patch: Partial<ListEntry>) => {
    setV((cur) => ({ ...cur, ...patch }));
    setDirty(true);
  };

  async function save(patch?: Partial<ListEntry>) {
    const next = { ...v, ...patch };
    setSaving(true);
    const res = await apiFetch(`/api/list/${entry.id}`, {
      method: "PATCH",
      body: {
        category: next.category,
        round: next.round,
        platform: next.platform || null,
        deadline: next.deadline || null,
        intendedMajor: next.intendedMajor || null,
        status: next.status,
        notes: next.notes || null,
        checklist: next.checklist,
      },
    });
    setSaving(false);
    if (res.ok) {
      setDirty(false);
      if (!patch) notify(t("list.saved"));
      router.refresh();
    } else notify(t(`errors.${res.code}` as never), "error");
  }

  function toggleItem(itemId: string) {
    const checklist = v.checklist.map((c) => (c.id === itemId ? { ...c, done: !c.done } : c));
    setV({ ...v, checklist });
    void save({ checklist });
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
            {v.deadline ? <span>· {formatDate(`${v.deadline}T12:00:00Z`, locale)}</span> : null}
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
            <select id={id("cat")} className="input" value={v.category} onChange={(e) => set({ category: e.target.value })} aria-describedby={id("cath")}>
              {LIST_CATEGORIES.map((c) => <option key={c} value={c}>{t(`list.categories.${c}` as never)}</option>)}
            </select>
            <p id={id("cath")} className="field-help">{t("list.categoryHelp")}</p>
          </div>
          <div>
            <label htmlFor={id("round")} className="field-label text-sm">{t("list.round")}</label>
            <select id={id("round")} className="input" value={v.round} onChange={(e) => set({ round: e.target.value })}>
              {APPLICATION_ROUNDS.map((r) => <option key={r} value={r}>{t(`list.rounds.${r}` as never)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor={id("dl")} className="field-label text-sm">{t("list.deadline")}</label>
            <input id={id("dl")} type="date" className="input" value={v.deadline ?? ""} onChange={(e) => set({ deadline: e.target.value || null })} aria-describedby={id("dlh")} />
            <p id={id("dlh")} className="field-help">{t("list.deadlineHelp")}</p>
          </div>
          <div>
            <label htmlFor={id("plat")} className="field-label text-sm">{t("list.platform")}</label>
            <select id={id("plat")} className="input" value={v.platform ?? ""} onChange={(e) => set({ platform: e.target.value || null })}>
              <option value="">—</option>
              {APPLICATION_PLATFORMS.map((p) => <option key={p} value={p}>{t(`list.platforms.${p}` as never)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor={id("status")} className="field-label text-sm">{t("list.status")}</label>
            <select id={id("status")} className="input" value={v.status} onChange={(e) => set({ status: e.target.value })}>
              {APPLICATION_STATUSES.map((s) => <option key={s} value={s}>{t(`list.statuses.${s}` as never)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor={id("major")} className="field-label text-sm">{t("list.intendedMajor")}</label>
            <input id={id("major")} className="input" maxLength={120} value={v.intendedMajor ?? ""} onChange={(e) => set({ intendedMajor: e.target.value })} />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label htmlFor={id("notes")} className="field-label text-sm">{t("list.notes")}</label>
            <textarea id={id("notes")} className="input" rows={2} maxLength={4000} value={v.notes} onChange={(e) => set({ notes: e.target.value })} />
          </div>
        </div>
        <button type="button" className="btn btn-primary btn-sm mt-3" disabled={!dirty || saving} onClick={() => save()}>
          {saving ? t("common.saving") : t("list.save")}
        </button>
      </details>

      <div className="mt-5 grid gap-6 md:grid-cols-2">
        <fieldset>
          <legend className="text-sm font-semibold">
            {t("list.checklist")} <span className="font-normal text-ink-soft">· {t("list.progress", { done, total: v.checklist.length })}</span>
          </legend>
          <ul className="mt-2 space-y-1">
            {v.checklist.map((c) => (
              <li key={c.id}>
                <label className="flex min-h-9 cursor-pointer items-center gap-3 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-teal" checked={c.done} onChange={() => toggleItem(c.id)} />
                  <span className={c.done ? "text-ink-soft line-through" : ""}>{c.key ? t(`list.checklistItems.${c.key}` as never) : c.label}</span>
                </label>
              </li>
            ))}
          </ul>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newItem.trim()) return;
              const checklist = [...v.checklist, { id: newId(), key: null, label: newItem.trim().slice(0, 80), done: false }];
              setV({ ...v, checklist });
              setNewItem("");
              void save({ checklist });
            }}
          >
            <label htmlFor={id("ni")} className="sr-only">{t("list.newItem")}</label>
            <input id={id("ni")} className="input !min-h-9" placeholder={t("list.newItem")} maxLength={80} value={newItem} onChange={(e) => setNewItem(e.target.value)} />
            <button type="submit" className="btn btn-secondary btn-sm">{t("list.addItem")}</button>
          </form>
        </fieldset>
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
          const res = await apiFetch(`/api/list/${entry.id}`, { method: "DELETE" });
          setConfirm(false);
          if (res.ok) {
            notify(t("list.removed"));
            onRemoved();
            router.refresh();
          }
        }}
      />
    </li>
  );
}

export function CollegeList({ entries }: { entries: ListEntry[] }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const notify = useToast();
  const [items, setItems] = useState(entries);
  const [custom, setCustom] = useState("");
  const upcoming = [...items].filter((e) => e.deadline).sort((a, b) => (a.deadline! < b.deadline! ? -1 : 1));

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
            <EntryCard key={e.id} entry={e} onRemoved={() => setItems((cur) => cur.filter((x) => x.id !== e.id))} />
          ))}
        </ul>
        <form
          className="card mt-6 flex flex-wrap items-end gap-3 p-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!custom.trim()) return;
            const res = await apiFetch("/api/list", { method: "POST", body: { customSchoolName: custom.trim() } });
            if (res.ok) {
              setCustom("");
              router.refresh();
              notify(t("schools.added"));
            } else notify(t(`errors.${res.code}` as never), "error");
          }}
        >
          <div className="min-w-0 flex-1">
            <label htmlFor="custom-school" className="field-label text-sm">{t("list.addCustom")}</label>
            <input id="custom-school" className="input" maxLength={160} placeholder={t("list.customName")} value={custom} onChange={(e) => setCustom(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-secondary">{t("list.add")}</button>
        </form>
      </div>
      <aside className="card h-fit p-5" aria-labelledby="upcoming">
        <h2 id="upcoming" className="text-lg font-semibold">{t("list.upcoming")}</h2>
        {upcoming.length === 0 ? <p className="mt-2 text-sm text-ink-soft">{t("list.noDeadlines")}</p> : null}
        <ol className="mt-2 space-y-2 text-sm">
          {upcoming.map((e) => (
            <li key={e.id} className="flex justify-between gap-2 border-t border-line pt-2 first:border-t-0">
              <span className="min-w-0 truncate">{locale === "zh-CN" && e.schoolNameZh ? e.schoolNameZh : e.schoolName}</span>
              <span className="shrink-0 text-ink-soft">{formatDate(`${e.deadline}T12:00:00Z`, locale)}</span>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
