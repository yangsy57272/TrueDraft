import { dayInZone, shiftDay, type ApplicationSchedule, type PlanTask, type ScheduleSchool } from "./application-schedule";
import { deadlineInstant, type Deadline } from "./deadlines";

export type HubData = { schools: ScheduleSchool[]; plan: ApplicationSchedule };
export type ApplicationStage = "preparing" | "follow_up" | "closed";
const applicationTypes = new Set(["application", "early_action", "early_decision", "early_decision_2", "restrictive_early_action"]);
export function applicationStage(status: string): ApplicationStage {
  if (["denied", "withdrawn"].includes(status)) return "closed";
  if (["submitted", "admitted", "deferred", "waitlisted"].includes(status)) return "follow_up";
  return "preparing";
}
export type HubDeadline = { entryId: string; school: string; deadline: Deadline; urgency: "overdue" | "today" | "soon" | "later"; exact: boolean };
/** Unknown closing times remain date-level signals, never an invented precise countdown. */
export function deadlineUrgency(d: Deadline, now: Date, viewerZone: string): HubDeadline["urgency"] {
  const today = dayInZone(now, d.timeZone === "local" ? viewerZone : d.timeZone);
  if (d.time && deadlineInstant(d, viewerZone).getTime() < now.getTime()) return "overdue";
  if (d.date < today) return "overdue";
  if (d.date === today) return "today";
  return d.date <= shiftDay(today, 7) ? "soon" : "later";
}
export function buildApplicationHub(data: HubData, now: Date) {
  const schools = data.schools.map(s => ({
    ...s,
    stage: applicationStage(s.status),
    completedItems: s.checklist.filter(c => c.done).length,
    openItems: s.checklist.filter(c => !c.done).length,
    openTasks: data.plan.tasks.filter(t => t.entryId === s.id && !t.done).length,
  }));
  const deadlines: HubDeadline[] = schools.flatMap(s => s.stage === "closed" ? [] : s.deadlines
    .filter(d => !d.done && !(s.stage === "follow_up" && applicationTypes.has(d.type)))
    .map(d => ({ entryId: s.id, school: s.name, deadline: d, urgency: deadlineUrgency(d, now, data.plan.timeZone), exact: Boolean(d.time) })));
  const order = { overdue: 0, today: 1, soon: 2, later: 3 };
  deadlines.sort((a, b) => order[a.urgency] - order[b.urgency] || a.deadline.date.localeCompare(b.deadline.date) || a.school.localeCompare(b.school));
  const tasks = data.plan.tasks.filter(t => !t.done && applicationStage(schools.find(s => s.id === t.entryId)?.status ?? "withdrawn") !== "closed");
  const stages: Record<string, number> = { verify: 0, materials: 1, deadline: 1, research: 2, brainstorm: 3, draft: 4, revise: 5, review: 6, submit: 7 };
  const rank = (t: PlanTask) => stages[t.kind] ?? 2;
  const nextActions = [...tasks].sort((a, b) => a.targetDate.localeCompare(b.targetDate) || rank(a) - rank(b) || a.id.localeCompare(b.id)).slice(0, 8);
  return { schools, deadlines, nextActions, outstandingTasks: tasks.length, unscheduledMinutes: data.plan.remaining.reduce((n, r) => n + r.minutes, 0) };
}
/** Explicit user download: no essay bodies, model feedback, account IDs or private school notes. */
export function applicationHubSnapshot(data: HubData, now: Date) {
  const hub = buildApplicationHub(data, now);
  return {
    format: "truedraft-application-checklist", version: 1, generatedAt: now.toISOString(), timeZone: data.plan.timeZone,
    notice: "Student-maintained planning snapshot. Not proof of submission or institution receipt; not a complete certification of requirements. Verify each portal. Work minutes are estimates. No continuous calendar sync.",
    schools: hub.schools.map(s => ({ name: s.name, country: s.country, programme: s.major, round: s.round, entryYear: s.entryYear ?? null, status: s.status, stage: s.stage, checklist: s.checklist.map(c => ({ key: c.key ?? null, label: c.label ?? null, done: c.done })), deadlines: s.deadlines.map(d => ({ type: d.type, label: d.label ?? null, date: d.date, time: d.time, timeZone: d.timeZone, done: d.done, source: d.source, provenance: d.provenance ?? null })) })),
    nextActions: hub.nextActions.map(t => ({ school: t.school, task: t.title, suggestedDate: t.targetDate, estimatedMinutes: t.minutes, dateBasis: t.source })),
  };
}
