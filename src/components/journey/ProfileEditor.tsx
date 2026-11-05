"use client";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type ReactNode } from "react";
import { useI18n } from "@/i18n/client";
import { apiFetch, newId, runStreamingTool } from "@/lib/api-client";
import {
  ACTIVITY_TYPES,
  AID_NEEDS,
  COURSE_LEVELS,
  CURRICULA,
  GRADE_LEVELS,
  HONOR_LEVELS,
  REGIONS,
  SIZE_PREFS,
  TEST_PLANS,
  type Activity,
  type Course,
  type Honor,
  type StudentProfile,
} from "@/lib/planning";
import { useConsentGate } from "@/components/ai/useConsentGate";
import { ProgressStages } from "@/components/editor/ProgressStages";
import { useToast } from "@/components/ui/Toaster";
import type { WorkspaceAi } from "@/components/editor/types";

type Extracted = {
  courses: (Omit<Course, "id"> & { id: string; foundInCv: boolean; result?: string | null })[];
  activities: { id: string; type: Activity["type"]; role: string; organization: string; description: string; grades: number[]; hours_per_week: number | null; weeks_per_year: number | null; foundInCv: boolean }[];
  honors: (Omit<Honor, "id"> & { id: string; foundInCv: boolean })[];
  skipped_notes: string[];
};

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="card p-5 sm:p-6">
      <h2 id={id} className="text-xl font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function GradeChecks({ value, onChange, legend }: { value: number[]; onChange: (v: number[]) => void; legend: string }) {
  const { t } = useI18n();
  return (
    <fieldset>
      <legend className="field-label">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {GRADE_LEVELS.map((g) => (
          <label key={g} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-line bg-card px-3 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-teal" checked={value.includes(g)} onChange={(e) => onChange(e.target.checked ? [...value, g].sort() : value.filter((x) => x !== g))} />
            {t("profile.gradeLabel", { n: g })}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

export function ProfileEditor({ initial, ai }: { initial: StudentProfile; ai: WorkspaceAi }) {
  const { t } = useI18n();
  const router = useRouter();
  const notify = useToast();
  const uid = useId();
  const [p, setP] = useState<StudentProfile>(initial);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const gate = useConsentGate(ai);

  const update = (patch: Partial<StudentProfile>) => {
    setP((cur) => ({ ...cur, ...patch }));
    setDirty(true);
  };
  const id = (s: string) => `${uid}-${s}`;

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function save() {
    setSaving(true);
    setError(null);
    const res = await apiFetch<{ profile: StudentProfile }>("/api/profile", { method: "PUT", body: { profile: p } });
    setSaving(false);
    if (res.ok) {
      setP(res.data.profile);
      setDirty(false);
      notify(t("profile.saved"));
      router.refresh();
    } else {
      setError(`${t(`errors.${res.code}` as never)}${res.details?.field ? ` (${res.details.field})` : ""}`);
    }
  }

  /* ----------------------------- list helpers ----------------------------- */
  function move<T>(list: T[], index: number, delta: number) {
    const next = [...list];
    const target = index + delta;
    if (target < 0 || target >= next.length) return list;
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  }
  const setCourse = (i: number, patch: Partial<Course>) => update({ courses: p.courses.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  const setActivity = (i: number, patch: Partial<Activity>) => update({ activities: p.activities.map((a, j) => (j === i ? { ...a, ...patch } : a)) });
  const setHonor = (i: number, patch: Partial<Honor>) => update({ honors: p.honors.map((h, j) => (j === i ? { ...h, ...patch } : h)) });

  /* ------------------------------- CV import ------------------------------ */
  const [cvText, setCvText] = useState("");
  const [cvStage, setCvStage] = useState<string | null>(null);
  const [cvError, setCvError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<Extracted | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [cvMock, setCvMock] = useState(false);

  async function runCv() {
    setCvError(null);
    if (!(await gate.ensure())) return;
    setCvStage("checking");
    const res = await runStreamingTool<Extracted>("/api/planning/cv_import", { cvText }, setCvStage);
    setCvStage(null);
    if (!res.ok) {
      if (res.code === "consent_required") gate.revoke();
      setCvError(t(`errors.${res.code}` as never));
      return;
    }
    setCvMock(res.isMock);
    setExtracted(res.result);
    setPicked(new Set([...res.result.courses, ...res.result.activities, ...res.result.honors].map((x) => x.id)));
  }

  function addPicked() {
    if (!extracted) return;
    const courses = extracted.courses.filter((c) => picked.has(c.id)).map((c) => ({ id: newId(), name: c.name, level: c.level, grade: (c.grade as Course["grade"]) ?? null, result: c.result ?? "" }));
    const activities = extracted.activities
      .filter((a) => picked.has(a.id))
      .map((a) => ({ id: newId(), type: a.type, role: a.role, organization: a.organization, description: a.description.slice(0, 150), grades: a.grades, hoursPerWeek: a.hours_per_week, weeksPerYear: a.weeks_per_year }));
    const honors = extracted.honors.filter((h) => picked.has(h.id)).map((h) => ({ id: newId(), title: h.title, level: h.level, grades: h.grades }));
    update({
      courses: [...p.courses, ...courses].slice(0, 40),
      activities: [...p.activities, ...activities].slice(0, 20),
      honors: [...p.honors, ...honors].slice(0, 10),
    });
    notify(t("profile.cv.added", { count: courses.length + activities.length + honors.length }));
    setExtracted(null);
    setCvText("");
  }

  const PickRow = ({ itemId, found, children }: { itemId: string; found: boolean; children: ReactNode }) => (
    <li className="flex items-start gap-3 rounded-lg border border-line p-3">
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 accent-teal"
        aria-label={t("profile.cv.add")}
        checked={picked.has(itemId)}
        onChange={(e) => {
          const next = new Set(picked);
          if (e.target.checked) next.add(itemId);
          else next.delete(itemId);
          setPicked(next);
        }}
      />
      <div className="min-w-0 flex-1 text-sm">{children}</div>
      {!found ? <span className="badge badge-developing">◐ {t("profile.cv.check")}</span> : null}
    </li>
  );

  return (
    <div className="space-y-6">
      <p className="notice notice-info text-sm">{t("profile.privacy")}</p>

      {/* CV import */}
      <Section id={id("cv")} title={t("profile.cv.title")}>
        <p className="text-sm text-ink-soft">{t("profile.cv.intro")}</p>
        {cvStage ? <div className="mt-3"><ProgressStages stage={cvStage} kind="cv_import" /></div> : null}
        {!extracted ? (
          <>
            <label htmlFor={id("cvtext")} className="field-label mt-4">{t("profile.cv.label")}</label>
            <textarea id={id("cvtext")} className="input" rows={6} maxLength={12000} value={cvText} onChange={(e) => setCvText(e.target.value)} aria-describedby={id("cvhelp")} />
            <p id={id("cvhelp")} className="field-help">{t("profile.cv.help")}</p>
            <button type="button" className="btn btn-primary btn-sm mt-3" disabled={!ai.configured || !cvText.trim() || cvStage !== null} onClick={runCv}>
              {t("profile.cv.run")}
            </button>
            {!ai.configured ? <p className="mt-2 text-sm text-ink-soft">{t("editor.aiDisabled")}</p> : null}
          </>
        ) : (
          <div className="mt-4">
            {cvMock ? <p className="notice notice-warn mb-3 text-sm">{t("feedback.mockBanner")}</p> : null}
            <h3 className="font-semibold">{t("profile.cv.reviewTitle")}</h3>
            <p className="mt-1 text-sm text-ink-soft">{t("profile.cv.reviewIntro")}</p>
            {extracted.courses.length + extracted.activities.length + extracted.honors.length === 0 ? (
              <p className="mt-3 text-sm">{t("profile.cv.none")}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {extracted.courses.map((c) => (
                  <PickRow key={c.id} itemId={c.id} found={c.foundInCv}>
                    <strong>{t("profile.sections.courses")}:</strong> {c.name} · {t(`profile.levels.${c.level}` as never)}
                  </PickRow>
                ))}
                {extracted.activities.map((a) => (
                  <PickRow key={a.id} itemId={a.id} found={a.foundInCv}>
                    <strong>{t(`profile.activityTypes.${a.type}` as never)}:</strong> {a.role}
                    {a.organization ? `, ${a.organization}` : ""}
                    <span className="block text-ink-soft">{a.description}</span>
                  </PickRow>
                ))}
                {extracted.honors.map((h) => (
                  <PickRow key={h.id} itemId={h.id} found={h.foundInCv}>
                    <strong>{t("profile.sections.honors")}:</strong> {h.title} · {t(`profile.honorLevels.${h.level}` as never)}
                  </PickRow>
                ))}
              </ul>
            )}
            {extracted.skipped_notes.length ? (
              <p className="mt-3 text-xs text-ink-soft">
                {t("profile.cv.skipped")}: {extracted.skipped_notes.join(" · ")}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="btn btn-primary btn-sm" disabled={picked.size === 0} onClick={addPicked}>{t("profile.cv.add")}</button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setExtracted(null)}>{t("common.cancel")}</button>
            </div>
          </div>
        )}
        {cvError ? <p className="notice notice-error mt-3 text-sm" role="alert">{cvError}</p> : null}
      </Section>

      {/* Basics */}
      <Section id={id("basics")} title={t("profile.sections.basics")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={id("gy")} className="field-label">{t("profile.fields.graduationYear")}</label>
            <input id={id("gy")} className="input" inputMode="numeric" value={p.graduationYear ?? ""} onChange={(e) => update({ graduationYear: numOrNull(e.target.value) })} />
          </div>
          <div>
            <label htmlFor={id("cur")} className="field-label">{t("profile.fields.curriculum")}</label>
            <select id={id("cur")} className="input" value={p.curriculum} onChange={(e) => update({ curriculum: e.target.value as StudentProfile["curriculum"] })}>
              {CURRICULA.map((c) => <option key={c} value={c}>{t(`profile.curricula.${c}` as never)}</option>)}
            </select>
          </div>
        </div>
      </Section>

      {/* Courses */}
      <Section id={id("courses")} title={t("profile.sections.courses")}>
        {p.courses.length === 0 ? <p className="text-sm text-ink-soft">{t("profile.emptyCourses")}</p> : null}
        <ul className="space-y-3">
          {p.courses.map((c, i) => (
            <li key={c.id} className="grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] sm:items-end">
              <div>
                <label htmlFor={id(`cn${i}`)} className="field-label text-sm">{t("profile.fields.courseName")}</label>
                <input id={id(`cn${i}`)} className="input" maxLength={80} value={c.name} onChange={(e) => setCourse(i, { name: e.target.value })} />
              </div>
              <div>
                <label htmlFor={id(`cl${i}`)} className="field-label text-sm">{t("profile.fields.courseLevel")}</label>
                <select id={id(`cl${i}`)} className="input" value={c.level} onChange={(e) => setCourse(i, { level: e.target.value as Course["level"] })}>
                  {COURSE_LEVELS.map((l) => <option key={l} value={l}>{t(`profile.levels.${l}` as never)}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor={id(`cg${i}`)} className="field-label text-sm">{t("profile.fields.courseGrade")}</label>
                <select id={id(`cg${i}`)} className="input" value={c.grade ?? ""} onChange={(e) => setCourse(i, { grade: e.target.value ? (Number(e.target.value) as Course["grade"]) : null })}>
                  <option value="">—</option>
                  {GRADE_LEVELS.map((g) => <option key={g} value={g}>{t("profile.gradeLabel", { n: g })}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor={id(`cr${i}`)} className="field-label text-sm">{t("profile.fields.courseResult")}</label>
                <input id={id(`cr${i}`)} className="input" maxLength={20} value={c.result ?? ""} onChange={(e) => setCourse(i, { result: e.target.value })} />
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => update({ courses: p.courses.filter((_, j) => j !== i) })} aria-label={`${t("profile.remove")}: ${c.name || t("profile.fields.courseName")}`}>
                {t("profile.remove")}
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className="btn btn-secondary btn-sm mt-3" disabled={p.courses.length >= 40} onClick={() => update({ courses: [...p.courses, { id: newId(), name: "", level: "standard", grade: null, result: "" }] })}>
          + {t("profile.addCourse")}
        </button>
      </Section>

      {/* Activities */}
      <Section id={id("activities")} title={t("profile.sections.activities")}>
        {p.activities.length === 0 ? <p className="text-sm text-ink-soft">{t("profile.emptyActivities")}</p> : null}
        <ol className="space-y-4">
          {p.activities.map((a, i) => (
            <li key={a.id} className="rounded-lg border border-line p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-serif text-lg text-teal" aria-hidden="true">{i + 1}</span>
                <div className="flex gap-1">
                  <button type="button" className="btn btn-ghost btn-sm" disabled={i === 0} onClick={() => update({ activities: move(p.activities, i, -1) })} aria-label={`${t("profile.moveUp")}: ${a.role || i + 1}`}>↑</button>
                  <button type="button" className="btn btn-ghost btn-sm" disabled={i === p.activities.length - 1} onClick={() => update({ activities: move(p.activities, i, 1) })} aria-label={`${t("profile.moveDown")}: ${a.role || i + 1}`}>↓</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => update({ activities: p.activities.filter((_, j) => j !== i) })} aria-label={`${t("profile.remove")}: ${a.role || i + 1}`}>{t("profile.remove")}</button>
                </div>
              </div>
              <div className="mt-2 grid gap-3 sm:grid-cols-3">
                <div>
                  <label htmlFor={id(`at${i}`)} className="field-label text-sm">{t("profile.fields.activityType")}</label>
                  <select id={id(`at${i}`)} className="input" value={a.type} onChange={(e) => setActivity(i, { type: e.target.value as Activity["type"] })}>
                    {ACTIVITY_TYPES.map((x) => <option key={x} value={x}>{t(`profile.activityTypes.${x}` as never)}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor={id(`ar${i}`)} className="field-label text-sm">{t("profile.fields.activityRole")}</label>
                  <input id={id(`ar${i}`)} className="input" maxLength={50} value={a.role} onChange={(e) => setActivity(i, { role: e.target.value })} />
                </div>
                <div>
                  <label htmlFor={id(`ao${i}`)} className="field-label text-sm">{t("profile.fields.activityOrg")}</label>
                  <input id={id(`ao${i}`)} className="input" maxLength={100} value={a.organization} onChange={(e) => setActivity(i, { organization: e.target.value })} />
                </div>
              </div>
              <div className="mt-3">
                <label htmlFor={id(`ad${i}`)} className="field-label text-sm">{t("profile.fields.activityDesc")}</label>
                <textarea id={id(`ad${i}`)} className="input" rows={2} maxLength={150} value={a.description} onChange={(e) => setActivity(i, { description: e.target.value })} aria-describedby={id(`adh${i}`)} />
                <p id={id(`adh${i}`)} className="field-help">
                  {t("profile.fields.activityDescHelp")} {t("profile.chars", { count: a.description.length, max: 150 })}
                </p>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
                <GradeChecks legend={t("profile.fields.activityGrades")} value={a.grades} onChange={(grades) => setActivity(i, { grades })} />
                <div>
                  <label htmlFor={id(`ah${i}`)} className="field-label text-sm">{t("profile.fields.hoursPerWeek")}</label>
                  <input id={id(`ah${i}`)} className="input" inputMode="numeric" value={a.hoursPerWeek ?? ""} onChange={(e) => setActivity(i, { hoursPerWeek: numOrNull(e.target.value) })} />
                </div>
                <div>
                  <label htmlFor={id(`aw${i}`)} className="field-label text-sm">{t("profile.fields.weeksPerYear")}</label>
                  <input id={id(`aw${i}`)} className="input" inputMode="numeric" value={a.weeksPerYear ?? ""} onChange={(e) => setActivity(i, { weeksPerYear: numOrNull(e.target.value) })} />
                </div>
              </div>
            </li>
          ))}
        </ol>
        <button
          type="button"
          className="btn btn-secondary btn-sm mt-3"
          disabled={p.activities.length >= 20}
          onClick={() => update({ activities: [...p.activities, { id: newId(), type: "other", role: "", organization: "", description: "", grades: [], hoursPerWeek: null, weeksPerYear: null }] })}
        >
          + {t("profile.addActivity")}
        </button>
      </Section>

      {/* Honors */}
      <Section id={id("honors")} title={t("profile.sections.honors")}>
        {p.honors.length === 0 ? <p className="text-sm text-ink-soft">{t("profile.emptyHonors")}</p> : null}
        <ul className="space-y-3">
          {p.honors.map((h, i) => (
            <li key={h.id} className="grid gap-3 rounded-lg border border-line p-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
              <div>
                <label htmlFor={id(`ht${i}`)} className="field-label text-sm">{t("profile.fields.honorTitle")}</label>
                <input id={id(`ht${i}`)} className="input" maxLength={100} value={h.title} onChange={(e) => setHonor(i, { title: e.target.value })} />
              </div>
              <div>
                <label htmlFor={id(`hl${i}`)} className="field-label text-sm">{t("profile.fields.honorLevel")}</label>
                <select id={id(`hl${i}`)} className="input" value={h.level} onChange={(e) => setHonor(i, { level: e.target.value as Honor["level"] })}>
                  {HONOR_LEVELS.map((l) => <option key={l} value={l}>{t(`profile.honorLevels.${l}` as never)}</option>)}
                </select>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => update({ honors: p.honors.filter((_, j) => j !== i) })} aria-label={`${t("profile.remove")}: ${h.title || i + 1}`}>{t("profile.remove")}</button>
              <div className="sm:col-span-3">
                <GradeChecks legend={t("profile.fields.activityGrades")} value={h.grades} onChange={(grades) => setHonor(i, { grades })} />
              </div>
            </li>
          ))}
        </ul>
        <button type="button" className="btn btn-secondary btn-sm mt-3" disabled={p.honors.length >= 10} onClick={() => update({ honors: [...p.honors, { id: newId(), title: "", level: "school", grades: [] }] })}>
          + {t("profile.addHonor")}
        </button>
      </Section>

      {/* Interests */}
      <Section id={id("interests")} title={t("profile.sections.interests")}>
        <label htmlFor={id("int")} className="field-label">{t("profile.fields.interests")}</label>
        <textarea id={id("int")} className="input" rows={4} maxLength={1500} value={p.interests} onChange={(e) => update({ interests: e.target.value })} aria-describedby={id("inth")} />
        <p id={id("inth")} className="field-help">{t("profile.fields.interestsHelp")}</p>
        <label htmlFor={id("val")} className="field-label mt-4">{t("profile.fields.values")}</label>
        <textarea id={id("val")} className="input" rows={3} maxLength={1000} value={p.values} onChange={(e) => update({ values: e.target.value })} aria-describedby={id("valh")} />
        <p id={id("valh")} className="field-help">{t("profile.fields.valuesHelp")}</p>
      </Section>

      {/* Tests */}
      <Section id={id("tests")} title={t("profile.sections.tests")}>
        <p className="text-sm text-ink-soft">{t("profile.fields.testsHelp")}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {(
            [
              ["satTotal", "profile.fields.satTotal"],
              ["satEbrw", "profile.fields.satEbrw"],
              ["satMath", "profile.fields.satMath"],
              ["actComposite", "profile.fields.act"],
              ["toefl", "profile.fields.toefl"],
              ["ielts", "profile.fields.ielts"],
              ["duolingo", "profile.fields.duolingo"],
              ["gpa", "profile.fields.gpa"],
              ["gpaScale", "profile.fields.gpaScale"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label htmlFor={id(key)} className="field-label text-sm">{t(label)}</label>
              <input id={id(key)} className="input" inputMode="decimal" value={p.tests[key] ?? ""} onChange={(e) => update({ tests: { ...p.tests, [key]: numOrNull(e.target.value) } })} />
            </div>
          ))}
        </div>
      </Section>

      {/* Preferences */}
      <Section id={id("prefs")} title={t("profile.sections.preferences")}>
        <div className="grid gap-6 sm:grid-cols-2">
          <fieldset>
            <legend className="field-label">{t("profile.fields.sizes")}</legend>
            {SIZE_PREFS.map((s) => (
              <label key={s} className="flex min-h-10 items-center gap-3">
                <input type="checkbox" className="h-4 w-4 accent-teal" checked={p.preferences.sizes.includes(s)} onChange={(e) => update({ preferences: { ...p.preferences, sizes: e.target.checked ? [...p.preferences.sizes, s] : p.preferences.sizes.filter((x) => x !== s) } })} />
                <span className="text-sm">{t(`profile.sizes.${s}` as never)}</span>
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend className="field-label">{t("profile.fields.regions")}</legend>
            {REGIONS.map((r) => (
              <label key={r} className="flex min-h-10 items-center gap-3">
                <input type="checkbox" className="h-4 w-4 accent-teal" checked={p.preferences.regions.includes(r)} onChange={(e) => update({ preferences: { ...p.preferences, regions: e.target.checked ? [...p.preferences.regions, r] : p.preferences.regions.filter((x) => x !== r) } })} />
                <span className="text-sm">{t(`profile.regions.${r}` as never)}</span>
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend className="field-label">{t("profile.fields.testPlan")}</legend>
            {TEST_PLANS.map((x) => (
              <label key={x} className="flex min-h-10 items-center gap-3">
                <input type="radio" name={id("testplan")} className="h-4 w-4 accent-teal" checked={p.preferences.testPlan === x} onChange={() => update({ preferences: { ...p.preferences, testPlan: x } })} />
                <span className="text-sm">{t(`profile.testPlans.${x}` as never)}</span>
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend className="field-label">{t("profile.fields.needAid")}</legend>
            {AID_NEEDS.map((x) => (
              <label key={x} className="flex min-h-10 items-center gap-3">
                <input type="radio" name={id("aid")} className="h-4 w-4 accent-teal" checked={p.preferences.needAid === x} onChange={() => update({ preferences: { ...p.preferences, needAid: x } })} />
                <span className="text-sm">{t(`profile.aidNeeds.${x}` as never)}</span>
              </label>
            ))}
          </fieldset>
        </div>
      </Section>

      <div className="sticky bottom-0 z-10 rounded-xl border border-line bg-paper/95 p-3 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-soft" role="status">{dirty ? t("profile.unsaved") : ""}</p>
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>{saving ? t("common.saving") : t("profile.save")}</button>
        </div>
        {error ? <p className="field-error" role="alert">{error}</p> : null}
      </div>
      {gate.dialog}
    </div>
  );
}
