import { z } from "zod";
import { deadlineInstant, isValidTimeZone, type Deadline } from "./deadlines";

export const schedulePreferencesSchema = z.object({
  weeklyHours: z.number().int().min(1).max(30).default(6),
  days: z.array(z.number().int().min(0).max(6)).min(1).max(7).refine(a=>new Set(a).size===a.length).default([1,3,5,6]),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default("18:00"),
  timeZone: z.string().max(64).refine(v=>v!=="local"&&isValidTimeZone(v)).default("UTC"),
  weeks: z.number().int().min(2).max(26).default(8),
  bufferDays: z.number().int().min(0).max(14).default(3),
  selectedPrompts: z.array(z.string().max(180)).max(2000).default([]),
}).strict();
export type SchedulePreferences=z.infer<typeof schedulePreferencesSchema>;
export const scheduleStateSchema=z.object({ preferences:schedulePreferencesSchema, completed:z.array(z.string().max(220)).max(5000).default([]) });
export type ScheduleState=z.infer<typeof scheduleStateSchema>;
export const defaultScheduleState=():ScheduleState=>({preferences:schedulePreferencesSchema.parse({}),completed:[]});
export type SchedulePrompt={order:number;prompt:string;requirement:string|null;limit:number|null;unit:"words"|"characters"|null;limitText:string|null};
export type ScheduleEssay={id:string;title:string;promptText:string;status:string;draftWordCount:number;applicationType:string;listEntryId:string|null};
export type ScheduleSchool={id:string;name:string;slug:string|null;major:string|null;country:string;platform:string;round:string;status:string;deadlines:Deadline[];checklist:{id:string;key?:string|null;label?:string;done:boolean}[];supplementStatus:string|null;prompts:SchedulePrompt[]};
export type PlanTask={id:string;entryId:string;school:string;major:string|null;kind:string;title:string;detail:string;minutes:number;targetDate:string;deadline:Deadline|null;href:string;done:boolean;automaticDone:boolean;source:"entered_deadline"|"planning_horizon"};
export type PlanSession={taskId:string;date:string;start:string;end:string;minutes:number;part:number;late:boolean};
export type PlanWarning={entryId:string;kind:"missing_deadline"|"past_deadline"|"prompt_selection"|"unknown_prompts"|"capacity"|"horizon"|"clock_change"|"deadline_details"|"statement_selection";detail:string};
const DAY=86400000;
export function dayInZone(now:Date,zone:string) {const p=new Intl.DateTimeFormat("en-CA",{timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now);const v=(t:string)=>p.find(x=>x.type===t)!.value;return `${v("year")}-${v("month")}-${v("day")}`;}
export const shiftDay=(date:string,n:number)=>new Date(Date.parse(date+"T12:00:00Z")+n*DAY).toISOString().slice(0,10);
const normal=(s:string)=>s.replace(/\s+/g," ").trim().toLowerCase();
export function promptKey(entryId:string,p:Pick<SchedulePrompt,"order"|"prompt">) {let h=2166136261;for(const c of p.prompt)h=Math.imul(h^c.charCodeAt(0),16777619);return `${entryId}:prompt:${p.order}:${(h>>>0).toString(36)}`;}
export function requiredPrompt(p:SchedulePrompt) {return /^required[.!]?$/i.test(p.requirement?.trim()??"");}
const applicationTypes=new Set(["application","early_decision","early_decision_2","early_action","restrictive_early_action"]);
const roundTypes:Record<string,string>={ed:"early_decision",ed2:"early_decision_2",ea:"early_action",rea:"restrictive_early_action",rd:"application",rolling:"application"};
function chosenDeadline(s:ScheduleSchool,zone:string) {
 const all=s.deadlines.filter(d=>!d.done&&applicationTypes.has(d.type));const matching=all.filter(d=>d.type===roundTypes[s.round]);
 return (roundTypes[s.round]?(matching.length?matching:all.filter(d=>d.type==="application")):all).sort((a,b)=>deadlineInstant(a,zone).getTime()-deadlineInstant(b,zone).getTime())[0]??null;
}
export function clockChangeDay(date:string,zone:string) {
 const offset=(time:string)=>new Intl.DateTimeFormat("en",{timeZone:zone,timeZoneName:"shortOffset"}).formatToParts(deadlineInstant({date,time,timeZone:zone})).find(p=>p.type==="timeZoneName")?.value;
 return offset("00:00")!==offset("23:59");
}
const clock=(minute:number)=>`${String(Math.floor(minute/60)).padStart(2,"0")}:${String(minute%60).padStart(2,"0")}`;
/** Deterministic planning estimates. No admission dates, requirements or available time are invented. */
export function buildApplicationSchedule(schools:ScheduleSchool[],essays:ScheduleEssay[],state:ScheduleState,now=new Date()) {
 const prefs=state.preferences;const today=dayInZone(now,prefs.timeZone);const end=shiftDay(today,prefs.weeks*7-1);const done=new Set(state.completed);const tasks:PlanTask[]=[];const warnings:PlanWarning[]=[];
 const active=schools.filter(s=>!["submitted","admitted","waitlisted","deferred","denied","withdrawn"].includes(s.status));
 function add(s:ScheduleSchool,id:string,kind:string,title:string,detail:string,minutes:number,deadline:Deadline|null,href:string,autoDone=false) {
  const due=deadline?dayInZone(deadlineInstant(deadline,prefs.timeZone),prefs.timeZone):end;
  const lead:Record<string,number>={verify:28,research:24,brainstorm:18,draft:12,revise:7,review:2,materials:21,deadline:14,submit:0};
  const suggested=shiftDay(due,-(deadline?prefs.bufferDays:0)-(lead[kind]??0));
  const targetDate=due>=today&&suggested<today?today:suggested;
  tasks.push({id,entryId:s.id,school:s.name,major:s.major,kind,title,detail,minutes,targetDate,deadline,href,done:done.has(id)||autoDone,automaticDone:autoDone,source:deadline?"entered_deadline":"planning_horizon"});
 }
 function writing(s:ScheduleSchool,key:string,title:string,prompt:string,limit:number|null,deadline:Deadline|null,href:string,existing:ScheduleEssay|undefined) {
  const base=key.startsWith("global:")?key:`${s.id}:${key}`;const submitted=existing?.status==="submitted";
  const stage=existing?.status??"drafting";const written=Boolean(existing?.draftWordCount);
  const target=existing?`/essays/${existing.id}`:href;
  add(s,base+":ideas","brainstorm",`Find material · ${title}`,prompt.slice(0,650),45,deadline,target,submitted||written||stage!=="drafting");
  add(s,base+":draft","draft",`Draft · ${title}`,`Write your own response. ${limit?`Published word limit: ${limit}.`:"Check the original limit; character limits are not word limits."}`,limit&&limit>300?135:90,deadline,target,submitted||stage==="revising"||stage==="final_review");
  add(s,base+":revise","revise",`Revise · ${title}`,"Check prompt alignment, specific evidence, reflection and paragraph links. Allow time for feedback.",60,deadline,target,submitted||stage==="final_review");
  add(s,base+":review","review",`Final read · ${title}`,"Verify facts and limits, preserve your voice, and preview the response in the actual portal.",30,deadline,target,submitted);
 }
 const contexts=active.map(s=>({s,d:chosenDeadline(s,prefs.timeZone)})).sort((a,b)=>(a.d?deadlineInstant(a.d,prefs.timeZone).getTime():Infinity)-(b.d?deadlineInstant(b.d,prefs.timeZone).getTime():Infinity)||a.s.name.localeCompare(b.s.name));
 const handledEssays=new Set<string>();
 for(const {s,d} of contexts) {
  if(!d)warnings.push({entryId:s.id,kind:"missing_deadline",detail:`${s.name}: no application deadline entered. Work uses the planning horizon, not an official due date.`});
  else if(deadlineInstant(d,prefs.timeZone).getTime()<now.getTime())warnings.push({entryId:s.id,kind:"past_deadline",detail:`${s.name}: the entered deadline has passed. Confirm the round/year and whether submission is still possible.`});
  if(s.deadlines.some(x=>!x.done&&(!x.time||!x.source||x.timeZone==="local")))warnings.push({entryId:s.id,kind:"deadline_details",detail:`${s.name}: at least one entered deadline lacks an exact time/source or uses an unresolved local zone. Confirm the official closing time and source; date calculations use the existing end-of-day fallback when time is absent.`});
  const href=s.slug?`/schools/${s.slug}/research`:`/my-list#${s.id}`;
  add(s,`${s.id}:verify:${d?.id??"undated"}`,"verify","Verify application requirements",`${s.name}${s.major?` · ${s.major}`:""}: confirm route, programme, campus, entry year, time zone and every required response in the official portal. Entered deadlines are not independently verified.`,30,d,`/my-list#${s.id}`);
  if(s.slug)add(s,`${s.id}:research:${s.major??"general"}`,"research","Research the school and programme",`Investigate ${s.major??"your intended field"}: course content, faculty, undergraduate access and communities. Save specific official evidence for Why School.`,60,d,href);
  const prompts=s.prompts.filter(p=>requiredPrompt(p)||prefs.selectedPrompts.includes(promptKey(s.id,p)));
  if(s.prompts.some(p=>!requiredPrompt(p)&&!prefs.selectedPrompts.includes(promptKey(s.id,p))))warnings.push({entryId:s.id,kind:"prompt_selection",detail:`${s.name}: optional, choice or conditional prompts need your selection. The plan cannot determine every programme-specific requirement.`});
  if(!s.supplementStatus||["portal","coming_soon"].includes(s.supplementStatus))warnings.push({entryId:s.id,kind:"unknown_prompts",detail:`${s.name}: the full current supplement requirements are not confirmed. Verify the portal before relying on workload estimates.`});
  const essaysDone=s.checklist.some(c=>c.key==="essays"&&c.done);
  for(const p of prompts) {
   const match=essays.find(e=>e.listEntryId===s.id&&(normal(e.promptText)===normal(p.prompt)||normal(e.promptText).startsWith(normal(p.prompt)+" (")));
   if(match)handledEssays.add(match.id);
   const start=s.slug?`/essays/new?supp=${encodeURIComponent(s.slug)}&n=${p.order}`:`/essays/new?listEntry=${s.id}`;
   const before=tasks.length;writing(s,promptKey(s.id,p),`Supplement #${p.order}`,p.prompt,p.unit==="words"?p.limit:null,d,start,match);
   if(essaysDone)for(const task of tasks.slice(before)){task.done=true;task.automaticDone=true;}
  }
  for(const e of essays.filter(e=>e.listEntryId===s.id&&!handledEssays.has(e.id))) {handledEssays.add(e.id);writing(s,`essay:${e.id}`,e.title,e.promptText,null,d,`/essays/${e.id}`,e);}
  for(const item of s.checklist.filter(c=>!c.done&&c.key!=="essays"))add(s,`${s.id}:check:${item.id}`,"materials",item.label??item.key?.replaceAll("_"," ")??"Application material","Confirm the school-specific instructions and request third-party documents early. This time estimate excludes counsellor/provider turnaround.",30,d,`/my-list#${s.id}`);
  for(const extra of s.deadlines.filter(x=>!x.done&&!applicationTypes.has(x.type)))add(s,`${s.id}:deadline:${extra.id}`,"deadline",extra.label??extra.type.replaceAll("_"," "),`Prepare for this separately entered deadline. Source: ${extra.source??"not supplied; verify in the portal"}.`,60,extra,`/my-list#${s.id}`);
  add(s,`${s.id}:submit:${d?.id??"undated"}`,"submit","Check and submit the application","Review every portal section, confirm required documents, submit yourself and retain the receipt. Marking this task done does not submit anything.",30,d,`/my-list#${s.id}`);
 }
 // A shared statement is planned once per explicitly selected application platform.
 for(const platform of ["common_app","ucas"]) {
  const context=contexts.find(({s})=>s.platform===platform&&(platform!=="common_app"||s.country==="US"));if(!context)continue;
  const matches=essays.filter(e=>!e.listEntryId&&e.applicationType==="personal_statement"&&(platform==="ucas"?/ucas/i.test(e.title+" "+e.promptText):!/ucas/i.test(e.title+" "+e.promptText)));
  const e=matches[0];
  const title=platform==="ucas"?"Shared UCAS subject answers":"Shared Common App personal statement";
  writing(context.s,`global:${platform}`,title,e?.promptText??(platform==="ucas"?"Plan subject motivation, academic preparation and relevant preparation beyond formal study. Confirm the current three-question character limits in UCAS; avoid naming one university.":"Confirm your chosen Common App prompt and whether each college requires the shared personal statement. Use your own experiences and reflection."),platform==="common_app"?650:null,context.d,`/essays/new?type=${platform==="ucas"?"ucas":"personal_statement"}`,e);
  if(matches.length>1)warnings.push({entryId:context.s.id,kind:"statement_selection",detail:`${title}: multiple unlinked statement drafts exist. This estimate uses the first matching draft; confirm the intended version.`});
 }
 const rank:Record<string,number>={verify:0,research:1,brainstorm:2,draft:3,revise:4,review:5,materials:0,deadline:0,submit:6};
 const ordered=tasks.map((t,i)=>({t,i,due:t.deadline?deadlineInstant(t.deadline,prefs.timeZone).getTime():Infinity})).sort((a,b)=>a.t.targetDate.localeCompare(b.t.targetDate)||(a.due-b.due)||(a.t.kind==="submit"?1:0)-(b.t.kind==="submit"?1:0)||(rank[a.t.kind]??0)-(rank[b.t.kind]??0)||a.i-b.i).map(x=>x.t);
 const startMinute=Number(prefs.startTime.slice(0,2))*60+Number(prefs.startTime.slice(3));
 const dailyBudget=Math.floor(prefs.weeklyHours*60/prefs.days.length);const slots:{date:string;minute:number;remaining:number}[]=[];
 for(let date=today;date<=end;date=shiftDay(date,1)) {
  if(!prefs.days.includes(new Date(date+"T12:00:00Z").getUTCDay()))continue;
  if(clockChangeDay(date,prefs.timeZone)){warnings.push({entryId:"",kind:"clock_change",detail:`${date}: local clocks change; this day is excluded from automatic work sessions. Arrange any time-critical work manually.`});continue;}
  const windowEnd=Math.min(1439,startMinute+dailyBudget);
  let minute=startMinute;
  if(date===today) {const p=new Intl.DateTimeFormat("en-GB",{timeZone:prefs.timeZone,hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(now);minute=Math.max(minute,Number(p.slice(0,2))*60+Number(p.slice(3))+15);}
  if(minute<windowEnd)slots.push({date,minute,remaining:windowEnd-minute});
 }
 const sessions:PlanSession[]=[];const remaining:{taskId:string;minutes:number}[]=[];
 for(const task of ordered.filter(t=>!t.done)) {
  let left=task.minutes,part=1;
  for(const slot of slots) {
   while(left>0 && slot.remaining>0 && slot.minute<1439) {
   const count=Math.min(45,left,slot.remaining,1439-slot.minute);
   if(count<1)continue;
   sessions.push({taskId:task.id,date:slot.date,start:clock(slot.minute),end:clock(slot.minute+count),minutes:count,part:part++,late:slot.date>task.targetDate});
   slot.minute+=count+10;slot.remaining=Math.max(0,Math.min(slot.remaining-count-10,1439-slot.minute));left-=count;
   }
  }
  if(left>0)remaining.push({taskId:task.id,minutes:left});
 }
 for(const {s} of contexts) {
  if(sessions.some(x=>x.late&&tasks.find(t=>t.id===x.taskId)?.entryId===s.id))warnings.push({entryId:s.id,kind:"capacity",detail:`${s.name}: some work falls after its suggested completion date. Increase availability, reduce optional work or reconsider deadlines; no earlier slot is available.`});
  if(remaining.some(x=>tasks.find(t=>t.id===x.taskId)?.entryId===s.id))warnings.push({entryId:s.id,kind:"horizon",detail:`${s.name}: some work does not fit inside this planning horizon. It remains explicitly unscheduled.`});
 }
 return {today,end,timeZone:prefs.timeZone,tasks:ordered,sessions,remaining,warnings,totalMinutes:tasks.filter(t=>!t.done).reduce((n,t)=>n+t.minutes,0),scheduledMinutes:sessions.reduce((n,s)=>n+s.minutes,0)};
}
export type ApplicationSchedule=ReturnType<typeof buildApplicationSchedule>;
