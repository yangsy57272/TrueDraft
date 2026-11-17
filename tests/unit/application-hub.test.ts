import { describe, expect, it } from "vitest";
import { applicationHubSnapshot, applicationStage, buildApplicationHub, deadlineUrgency } from "@/lib/application-hub";
import { buildApplicationSchedule, defaultScheduleState, type ScheduleSchool } from "@/lib/application-schedule";
import type { Deadline } from "@/lib/deadlines";
const now = new Date("2026-11-18T15:00:00Z");
const deadline = (type: Deadline["type"] = "application", extra: Partial<Deadline> = {}): Deadline => ({ id: type, type, date: "2026-11-18", time: null, timeZone: "America/New_York", done: false, source: "Student checked portal", ...extra });
const school = (id = "school-a", extra: Partial<ScheduleSchool> = {}): ScheduleSchool => ({ id, name: id, slug: null, major: "Physics", country: "US", platform: "common_app", round: "rd", entryYear: 2027, status: "in_progress", deadlines: [deadline()], checklist: [{ id: "transcript", key: "transcript", done: false }], supplementStatus: "confirmed_none", prompts: [], ...extra });
const data = (schools: ScheduleSchool[]) => ({ schools, plan: buildApplicationSchedule(schools, [], defaultScheduleState(), now) });
describe("application action centre", () => {
  it("retains post-submit aid and materials without repeating application submission dates", () => {
    const s = school("submitted-school", { status: "submitted", deadlines: [deadline(), deadline("financial_aid"), deadline("test_scores"), deadline("interview", { done: true })] });
    const hub = buildApplicationHub(data([s]), now);
    expect(hub.deadlines.map(d => d.deadline.type)).toEqual(["financial_aid", "test_scores"]);
    expect(hub.schools[0]).toMatchObject({ stage: "follow_up", openItems: 1, completedItems: 0 });
    expect(hub.nextActions.map(t => t.deadline?.type)).toEqual(["financial_aid", "test_scores"]);
  });
  it("distinguishes date-only deadlines from passed precise times in the actual school zone", () => {
    expect(deadlineUrgency(deadline(), now, "Asia/Shanghai")).toBe("today");
    expect(deadlineUrgency(deadline("application", { time: "09:00" }), now, "Asia/Shanghai")).toBe("overdue");
    expect(deadlineUrgency(deadline("application", { date: "2026-11-19", timeZone: "Asia/Tokyo" }), now, "UTC")).toBe("today");
    expect(buildApplicationHub(data([school()]), now).deadlines[0].exact).toBe(false);
  });
  it("includes all systems and custom schools, excluding closed-school reminders", () => {
    const schools = ["US", "UK", "HK", "CA", "AU", "SG", ""].map((country, i) => school(`s${i}`, { country, platform: "other" }));
    schools.push(school("withdrawn", { status: "withdrawn" }), school("denied", { status: "denied" }));
    const hub = buildApplicationHub(data(schools), now);
    expect(hub.schools).toHaveLength(9); expect(hub.deadlines).toHaveLength(7);
    expect(hub.nextActions.some(t => ["withdrawn", "denied"].includes(t.entryId))).toBe(false);
  });
  it("keeps waitlisted, deferred and admitted applications visible for follow-up", () => {
    for (const status of ["submitted", "waitlisted", "deferred", "admitted"]) expect(applicationStage(status)).toBe("follow_up");
    expect(applicationStage("researching")).toBe("preparing");
  });
  it("does not invent a deadline for schools with missing dates", () => {
    const d = data([school("unknown-date", { deadlines: [] })]); const hub = buildApplicationHub(d, now);
    expect(hub.deadlines).toHaveLength(0); expect(hub.nextActions.length).toBeGreaterThan(0);
    expect(hub.nextActions.every(t => t.source === "planning_horizon")).toBe(true);
    expect(d.plan.warnings.some(w => w.kind === "missing_deadline")).toBe(true);
  });
  it("omits completed work, orders next actions and reports unscheduled minutes accurately", () => {
    const schools = [school()]; const state = defaultScheduleState(); state.preferences.weeklyHours = 1;
    let plan = buildApplicationSchedule(schools, [], state, now);
    const done = plan.tasks[0].id; state.completed = [done]; plan = buildApplicationSchedule(schools, [], state, now);
    const hub = buildApplicationHub({ schools, plan }, now);
    expect(hub.nextActions.some(t => t.id === done)).toBe(false);
    expect(hub.nextActions.map(t => t.targetDate)).toEqual(hub.nextActions.map(t => t.targetDate).sort());
    expect(hub.unscheduledMinutes).toBe(plan.remaining.reduce((n, t) => n + t.minutes, 0));
    expect(hub.nextActions.length).toBeLessThanOrEqual(8);
  });
  it("keeps verification and brainstorming ahead of drafting when urgent work targets coincide", () => {
    const d = data([school("urgent", { prompts: [{ order: 1, prompt: "Why physics?", requirement: "Required", limit: 250, unit: "words", limitText: "250 words" }], supplementStatus: "confirmed" })]);
    const tasks = buildApplicationHub(d, now).nextActions;
    const verify = tasks.findIndex(t => t.kind === "verify");
    const ideas = tasks.findIndex(t => t.kind === "brainstorm");
    const draft = tasks.findIndex(t => t.kind === "draft");
    expect(verify).toBeGreaterThanOrEqual(0); expect(ideas).toBeGreaterThan(verify); expect(draft).toBeGreaterThan(ideas);
  });
  it("exports explicit planning data without essay content, notes, account IDs or internal task IDs", () => {
    const d = data([school()]); d.plan.tasks[0].detail = "PRIVATE ESSAY BODY";
    const snapshot = applicationHubSnapshot(d, now); const text = JSON.stringify(snapshot);
    expect(snapshot.schools[0].checklist[0].key).toBe("transcript");
    expect(snapshot.schools[0].deadlines[0].time).toBeNull();
    expect(snapshot.notice).toContain("Not proof of submission");
    expect(text).not.toContain("PRIVATE ESSAY BODY"); expect(text).not.toContain('"entryId"'); expect(text).not.toContain('"taskId"');
  });
});
