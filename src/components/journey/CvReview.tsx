"use client";
import { useId, useState, type ReactNode } from "react";
import { useI18n } from "@/i18n/client";
import { newId } from "@/lib/api-client";
import { ACTIVITY_TYPES, COURSE_LEVELS, HONOR_LEVELS, PROFILE_LIMITS, type Activity, type Course, type Honor, type StudentProfile } from "@/lib/planning";

export type Extracted = {
  courses: { id: string; name: string; level: Course["level"]; grade: number | null; result?: string | null; foundInCv: boolean; excerpt?: string | null }[];
  activities: {
    id: string;
    type: Activity["type"];
    role: string;
    organization: string;
    description: string;
    grades: number[];
    hours_per_week: number | null;
    weeks_per_year: number | null;
    foundInCv: boolean;
    excerpt?: string | null;
  }[];
  honors: { id: string; title: string; level: Honor["level"]; grades: number[]; foundInCv: boolean; excerpt?: string | null }[];
  skipped_notes: string[];
};

type Kind = "courses" | "activities" | "honors";
const key = (s: string | null | undefined) => (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

/** Whether an extracted item already exists in the profile (by name / title / role + organization). */
function duplicateOf(kind: Kind, item: Record<string, unknown>, profile: StudentProfile) {
  if (kind === "courses") return profile.courses.some((c) => key(c.name) === key(item.name as string));
  if (kind === "honors") return profile.honors.some((h) => key(h.title) === key(item.title as string));
  return profile.activities.some((a) => key(a.role) === key(item.role as string) && key(a.organization) === key(item.organization as string));
}

/**
 * Review step for CV import. Items that couldn't be matched in the CV, or that duplicate something
 * already in the profile, start unticked. Every field is editable before adding, the CV line each
 * item came from is shown, and the profile's limits are enforced visibly rather than by silently
 * dropping items.
 */
export function CvReview({
  extracted,
  profile,
  isMock,
  onAdd,
  onCancel,
}: {
  extracted: Extracted;
  profile: StudentProfile;
  isMock: boolean;
  onAdd: (items: { courses: Course[]; activities: Activity[]; honors: Honor[] }) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const uid = useId();
  const [items, setItems] = useState(() => structuredClone(extracted));
  const [picked, setPicked] = useState<Set<string>>(
    () =>
      new Set(
        (["courses", "activities", "honors"] as const).flatMap((kind) =>
          (extracted[kind] as { id: string; foundInCv: boolean }[])
            .filter((x) => x.foundInCv && !duplicateOf(kind, x as unknown as Record<string, unknown>, profile))
            .map((x) => x.id),
        ),
      ),
  );
  const toggle = (itemId: string, on: boolean) =>
    setPicked((cur) => {
      const next = new Set(cur);
      if (on) next.add(itemId);
      else next.delete(itemId);
      return next;
    });
  const edit = <K extends Kind>(kind: K, itemId: string, patch: Partial<Extracted[K][number]>) =>
    setItems((cur) => ({ ...cur, [kind]: (cur[kind] as { id: string }[]).map((x) => (x.id === itemId ? { ...x, ...patch } : x)) }));

  const count = (kind: Kind) => (items[kind] as { id: string }[]).filter((x) => picked.has(x.id)).length;
  const room = { courses: PROFILE_LIMITS.courses - profile.courses.length, activities: PROFILE_LIMITS.activities - profile.activities.length, honors: PROFILE_LIMITS.honors - profile.honors.length };
  const over = (["courses", "activities", "honors"] as const).filter((k) => count(k) > room[k]);
  const blankSelected =
    items.courses.some((c) => picked.has(c.id) && !c.name.trim()) ||
    items.activities.some((a) => picked.has(a.id) && !a.role.trim()) ||
    items.honors.some((h) => picked.has(h.id) && !h.title.trim());
  const total = items.courses.length + items.activities.length + items.honors.length;

  function add() {
    onAdd({
      courses: items.courses.filter((c) => picked.has(c.id)).map((c) => ({ id: newId(), name: c.name.trim(), level: c.level, grade: (c.grade as Course["grade"]) ?? null, result: c.result ?? "" })),
      activities: items.activities
        .filter((a) => picked.has(a.id))
        .map((a) => ({ id: newId(), type: a.type, role: a.role.trim(), organization: a.organization.trim(), description: a.description.slice(0, 150), grades: a.grades, hoursPerWeek: a.hours_per_week, weeksPerYear: a.weeks_per_year })),
      honors: items.honors.filter((h) => picked.has(h.id)).map((h) => ({ id: newId(), title: h.title.trim(), level: h.level, grades: h.grades })),
    });
  }

  // A plain function (not a component) so inputs keep focus across re-renders.
  const row = (kind: Kind, item: { id: string; foundInCv: boolean; excerpt?: string | null }, label: string, children: ReactNode) => {
    const dup = duplicateOf(kind, item as unknown as Record<string, unknown>, profile);
    return (
      <li key={item.id} className="rounded-lg border border-line p-3">
        <div className="flex flex-wrap items-start gap-3">
          <input
            id={`${uid}-${item.id}`}
            type="checkbox"
            className="mt-1 h-4 w-4 accent-teal"
            checked={picked.has(item.id)}
            onChange={(e) => toggle(item.id, e.target.checked)}
          />
          <label htmlFor={`${uid}-${item.id}`} className="min-w-0 flex-1 text-sm font-semibold">{label}</label>
          {!item.foundInCv ? <span className="badge badge-developing">◐ {t("profile.cv.check")}</span> : null}
          {dup ? <span className="badge badge-neutral">{t("profile.cv.duplicate")}</span> : null}
        </div>
        {item.excerpt ? (
          <p className="mt-2 text-xs text-ink-soft">
            {t("profile.cv.fromCv")}: <q className="italic">{item.excerpt}</q>
          </p>
        ) : (
          <p className="mt-2 text-xs text-amber">{t("profile.cv.noExcerpt")}</p>
        )}
        <div className="mt-2 grid gap-2 sm:grid-cols-2">{children}</div>
      </li>
    );
  };
  const field = (labelText: string, idSuffix: string, control: ReactNode) => (
    <div>
      <label htmlFor={`${uid}-${idSuffix}`} className="text-xs font-semibold text-ink-soft">{labelText}</label>
      {control}
    </div>
  );
  const inputCls = "input !min-h-9 !py-1 text-sm";

  return (
    <div className="mt-4">
      {isMock ? <p className="notice notice-warn mb-3 text-sm">{t("feedback.mockBanner")}</p> : null}
      <h3 className="font-semibold">{t("profile.cv.reviewTitle")}</h3>
      <p className="mt-1 text-sm text-ink-soft">{t("profile.cv.reviewIntro")}</p>
      {total === 0 ? <p className="mt-3 text-sm">{t("profile.cv.none")}</p> : null}
      <ul className="mt-3 space-y-2">
        {items.courses.map((c) =>
          row("courses", c, `${t("profile.sections.courses")}: ${c.name || "—"}`, (
            <>
            {field(t("profile.fields.courseName"), `${c.id}-n`, <input id={`${uid}-${c.id}-n`} className={inputCls} maxLength={80} value={c.name} onChange={(e) => edit("courses", c.id, { name: e.target.value })} />)}
            {field(t("profile.fields.courseLevel"), `${c.id}-l`, (
              <select id={`${uid}-${c.id}-l`} className={inputCls} value={c.level} onChange={(e) => edit("courses", c.id, { level: e.target.value as Course["level"] })}>
                {COURSE_LEVELS.map((l) => <option key={l} value={l}>{t(`profile.levels.${l}` as never)}</option>)}
              </select>
            ))}
            </>
          )),
        )}
        {items.activities.map((a) =>
          row("activities", a, `${t(`profile.activityTypes.${a.type}` as never)}: ${a.role || "—"}${a.organization ? `, ${a.organization}` : ""}`, (
            <>
            {field(t("profile.fields.activityType"), `${a.id}-t`, (
              <select id={`${uid}-${a.id}-t`} className={inputCls} value={a.type} onChange={(e) => edit("activities", a.id, { type: e.target.value as Activity["type"] })}>
                {ACTIVITY_TYPES.map((x) => <option key={x} value={x}>{t(`profile.activityTypes.${x}` as never)}</option>)}
              </select>
            ))}
            {field(t("profile.fields.activityRole"), `${a.id}-r`, <input id={`${uid}-${a.id}-r`} className={inputCls} maxLength={50} value={a.role} onChange={(e) => edit("activities", a.id, { role: e.target.value })} />)}
            {field(t("profile.fields.activityOrg"), `${a.id}-o`, <input id={`${uid}-${a.id}-o`} className={inputCls} maxLength={100} value={a.organization} onChange={(e) => edit("activities", a.id, { organization: e.target.value })} />)}
            <div className="sm:col-span-2">
              {field(`${t("profile.fields.activityDesc")} (${a.description.length}/150)`, `${a.id}-d`, (
                <textarea id={`${uid}-${a.id}-d`} className={inputCls} rows={2} maxLength={150} value={a.description} onChange={(e) => edit("activities", a.id, { description: e.target.value })} />
              ))}
            </div>
            {field(t("profile.fields.hoursPerWeek"), `${a.id}-h`, (
              <input id={`${uid}-${a.id}-h`} type="number" min={0} max={80} className={inputCls} value={a.hours_per_week ?? ""} onChange={(e) => edit("activities", a.id, { hours_per_week: e.target.value === "" ? null : Math.max(0, Math.min(80, Math.round(Number(e.target.value)))) })} />
            ))}
            {field(t("profile.fields.weeksPerYear"), `${a.id}-w`, (
              <input id={`${uid}-${a.id}-w`} type="number" min={0} max={52} className={inputCls} value={a.weeks_per_year ?? ""} onChange={(e) => edit("activities", a.id, { weeks_per_year: e.target.value === "" ? null : Math.max(0, Math.min(52, Math.round(Number(e.target.value)))) })} />
            ))}
            </>
          )),
        )}
        {items.honors.map((h) =>
          row("honors", h, `${t("profile.sections.honors")}: ${h.title || "—"}`, (
            <>
            {field(t("profile.fields.honorTitle"), `${h.id}-n`, <input id={`${uid}-${h.id}-n`} className={inputCls} maxLength={100} value={h.title} onChange={(e) => edit("honors", h.id, { title: e.target.value })} />)}
            {field(t("profile.fields.honorLevel"), `${h.id}-l`, (
              <select id={`${uid}-${h.id}-l`} className={inputCls} value={h.level} onChange={(e) => edit("honors", h.id, { level: e.target.value as Honor["level"] })}>
                {HONOR_LEVELS.map((l) => <option key={l} value={l}>{t(`profile.honorLevels.${l}` as never)}</option>)}
              </select>
            ))}
            </>
          )),
        )}
      </ul>
      {items.skipped_notes.length ? (
        <p className="mt-3 text-xs text-ink-soft">
          {t("profile.cv.skipped")}: {items.skipped_notes.join(" · ")}
        </p>
      ) : null}
      {over.length ? (
        <div className="notice notice-warn mt-3 text-sm" role="alert">
          {over.map((k) => (
            <p key={k}>{t("profile.cv.overLimit", { section: t(`profile.sections.${k}` as never), room: Math.max(0, room[k]), max: PROFILE_LIMITS[k] })}</p>
          ))}
        </div>
      ) : null}
      {blankSelected ? <p className="notice notice-warn mt-3 text-sm" role="alert">{t("profile.cv.blankSelected")}</p> : null}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-primary btn-sm" disabled={picked.size === 0 || over.length > 0 || blankSelected} onClick={add}>
          {t("profile.cv.addCount", { count: picked.size })}
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>{t("common.cancel")}</button>
      </div>
    </div>
  );
}
