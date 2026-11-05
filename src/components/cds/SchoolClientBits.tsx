"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useContext, useState, type ReactNode } from "react";
import { useI18n } from "@/i18n/client";
import { apiFetch } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toaster";

/** "Add to my list" button; shows the saved state and a sign-in prompt when signed out. */
export function AddToListButton({ schoolId, onList, signedIn }: { schoolId: string; onList: boolean; signedIn: boolean }) {
  const { t } = useI18n();
  const notify = useToast();
  const router = useRouter();
  const [added, setAdded] = useState(onList);
  const [busy, setBusy] = useState(false);
  if (!signedIn) {
    return (
      <Link href="/sign-in" className="btn btn-secondary btn-sm" title={t("schools.signInToSave")}>
        + {t("schools.addToList")}
      </Link>
    );
  }
  if (added) return <Link href="/my-list" className="badge badge-strong">✓ {t("schools.onList")}</Link>;
  return (
    <button
      type="button"
      className="btn btn-secondary btn-sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const res = await apiFetch("/api/list", { method: "POST", body: { schoolId } });
        setBusy(false);
        if (res.ok || res.code === "already_on_list") {
          setAdded(true);
          notify(t("schools.added"));
          router.refresh();
        } else notify(t(`errors.${res.code}` as never), "error");
      }}
    >
      + {t("schools.addToList")}
    </button>
  );
}

const CompareContext = createContext<{ selected: string[]; toggle: (id: string) => void } | null>(null);

export function CompareProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (id: string) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= 4 ? cur : [...cur, id]));
  return <CompareContext.Provider value={{ selected, toggle }}>{children}</CompareContext.Provider>;
}

export function CompareToggle({ schoolId, name }: { schoolId: string; name: string }) {
  const { t } = useI18n();
  const ctx = useContext(CompareContext)!;
  const checked = ctx.selected.includes(schoolId);
  return (
    <label className="flex min-h-9 cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" className="h-4 w-4 accent-teal" checked={checked} disabled={!checked && ctx.selected.length >= 4} onChange={() => ctx.toggle(schoolId)} aria-label={`${t("schools.compare")}: ${name}`} />
      {t("schools.compare")}
    </label>
  );
}

export function CompareBar() {
  const { t } = useI18n();
  const ctx = useContext(CompareContext)!;
  if (ctx.selected.length === 0) return <p className="text-sm text-ink-soft">{t("schools.compareHint")}</p>;
  return (
    <Link href={`/schools/compare?ids=${ctx.selected.join(",")}`} className="btn btn-primary btn-sm">
      {t("schools.compareSelected", { count: ctx.selected.length })}
    </Link>
  );
}
