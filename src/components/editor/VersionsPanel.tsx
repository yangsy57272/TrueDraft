"use client";
import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { formatDate } from "@/i18n/translate";
import { apiFetch } from "@/lib/api-client";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toaster";
import type { WorkspaceVersion } from "./types";

type Loaded = { versionNumber: number; content: string; versionNote: string | null; createdAt: string };

export function VersionsPanel({ essayId, versions, onLoad }: { essayId: string; versions: WorkspaceVersion[]; onLoad: (content: string) => void }) {
  const { t, locale } = useI18n();
  const notify = useToast();
  const [viewing, setViewing] = useState<Loaded | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<Loaded | null>(null);

  async function fetchVersion(n: number) {
    const res = await apiFetch<{ version: Loaded }>(`/api/essays/${essayId}/versions/${n}`);
    if (!res.ok) {
      notify(t(`errors.${res.code}` as never), "error");
      return null;
    }
    return res.data.version;
  }

  return (
    <div className="space-y-4">
      <section className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">{t("editor.versionsTitle")}</h2>
          {versions.length >= 2 ? (
            <Link
              href={`/essays/${essayId}/compare?from=${versions[1].versionNumber}&to=${versions[0].versionNumber}`}
              className="btn btn-secondary btn-sm"
            >
              {t("editor.compare")}
            </Link>
          ) : null}
        </div>
        {versions.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">{t("editor.versionsEmpty")}</p>
        ) : (
          <ol className="mt-2 divide-y divide-line">
            {versions.map((v) => (
              <li key={v.id} className="py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{t("common.version", { n: v.versionNumber })}</p>
                    <p className="text-xs text-ink-soft">
                      {formatDate(v.createdAt, locale, true)} · {t("editor.versionWords", { count: v.wordCount })}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={async () => setViewing(await fetchVersion(v.versionNumber))}
                      aria-label={`${t("editor.viewVersion")}: ${t("common.version", { n: v.versionNumber })}`}
                    >
                      {t("editor.viewVersion")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={async () => setRestoreTarget(await fetchVersion(v.versionNumber))}
                      aria-label={`${t("editor.restore")}: ${t("common.version", { n: v.versionNumber })}`}
                    >
                      {t("editor.restore")}
                    </button>
                  </div>
                </div>
                {v.versionNote ? <p className="mt-1 text-ink-soft">“{v.versionNote}”</p> : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      <Dialog open={viewing !== null} onOpenChange={(o) => !o && setViewing(null)} title={viewing ? t("common.version", { n: viewing.versionNumber }) : ""} wide>
        {viewing ? (
          <>
            {viewing.versionNote ? <p className="text-sm text-ink-soft">“{viewing.versionNote}”</p> : null}
            <div className="mt-3 whitespace-pre-wrap rounded-lg border border-line bg-paper p-4 font-serif leading-relaxed">{viewing.content}</div>
          </>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={restoreTarget !== null}
        onOpenChange={(o) => !o && setRestoreTarget(null)}
        title={t("editor.restore")}
        body={restoreTarget ? t("editor.restoreConfirm", { n: restoreTarget.versionNumber }) : ""}
        confirmLabel={t("editor.restore")}
        onConfirm={() => {
          if (restoreTarget) onLoad(restoreTarget.content);
          setRestoreTarget(null);
        }}
      />
    </div>
  );
}
