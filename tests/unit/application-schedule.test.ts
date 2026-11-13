import {describe,it,expect} from "vitest";
import {buildApplicationSchedule,clockChangeDay,defaultScheduleState,promptKey,type ScheduleSchool,type ScheduleEssay} from "@/lib/application-schedule";
import {scheduleCalendar} from "@/lib/schedule-calendar";
const now=new Date("2026-11-13T08:00:00Z");
const school=(id="a"):ScheduleSchool=>({id,name:`School ${id}`,slug:id,major:"Psychology",country:"US",platform:"common_app",round:"rd",status:"planning",deadlines:[{id:"due",type:"application",date:"2027-01-15",time:"23:59",timeZone:"America/New_York",source:"https://example.edu/apply",done:false}],checklist:[],supplementStatus:"confirmed",prompts:[{order:1,prompt:"Why this programme and its courses?",requirement:"Required",limit:250,unit:"words",limitText:"250 words"},{order:2,prompt:"An optional activity you enjoyed",requirement:"Optional",limit:100,unit:"words",limitText:"100 words"}]});
const essay=(s:ScheduleSchool):ScheduleEssay=>({id:"essay1",title:"Supplement",promptText:s.prompts[0].prompt,status:"final_review",draftWordCount:200,applicationType:"supplemental",listEntryId:s.id});
describe("personalized schedule",()=>{
 it("plans required prompts and one shared statement, leaving options for explicit selection",()=>{
  const s=school();const plan=buildApplicationSchedule([s,school("b")],[],defaultScheduleState(),now);
  expect(plan.tasks.filter(t=>t.id.startsWith("global:")&&t.kind==="draft")).toHaveLength(1);
  expect(plan.tasks.some(t=>t.title.includes("Supplement #2"))).toBe(false);expect(plan.tasks.filter(t=>t.kind==="draft")).toHaveLength(3);
  expect(plan.tasks.find(t=>t.kind==="research")?.detail).toContain("Psychology");
  const state=defaultScheduleState();state.preferences.selectedPrompts=[promptKey(s.id,s.prompts[1])];expect(buildApplicationSchedule([s],[],state,now).tasks.some(t=>t.title.includes("Supplement #2"))).toBe(true);
 });
 it("never exceeds selected workdays or weekly capacity and respects ordered writing stages",()=>{
  const state=defaultScheduleState();state.preferences.timeZone="Asia/Shanghai";state.preferences.days=[1,3];state.preferences.weeklyHours=2;
  const p=buildApplicationSchedule([school()],[],state,now);const dateMinutes=new Map<string,number>();
  for(const s of p.sessions){expect([1,3]).toContain(new Date(s.date+"T12:00:00Z").getUTCDay());expect(s.minutes).toBeLessThanOrEqual(45);dateMinutes.set(s.date,(dateMinutes.get(s.date)??0)+s.minutes);expect(s.start<s.end).toBe(true);}
  expect([...dateMinutes.values()].every(x=>x<=60)).toBe(true);
  for(const date of dateMinutes.keys()){const sessions=p.sessions.filter(s=>s.date===date);expect(sessions.every(s=>s.start>="18:00"&&s.end<="19:00")).toBe(true);}

  const tasks=p.tasks.filter(t=>t.title.includes("Supplement #1"));const starts=tasks.map(t=>p.sessions.find(s=>s.taskId===t.id)).filter(x=>!!x).map(s=>s!.date+s!.start);expect(starts).toEqual([...starts].sort());
 });
 it("uses linked essay status without treating a nonempty draft as finished, and removes submitted schools",()=>{
  const s=school();const e=essay(s);const p=buildApplicationSchedule([s], [e],defaultScheduleState(),now);
  const tasks=p.tasks.filter(t=>t.title.includes("Supplement #1"));expect(tasks.filter(t=>t.done)).toHaveLength(3);expect(tasks.find(t=>t.kind==="review")?.done).toBe(false);
  e.status="drafting";expect(buildApplicationSchedule([s],[e],defaultScheduleState(),now).tasks.find(t=>t.title.includes("Supplement #1")&&t.kind==="draft")?.done).toBe(false);
  s.status="submitted";expect(buildApplicationSchedule([s],[],defaultScheduleState(),now).tasks).toHaveLength(0);
 });
 it("distinguishes missing dates, wrong-round dates and genuine past deadlines",()=>{
  const s=school();s.deadlines[0].type="early_action";
  expect(buildApplicationSchedule([s],[],defaultScheduleState(),now).warnings.some(w=>w.kind==="missing_deadline")).toBe(true);
  s.deadlines[0].type="application";s.deadlines[0].date="2026-10-15";expect(buildApplicationSchedule([s],[],defaultScheduleState(),now).warnings.some(w=>w.kind==="past_deadline")).toBe(true);
  s.deadlines[0].time=null;expect(buildApplicationSchedule([s],[],defaultScheduleState(),now).warnings.some(w=>w.kind==="deadline_details")).toBe(true);
  s.deadlines=[];const p=buildApplicationSchedule([s],[],defaultScheduleState(),now);expect(p.tasks.every(t=>t.source==="planning_horizon"&&t.deadline===null)).toBe(true);
 });
 it("reports work that cannot fit instead of silently dropping it",()=>{
  const state=defaultScheduleState();state.preferences.weeklyHours=1;state.preferences.days=[1];state.preferences.weeks=2;
  const p=buildApplicationSchedule([school(),school("b")],[],state,now);expect(p.remaining.length).toBeGreaterThan(0);
  expect(p.scheduledMinutes+p.remaining.reduce((n,t)=>n+t.minutes,0)).toBe(p.totalMinutes);
 });
 it("invalidates saved task completion when a prompt changes and carries timezone deadlines correctly",()=>{
  const s=school();const state=defaultScheduleState();const first=buildApplicationSchedule([s],[],state,now);const task=first.tasks.find(t=>t.title.includes("Supplement #1")&&t.kind==="draft")!;state.completed=[task.id];
  expect(buildApplicationSchedule([s],[],state,now).tasks.find(t=>t.id===task.id)?.done).toBe(true);s.prompts[0].prompt+=" Updated requirement.";expect(buildApplicationSchedule([s],[],state,now).tasks.some(t=>t.id===task.id)).toBe(false);
  state.preferences.timeZone="Asia/Shanghai";expect(buildApplicationSchedule([s],[],state,now).tasks.find(t=>t.kind==="submit")?.targetDate).toBe("2027-01-13");
 });
 it("avoids DST clock-change days and exports UTC sessions without deadline-style seconds",()=>{
  expect(clockChangeDay("2027-03-14","America/New_York")).toBe(true);expect(clockChangeDay("2027-03-15","America/New_York")).toBe(false);
  const p=buildApplicationSchedule([school()],[],defaultScheduleState(),now);const text=scheduleCalendar(p,now);expect(text).toContain("BEGIN:VCALENDAR\r\n");expect(text).toContain("Suggested work session");expect(text).not.toMatch(/DTSTART:\d+T\d{4}59Z/);expect(text.match(/BEGIN:VEVENT/g)?.length).toBe(p.sessions.length);
 });
});
