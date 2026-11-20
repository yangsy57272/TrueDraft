import { applicationStage, type HubData } from "./application-hub";
import type { PlanTask } from "./application-schedule";

/** Dependencies are explicit writing stages, never inferred from an AI response. */
export function taskDependencies(task: PlanTask, tasks: PlanTask[], schools: HubData["schools"]) {
  const stages = ["ideas", "draft", "revise", "review"];
  const stage = task.id.split(":").at(-1) ?? "";
  const index = stages.indexOf(stage);
  const base = task.id.slice(0, -(stage.length + 1));
  if (index > 0) return tasks.filter(t => !t.done && stages.slice(0, index).some(s => t.id === `${base}:${s}`));
  if (task.kind !== "submit") return [];
  const platform = schools.find(s => s.id === task.entryId)?.platform;
  return tasks.filter(t => !t.done && t.id !== task.id && (t.entryId === task.entryId || (platform && t.id.startsWith(`global:${platform}:`))));
}
export function sharedTaskSchools(task: PlanTask, schools: HubData["schools"]) {
  const platform = task.id.startsWith("global:") ? task.id.split(":")[1] : null;
  return schools.filter(s => applicationStage(s.status) === "preparing" && (platform ? s.platform === platform && (platform !== "common_app" || s.country === "US") : s.id === task.entryId)).map(s => s.name);
}
/** A small, achievable plan using only time already allocated for today in the saved schedule. */
export function buildTodayPlan(data: HubData) {
  const tasks = data.plan.tasks.filter(t => !t.done && applicationStage(data.schools.find(s => s.id === t.entryId)?.status ?? "withdrawn") !== "closed");
  const availableMinutes = data.plan.sessions.filter(s => s.date === data.plan.today).reduce((n, s) => n + s.minutes, 0);
  const blocked = tasks.map(task => ({ task, dependencies: taskDependencies(task, tasks, data.schools) })).filter(t => t.dependencies.length);
  const blockedIds = new Set(blocked.map(t => t.task.id));
  const rank: Record<string, number> = { verify: 0, materials: 1, deadline: 1, research: 2, brainstorm: 3, draft: 4, revise: 5, review: 6, submit: 7 };
  const ready = tasks.filter(t => !blockedIds.has(t.id)).sort((a, b) => a.targetDate.localeCompare(b.targetDate) || (rank[a.kind] ?? 2) - (rank[b.kind] ?? 2) || a.id.localeCompare(b.id));
  let remaining = availableMinutes;
  const actions: { task: PlanTask; minutes: number; partial: boolean; schools: string[] }[] = [];
  for (const task of ready) {
    if (remaining <= 0 || actions.length === 3) break;
    const minutes = Math.min(task.minutes, remaining, 45);
    actions.push({ task, minutes, partial: minutes < task.minutes, schools: sharedTaskSchools(task, data.schools) });
    remaining -= minutes;
  }
  return { date: data.plan.today, timeZone: data.plan.timeZone, availableMinutes, actions, blocked, readyCount: ready.length };
}
