"use client";
import Link from "next/link";
import type { HubData } from "@/lib/application-hub";
import { buildTodayPlan } from "@/lib/today-plan";
import type { PlanTask } from "@/lib/application-schedule";

export function TodayPlan({ data, zh, taskName }: { data: HubData; zh: boolean; taskName: (t: PlanTask) => string }) {
  const plan = buildTodayPlan(data);
  const say = (en: string, cn: string) => zh ? cn : en;
  return <section className="card border-t-4 border-t-teal p-5" aria-labelledby="today-plan-title">
    <p className="text-sm font-semibold text-teal">{plan.date} · {plan.timeZone}</p>
    <h2 id="today-plan-title" className="mt-1 text-2xl font-semibold">{say("Your focus for today", "今天先做这几件事")}</h2>
    <p className="mt-2 text-sm text-ink-soft">{say(`Up to 3 steps within ${plan.availableMinutes} estimated work minutes already allocated today. Finish earlier writing stages before starting later ones.`, `根据今天已安排的 ${plan.availableMinutes} 分钟预计工作时间，选出最多3步；先完成前面的写作阶段。`)}</p>
    {plan.actions.length ? <ol className="mt-4 grid gap-4 md:grid-cols-3">{plan.actions.map(({ task, minutes, partial, schools }, i) => <li className="rounded-xl border border-line p-4" key={task.id}>
      <p className="text-sm font-semibold text-teal">{i + 1} · {minutes} {say("min", "分钟")}{partial ? say(" · first session", " · 先做一部分") : ""}</p>
      <h3 className="mt-2 font-semibold">{taskName(task)}</h3><p className="mt-1 break-words text-sm">{schools.join(" · ")}</p>
      {schools.length > 1 && <p className="mt-2 text-sm font-semibold text-teal">{say(`One shared task for ${schools.length} schools`, `一项通用任务，覆盖 ${schools.length} 所学校`)}</p>}
      <details className="mt-3 text-sm"><summary className="cursor-pointer font-semibold">{say("Why this step?", "为什么先做这个？")}</summary><p className="mt-2">{say("Suggested work target", "建议工作目标")}: {task.targetDate}. {say("Time is an estimate, not a deadline or completion guarantee.", "时长为估计，不是截止日期或完成保证。")}</p><p className="mt-2">{say("Date basis", "日期依据")}: {task.source === "planning_horizon" ? say("Your planning horizon; application date unconfirmed", "个人规划范围；申请日期未确认") : task.source === "official_catalog" ? say("Sourced catalogue date; verify your route", "有来源的目录日期；仍须核对申请路径") : say("Your entered deadline; verify the source", "个人填写的截止日期；请核实来源")}</p><p className="mt-2">{say("Earlier writing stages", "之前的写作阶段")}: {say("none outstanding in this plan", "当前计划无未完成的前置写作阶段")}</p>{task.deadline?.source && <p className="mt-2 break-words">{say("Recorded source", "所记来源")}: {task.deadline.source}</p>}</details>
      <Link className="btn btn-secondary btn-sm mt-4" href={task.href}>{say("Start this step →", "开始这一步 →")}</Link>
    </li>)}</ol> : <p className="notice mt-4">{say("No ready work fits today’s saved time slots. Review your availability and unfinished tasks in the daily plan. No extra work time has been assumed.", "今天保存的时段内没有可安排的就绪任务。请在日常计划中检查可用时间与待办任务；系统未假定额外时间。")}</p>}
    {plan.blocked.length > 0 && <details className="mt-4 text-sm"><summary className="cursor-pointer font-semibold">{say(`${plan.blocked.length} steps waiting for earlier work`, `${plan.blocked.length} 步等待前置任务`)}</summary><ul className="mt-2 space-y-2">{plan.blocked.slice(0, 8).map(({ task, dependencies }) => <li key={task.id}>{task.school} · {taskName(task)} — {say("first finish", "先完成")}: {dependencies.map(taskName).join("; ")}</li>)}</ul></details>}
  </section>;
}
