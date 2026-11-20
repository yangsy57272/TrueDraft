import { describe, expect, it } from "vitest";
import { demoHub } from "@/content/demo-scenario";
import {
  buildTodayPlan,
  sharedTaskSchools,
  taskDependencies,
} from "@/lib/today-plan";
import { findQuoteEvidence } from "@/lib/feedback-evidence";

describe("ready work inside today's saved time", () => {
  it("keeps writing stages blocked and only unlocks the next stage", () => {
    const hub = demoHub(["lakeside", "northfield"], []);
    const draft = hub.plan.tasks.find(
      (t) => t.id === "global:common_app:draft",
    )!;
    expect(
      taskDependencies(draft, hub.plan.tasks, hub.schools).map((t) => t.kind),
    ).toEqual(["brainstorm"]);
    const revised = demoHub(
      ["lakeside", "northfield"],
      ["global:common_app:ideas"],
    );
    expect(
      taskDependencies(
        revised.plan.tasks.find((t) => t.id === draft.id)!,
        revised.plan.tasks,
        revised.schools,
      ),
    ).toEqual([]);
    const review = revised.plan.tasks.find(
      (t) => t.id === "global:common_app:review",
    )!;
    expect(
      taskDependencies(review, revised.plan.tasks, revised.schools).map(
        (t) => t.kind,
      ),
    ).toEqual(["draft", "revise"]);
  });
  it("blocks each school's submission on the shared statement, even when owned by another school", () => {
    const hub = demoHub(["lakeside", "northfield"], []);
    const submit = hub.plan.tasks.find(
      (t) => t.entryId === "northfield" && t.kind === "submit",
    )!;
    expect(
      taskDependencies(submit, hub.plan.tasks, hub.schools).some(
        (t) => t.id === "global:common_app:review",
      ),
    ).toBe(true);
    const shared = hub.plan.tasks.find(
      (t) => t.id === "global:common_app:ideas",
    )!;
    expect(sharedTaskSchools(shared, hub.schools)).toEqual([
      "Lakeside College",
      "Northfield University",
    ]);
    hub.schools[1].status = "submitted";
    expect(sharedTaskSchools(shared, hub.schools)).toEqual([
      "Lakeside College",
    ]);
  });
  it("never invents time or exceeds today's slots, and identifies partial work", () => {
    const hub = demoHub(["lakeside", "northfield"], []);
    hub.plan.sessions = [];
    expect(buildTodayPlan(hub).actions).toEqual([]);
    hub.plan.sessions = [
      {
        taskId: hub.plan.tasks[0].id,
        date: hub.plan.today,
        start: "18:00",
        end: "18:20",
        minutes: 20,
        part: 1,
        late: false,
      },
    ];
    const plan = buildTodayPlan(hub);
    expect(plan.actions.reduce((n, t) => n + t.minutes, 0)).toBe(20);
    expect(plan.actions[0].partial).toBe(true);
    expect(plan.actions.length).toBeLessThanOrEqual(3);
  });
  it("excludes finished/closed work and preserves missing-date uncertainty", () => {
    const hub = demoHub(["lakeside"], []);
    hub.schools[0].status = "withdrawn";
    expect(buildTodayPlan(hub).actions).toEqual([]);
    hub.schools[0].status = "in_progress";
    hub.plan.tasks.forEach((t) => {
      t.source = "planning_horizon";
      t.deadline = null;
    });
    expect(
      buildTodayPlan(hub).actions.every((a) => a.task.deadline === null),
    ).toBe(true);
  });
});
describe("quote source offsets", () => {
  it("returns original offsets after smart quotes, ellipsis, case and whitespace normalization", () => {
    const text = "One paragraph.\n\nShe said “ask  first”… then listened.";
    const match = findQuoteEvidence(text, 'she said "ask first"... then');
    expect(match).toMatchObject({
      paragraph: 2,
      text: "She said “ask  first”… then",
    });
    expect(text.slice(match!.start, match!.end)).toBe(match!.text);
  });
  it("reports repeated quotes and does not fabricate a missing location", () => {
    expect(
      findQuoteEvidence("我先提问。\n\n我先提问。", "我先提问。")?.occurrences,
    ).toBe(2);
    expect(
      findQuoteEvidence("A quiet repair table.", "I started a global charity."),
    ).toBeNull();
  });
});
