import { buildApplicationSchedule, defaultScheduleState, type ScheduleSchool } from "../lib/application-schedule";

export const DEMO_DATE = "2026-11-20T10:00:00Z";
export const DEMO_SCHOOLS = [
  { id: "lakeside", name: "Lakeside College", zh: "湖畔学院", subject: "Computer science + community design", subjectZh: "计算机科学与社区设计", rate: 42, sat: [1280, 1450], fee: 55, color: "#0f766e" },
  { id: "northfield", name: "Northfield University", zh: "北原大学", subject: "Mathematics + urban systems", subjectZh: "数学与城市系统", rate: 12, sat: [1480, 1550], fee: 75, color: "#6846bf" },
  { id: "harbor", name: "Harbor College", zh: "海港学院", subject: "Design + human-computer interaction", subjectZh: "设计与人机交互", rate: null, sat: null, fee: null, color: "#bf5b35" },
] as const;
export const DEMO_DRAFT = "At our neighborhood repair table, I used to reach for the screwdriver before asking a question. Then a visitor brought a lamp that kept flickering. I replaced the bulb. It flickered again.\n\nShe pointed to a loose switch I had barely noticed. We traced the wire together. I drew a tiny diagram on the back of a receipt, and she corrected the path.\n\nThis experience taught me the importance of teamwork and perseverance. I want to study computer science because I enjoy solving problems.";
export const DEMO_REVISION = "The next Saturday, I left the screwdriver on the table and asked the visitor to show me when the flicker started. I began keeping diagrams beside our repair notes, including the guesses we got wrong. I wanted the next person to understand our reasoning, not just inherit a working lamp.";
export const DEMO_QUOTE = "This experience taught me the importance of teamwork and perseverance.";
export function demoHub(selected: string[], completed: string[]) {
  const schools: ScheduleSchool[] = DEMO_SCHOOLS.filter(s => selected.includes(s.id)).map(s => ({
    id: s.id, name: s.name, slug: null, major: s.subject, country: "US", platform: "common_app", round: "rd", status: "in_progress",
    deadlines: [{ id: `date-${s.id}`, type: "application", date: "2026-12-20", time: "23:59", timeZone: "America/New_York", source: "Fictional demo deadline — not an institutional requirement", done: false }],
    checklist: [{ id: `transcript-${s.id}`, key: "transcript", done: false }], supplementStatus: "none", prompts: [],
  }));
  const state = defaultScheduleState();
  state.preferences = { ...state.preferences, days: [1, 2, 3, 4, 5], weeklyHours: 6, timeZone: "UTC", startTime: "18:00" };
  state.completed = completed;
  return { schools, plan: buildApplicationSchedule(schools, [], state, new Date(DEMO_DATE)) };
}
