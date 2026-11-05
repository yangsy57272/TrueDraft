"use client";
import { useEffect, useId, useState } from "react";
import { useI18n } from "@/i18n/client";
import { formatDate } from "@/i18n/translate";
import {
  DEADLINE_TYPES,
  DEFAULT_TIME,
  LOCAL_TZ,
  MAX_DEADLINES,
  STATE_ORDER,
  daysUntil,
  deadlineInstant,
  deadlineState,
  isValidTimeZone,
  type Deadline,
  type DeadlineState,
  type DeadlineType,
} from "@/lib/deadlines";

const COMMON_ZONES = ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Toronto", "Europe/London", "Asia/Shanghai", "Asia/Hong_Kong", "Asia/Singapore"];
const STATE_ICON: Record<DeadlineState, string> = { overdue: "!", due_soon: "◷", upcoming: "○", completed: "✓" };
const STATE_CLASS: Record<DeadlineState, string> = { overdue: "badge-attention", due_soon: "badge-developing", upcoming: "badge-neutral", completed: "badge-strong" };

/** Current time and the viewer's zone, only after mount, so server and client render the same HTML. */
export function useClock() {
  const [clock, setClock] = useState<{ now: Date; tz: string } | null>(null);
  useEffect(() => {
    const tick = () => setClock({ now: new Date(), tz: Intl.DateTimeFormat().resolvedOptions().timeZone });
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);
  return clock;
}

export function StateBadge({ state, days }: { state: DeadlineState; days: number }) {
  const { t } = useI18n();
  const text =
    state === "overdue"
      ? t("list.deadlineStates.overdue")
      : state === "completed"
        ? t("list.deadlineStates.completed")
        : days <= 0
          ? t("list.deadlineStates.today")
          : t(state === "due_soon" ? "list.deadlineStates.dueSoon" : "list.deadlineStates.upcoming", { days });
  return (
    <span className={`badge ${STATE_CLASS[state]}`}>
      <span aria-hidden="true">{STATE_ICON[state]}</span>
      {text}
    </span>
  );
}

export function useDeadlineText() {
  const { t, locale } = useI18n();
  return (d: Deadline) => {
    const date = formatDate(`${d.date}T12:00:00Z`, locale);
    const time = d.time ?? DEFAULT_TIME;
    const zone = d.timeZone === LOCAL_TZ ? t("list.yourLocalTime") : d.timeZone.replace(/_/g, " ");
    return `${date}, ${time} (${zone})`;
  };
}

export function deadlineLabel(t: (k: never, v?: Record<string, string | number>) => string, d: Deadline) {
  return d.type === "other" && d.label ? d.label : t(`list.deadlineTypes.${d.type}` as never);
}

function SourceText({ source }: { source: string | null }) {
  const { t } = useI18n();
  if (!source) return <span className="text-amber">{t("list.noSource")}</span>;
  if (/^https:\/\//i.test(source)) {
    return (
      <a href={source} target="_blank" rel="noopener noreferrer">
        {t("list.sourceLink")} <span className="sr-only">{t("schools.opensNewTab")}</span>
        <span aria-hidden="true">↗</span>
      </a>
    );
  }
  return <span>{source}</span>;
}

export type DeadlineOps = {
  add: (input: Omit<Deadline, "id">) => void;
  update: (deadlineId: string, patch: Partial<Omit<Deadline, "id">>) => void;
  remove: (deadlineId: string) => void;
};

/** One school's deadlines: state, time zone, source, done, and an add form. */
export function DeadlineList({ deadlines, ops }: { deadlines: Deadline[]; ops: DeadlineOps }) {
  const { t } = useI18n();
  const uid = useId();
  const clock = useClock();
  const describe = useDeadlineText();
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState<DeadlineType>("application");
  const [label, setLabel] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [zoneChoice, setZoneChoice] = useState<string>(LOCAL_TZ);
  const [customZone, setCustomZone] = useState("");
  const [source, setSource] = useState("");
  const zone = zoneChoice === "custom" ? customZone.trim() : zoneChoice;
  const zoneOk = isValidTimeZone(zone);

  const sorted = [...deadlines].sort((a, b) => {
    if (!clock) return a.date.localeCompare(b.date);
    const sa = deadlineState(a, clock.now, clock.tz);
    const sb = deadlineState(b, clock.now, clock.tz);
    return STATE_ORDER[sa] - STATE_ORDER[sb] || deadlineInstant(a, clock.tz).getTime() - deadlineInstant(b, clock.tz).getTime();
  });

  function submit() {
    if (!date || !zoneOk) return;
    ops.add({ type, label: type === "other" ? label.trim() || null : null, date, time: time || null, timeZone: zone, source: source.trim() || null, done: false });
    setAdding(false);
    setDate("");
    setTime("");
    setSource("");
    setLabel("");
  }

  const id = (s: string) => `${uid}-${s}`;
  return (
    <div>
      <h3 className="text-sm font-semibold">{t("list.deadlines")}</h3>
      {sorted.length === 0 ? <p className="mt-2 text-sm text-ink-soft">{t("list.noDeadlinesHere")}</p> : null}
      <ul className="mt-2 space-y-2">
        {sorted.map((d) => {
          const state = clock ? deadlineState(d, clock.now, clock.tz) : null;
          return (
            <li key={d.id} className="rounded-lg border border-line p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex min-h-9 cursor-pointer items-center gap-2 font-semibold">
                  <input type="checkbox" className="h-4 w-4 accent-teal" checked={d.done} onChange={(e) => ops.update(d.id, { done: e.target.checked })} />
                  <span className={d.done ? "text-ink-soft line-through" : ""}>{deadlineLabel(t as never, d)}</span>
                  <span className="sr-only">{t("list.markDone")}</span>
                </label>
                {state && clock ? <StateBadge state={state} days={daysUntil(d, clock.now, clock.tz)} /> : null}
              </div>
              <p className="mt-1 text-ink-soft">{describe(d)}</p>
              <p className="mt-1 text-xs">
                {t("list.source")}: <SourceText source={d.source} />
              </p>
              <button type="button" className="btn btn-ghost btn-sm mt-1 !min-h-8 !px-2 text-xs" onClick={() => ops.remove(d.id)}>
                {t("list.removeItem")}<span className="sr-only">: {deadlineLabel(t as never, d)}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {!adding ? (
        <button type="button" className="btn btn-secondary btn-sm mt-2" disabled={deadlines.length >= MAX_DEADLINES} onClick={() => setAdding(true)}>
          + {t("list.addDeadline")}
        </button>
      ) : (
        <fieldset className="mt-3 grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-2">
          <legend className="px-1 text-sm font-semibold">{t("list.addDeadline")}</legend>
          <div>
            <label htmlFor={id("type")} className="field-label text-sm">{t("list.deadlineType")}</label>
            <select id={id("type")} className="input" value={type} onChange={(e) => setType(e.target.value as DeadlineType)}>
              {DEADLINE_TYPES.map((x) => <option key={x} value={x}>{t(`list.deadlineTypes.${x}` as never)}</option>)}
            </select>
          </div>
          {type === "other" ? (
            <div>
              <label htmlFor={id("label")} className="field-label text-sm">{t("list.deadlineName")}</label>
              <input id={id("label")} className="input" maxLength={60} value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
          ) : null}
          <div>
            <label htmlFor={id("date")} className="field-label text-sm">{t("list.deadlineDate")}</label>
            <input id={id("date")} type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label htmlFor={id("time")} className="field-label text-sm">{t("list.deadlineTime")}</label>
            <input id={id("time")} type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} aria-describedby={id("timeh")} />
            <p id={id("timeh")} className="field-help">{t("list.deadlineTimeHelp")}</p>
          </div>
          <div>
            <label htmlFor={id("zone")} className="field-label text-sm">{t("list.timeZone")}</label>
            <select id={id("zone")} className="input" value={zoneChoice} onChange={(e) => setZoneChoice(e.target.value)}>
              <option value={LOCAL_TZ}>{t("list.yourLocalTime")}</option>
              {COMMON_ZONES.map((z) => <option key={z} value={z}>{z.replace(/_/g, " ")}</option>)}
              <option value="custom">{t("list.otherZone")}</option>
            </select>
            {zoneChoice === "custom" ? (
              <>
                <label htmlFor={id("cz")} className="sr-only">{t("list.otherZone")}</label>
                <input id={id("cz")} className="input mt-2" placeholder="Europe/Paris" value={customZone} onChange={(e) => setCustomZone(e.target.value)} aria-invalid={!zoneOk} />
                {!zoneOk && customZone ? <p className="field-help text-coral-dark">{t("list.invalidZone")}</p> : null}
              </>
            ) : null}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor={id("src")} className="field-label text-sm">{t("list.source")}</label>
            <input id={id("src")} className="input" maxLength={300} placeholder="https://" value={source} onChange={(e) => setSource(e.target.value)} aria-describedby={id("srch")} />
            <p id={id("srch")} className="field-help">{t("list.sourceHelp")}</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button type="button" className="btn btn-primary btn-sm" disabled={!date || !zoneOk} onClick={submit}>{t("list.saveDeadline")}</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>{t("common.cancel")}</button>
          </div>
        </fieldset>
      )}
    </div>
  );
}

/** All deadlines across the list, grouped by state. */
export function DeadlineOverview({ entries }: { entries: { id: string; name: string; deadlines: Deadline[] }[] }) {
  const { t } = useI18n();
  const clock = useClock();
  const describe = useDeadlineText();
  const all = entries.flatMap((e) => e.deadlines.map((d) => ({ d, name: e.name, entryId: e.id })));
  if (all.length === 0) return <p className="mt-2 text-sm text-ink-soft">{t("list.noDeadlines")}</p>;
  if (!clock) return <p className="mt-2 text-sm text-ink-soft">{t("common.loading")}</p>;
  const withState = all
    .map((x) => ({ ...x, state: deadlineState(x.d, clock.now, clock.tz), at: deadlineInstant(x.d, clock.tz).getTime() }))
    .sort((a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state] || a.at - b.at);
  const groups: DeadlineState[] = ["overdue", "due_soon", "upcoming"];
  const completed = withState.filter((x) => x.state === "completed");
  return (
    <div className="mt-2 space-y-4">
      {groups.map((g) => {
        const items = withState.filter((x) => x.state === g);
        if (!items.length) return null;
        return (
          <section key={g} aria-label={t(`list.deadlineGroups.${g}` as never)}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{t(`list.deadlineGroups.${g}` as never)} ({items.length})</h3>
            <ol className="mt-1 space-y-2 text-sm">
              {items.map(({ d, name, state }) => (
                <li key={d.id} className="border-t border-line pt-2 first:border-t-0">
                  <p className="font-medium">{name}</p>
                  <p className="text-ink-soft">{deadlineLabel(t as never, d)} · {describe(d)}</p>
                  <StateBadge state={state} days={daysUntil(d, clock.now, clock.tz)} />
                </li>
              ))}
            </ol>
          </section>
        );
      })}
      {completed.length ? <p className="text-xs text-ink-soft">{t("list.completedCount", { count: completed.length })}</p> : null}
    </div>
  );
}
