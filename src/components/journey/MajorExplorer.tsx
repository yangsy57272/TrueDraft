"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useI18n } from "@/i18n/client";
import { formatDate } from "@/i18n/translate";
import { apiFetch, runStreamingTool } from "@/lib/api-client";
import { CIP_FAMILIES } from "@/lib/planning";
import { useConsentGate } from "@/components/ai/useConsentGate";
import { ProgressStages } from "@/components/editor/ProgressStages";
import { useToast } from "@/components/ui/Toaster";
import type { WorkspaceAi } from "@/components/editor/types";

export type MajorResult = {
  themes: { theme: string; evidence: string }[];
  suggestions: {
    major: string;
    cip_family: string | null;
    why_it_might_fit: string;
    based_on: { text: string; grounded: boolean }[];
    what_you_would_study: string;
    related_majors: string[];
    ways_to_test_interest: string[];
    questions_to_ask_yourself: string[];
    zh_note: string | null;
  }[];
  broader_options: { major: string; cip_family: string | null; why: string }[];
  reflective_questions: string[];
  notes_on_naming: string;
  limitations: string;
};

type Run = { id: string; createdAt: string; status: string; provider: string; result: MajorResult | null };
type Major = { id: string; name: string; cipFamily?: string | null };

export function MajorExplorer({
  ai,
  hasProfile,
  initialMajors,
  runs: firstPage,
  nextCursor: firstCursor = null,
}: {
  ai: WorkspaceAi;
  hasProfile: boolean;
  initialMajors: Major[];
  runs: Run[];
  nextCursor?: string | null;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const notify = useToast();
  const uid = useId();
  const gate = useConsentGate(ai);
  const [stage, setStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Older pages are appended below the server-rendered first page.
  const [older, setOlder] = useState<{ runs: Run[]; cursor: string | null; forFirst: string | undefined }>({ runs: [], cursor: firstCursor, forFirst: firstPage[0]?.id });
  const olderValid = older.forFirst === firstPage[0]?.id ? older : { runs: [], cursor: firstCursor, forFirst: firstPage[0]?.id };
  const runs = [...firstPage, ...olderValid.runs.filter((r) => !firstPage.some((f) => f.id === r.id))];
  const [loadingOlder, setLoadingOlder] = useState(false);
  const latestCompleted = runs.find((r) => r.status === "completed" && r.result);

  async function loadOlder() {
    if (!olderValid.cursor) return;
    setLoadingOlder(true);
    const res = await apiFetch<{ runs: (Omit<Run, "createdAt"> & { createdAt: string })[]; nextCursor: string | null }>(
      `/api/planning/runs?kind=major_explorer&cursor=${encodeURIComponent(olderValid.cursor)}`,
    );
    setLoadingOlder(false);
    if (!res.ok) {
      notify(t(`errors.${res.code}` as never), "error");
      return;
    }
    setOlder({ runs: [...olderValid.runs, ...(res.data.runs as Run[])], cursor: res.data.nextCursor, forFirst: firstPage[0]?.id });
  }
  const [current, setCurrent] = useState<{ result: MajorResult; isMock: boolean } | null>(
    latestCompleted?.result ? { result: latestCompleted.result, isMock: latestCompleted.provider === "mock" } : null,
  );
  const [majors, setMajors] = useState<Major[]>(initialMajors);
  const [own, setOwn] = useState("");
  const cipName = (code: string | null) => (code && CIP_FAMILIES[code] ? CIP_FAMILIES[code][locale === "zh-CN" ? "zh" : "en"] : null);

  async function run() {
    setError(null);
    if (!(await gate.ensure())) return;
    setStage("checking");
    const res = await runStreamingTool<MajorResult>("/api/planning/major_explorer", {}, setStage);
    setStage(null);
    if (!res.ok) {
      if (res.code === "consent_required") gate.revoke();
      setError(t(`errors.${res.code}` as never));
      return;
    }
    setCurrent({ result: res.result, isMock: res.isMock });
    router.refresh();
  }

  async function addMajor(name: string, cipFamily: string | null) {
    const res = await apiFetch<{ majors: Major[] }>("/api/profile/majors", { method: "POST", body: { name, cipFamily } });
    if (res.ok) {
      setMajors(res.data.majors);
      notify(t("majors.added"));
    } else notify(t(`errors.${res.code}` as never), "error");
  }

  async function removeMajor(id: string) {
    const res = await apiFetch<{ majors: Major[] }>("/api/profile/majors", { method: "DELETE", body: { id } });
    if (res.ok) setMajors(res.data.majors);
  }

  async function deleteRun(id: string) {
    const res = await apiFetch(`/api/planning/runs/${id}`, { method: "DELETE" });
    if (res.ok) {
      setOlder((cur) => ({ ...cur, runs: cur.runs.filter((r) => r.id !== id) }));
      if (latestCompleted?.id === id) setCurrent(null);
      router.refresh();
    }
  }

  const has = (name: string) => majors.some((m) => m.name.toLowerCase() === name.toLowerCase());

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 space-y-6">
        {!hasProfile ? (
          <div className="card p-6">
            <p>{t("majors.needProfile")}</p>
            <Link href="/profile" className="btn btn-primary mt-4">{t("majors.goToProfile")}</Link>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn btn-accent" disabled={!ai.configured || stage !== null} onClick={run}>
              {current ? t("majors.rerun") : t("majors.run")}
            </button>
            {!ai.configured ? <p className="text-sm text-ink-soft">{t("editor.aiDisabled")}</p> : null}
          </div>
        )}
        {stage ? <ProgressStages stage={stage} kind="major_explorer" /> : null}
        {error ? <p className="notice notice-error" role="alert">{error}</p> : null}

        {current && !stage ? (
          <div className="space-y-6">
            {current.isMock ? <p className="notice notice-warn text-sm">{t("feedback.mockBanner")}</p> : null}
            <p className="notice text-sm">{t("feedback.aiNote")}</p>
            {current.result.themes.length ? (
              <section aria-labelledby={`${uid}-themes`}>
                <h2 id={`${uid}-themes`} className="text-xl font-semibold">{t("majors.themes")}</h2>
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {current.result.themes.map((th, i) => (
                    <li key={i} className="card p-4">
                      <p className="font-semibold">{th.theme}</p>
                      <p className="mt-1 text-sm text-ink-soft">{th.evidence}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            <section aria-labelledby={`${uid}-sugg`}>
              <h2 id={`${uid}-sugg`} className="text-xl font-semibold">{t("majors.suggestions")}</h2>
              <ol className="mt-3 space-y-4">
                {current.result.suggestions.map((s, i) => (
                  <li key={i} className="card p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-serif text-xl font-semibold">{s.major}</h3>
                        {cipName(s.cip_family) ? <p className="text-sm text-ink-soft">{t("majors.field")}: {cipName(s.cip_family)}</p> : null}
                      </div>
                      <button type="button" className="btn btn-secondary btn-sm" disabled={has(s.major)} onClick={() => addMajor(s.major, s.cip_family)}>
                        {has(s.major) ? "✓" : "+"} {t("majors.addToMine")}
                      </button>
                    </div>
                    <p className="mt-3"><strong>{t("majors.whyFit")}:</strong> {s.why_it_might_fit}</p>
                    {s.based_on.length ? (
                      <p className="mt-2 text-sm">
                        <strong>{t("majors.basedOn")}:</strong>{" "}
                        {s.based_on.map((b, j) => (
                          <span key={j} className={`mr-2 inline-flex items-center gap-1 ${b.grounded ? "" : "text-amber"}`}>
                            “{b.text}”{!b.grounded ? <span className="text-xs">({t("majors.notInProfile")})</span> : null}
                          </span>
                        ))}
                      </p>
                    ) : null}
                    <p className="mt-2 text-sm"><strong>{t("majors.whatYouStudy")}:</strong> {s.what_you_would_study}</p>
                    {s.related_majors.length ? <p className="mt-2 text-sm"><strong>{t("majors.related")}:</strong> {s.related_majors.join(" · ")}</p> : null}
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      <div>
                        <h4 className="text-sm font-semibold">{t("majors.testInterest")}</h4>
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{s.ways_to_test_interest.map((x, j) => <li key={j}>{x}</li>)}</ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold">{t("majors.askYourself")}</h4>
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{s.questions_to_ask_yourself.map((x, j) => <li key={j}>{x}</li>)}</ul>
                      </div>
                    </div>
                    {s.zh_note ? <p className="mt-3 rounded-md bg-sage-soft px-3 py-2 text-sm" lang="zh-Hans">{s.zh_note}</p> : null}
                    {s.cip_family ? (
                      <Link href={`/schools?field=${s.cip_family}`} className="mt-3 inline-block text-sm">{t("majors.findSchools")} →</Link>
                    ) : null}
                  </li>
                ))}
              </ol>
            </section>
            {current.result.broader_options.length ? (
              <section aria-labelledby={`${uid}-broad`}>
                <h2 id={`${uid}-broad`} className="text-xl font-semibold">{t("majors.broader")}</h2>
                <ul className="mt-3 space-y-2">
                  {current.result.broader_options.map((b, i) => (
                    <li key={i} className="card flex flex-wrap items-start justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="font-semibold">{b.major}</p>
                        <p className="text-sm text-ink-soft">{b.why}</p>
                      </div>
                      <button type="button" className="btn btn-ghost btn-sm" disabled={has(b.major)} onClick={() => addMajor(b.major, b.cip_family)}>
                        {has(b.major) ? "✓" : "+"} {t("majors.addToMine")}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {current.result.reflective_questions.length ? (
              <section>
                <h2 className="text-xl font-semibold">{t("majors.reflective")}</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5">{current.result.reflective_questions.map((q, i) => <li key={i}>{q}</li>)}</ul>
              </section>
            ) : null}
            <section className="notice text-sm">
              <p><strong>{t("majors.naming")}:</strong> {current.result.notes_on_naming}</p>
              <p className="mt-2"><strong>{t("majors.limitations")}:</strong> {current.result.limitations}</p>
            </section>
          </div>
        ) : null}
      </div>

      <aside className="space-y-6" aria-label={t("majors.myMajors")}>
        <section className="card p-5">
          <h2 className="text-lg font-semibold">{t("majors.myMajors")}</h2>
          {majors.length === 0 ? <p className="mt-2 text-sm text-ink-soft">{t("majors.myMajorsEmpty")}</p> : null}
          <ul className="mt-3 space-y-2">
            {majors.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 rounded-md border border-line px-3 py-2 text-sm">
                <span className="min-w-0">
                  {m.name}
                  {m.cipFamily ? (
                    <Link href={`/schools?field=${m.cipFamily}`} className="ml-2 text-xs">{t("nav.schools")}</Link>
                  ) : null}
                </span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeMajor(m.id)} aria-label={`${t("profile.remove")}: ${m.name}`}>✕</button>
              </li>
            ))}
          </ul>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (own.trim()) {
                void addMajor(own.trim(), null);
                setOwn("");
              }
            }}
          >
            <label htmlFor={`${uid}-own`} className="sr-only">{t("majors.addOwnLabel")}</label>
            <input id={`${uid}-own`} className="input" maxLength={80} placeholder={t("majors.addOwnLabel")} value={own} onChange={(e) => setOwn(e.target.value)} />
            <button type="submit" className="btn btn-secondary btn-sm">{t("majors.addOwn")}</button>
          </form>
        </section>
        {runs.length ? (
          <section className="card p-5">
            <h2 className="text-lg font-semibold">{t("majors.history")}</h2>
            <ul className="mt-2 divide-y divide-line">
              {runs.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <button type="button" className="text-left underline decoration-line-strong underline-offset-4 disabled:no-underline" disabled={!r.result} onClick={() => r.result && setCurrent({ result: r.result, isMock: r.provider === "mock" })}>
                    {formatDate(r.createdAt, locale, true)}
                    {r.status === "failed" ? ` · ${t("feedback.failed")}` : ""}
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => deleteRun(r.id)} aria-label={`${t("majors.deleteRun")}: ${formatDate(r.createdAt, locale, true)}`}>{t("majors.deleteRun")}</button>
                </li>
              ))}
            </ul>
            {olderValid.cursor ? (
              <button type="button" className="btn btn-secondary btn-sm mt-3" disabled={loadingOlder} onClick={() => void loadOlder()}>
                {loadingOlder ? t("common.loading") : t("majors.showOlder")}
              </button>
            ) : null}
          </section>
        ) : null}
      </aside>
      {gate.dialog}
    </div>
  );
}
