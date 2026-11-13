import { deadlineInstant } from "./deadlines";
import type { ApplicationSchedule } from "./application-schedule";
const escape=(s:string)=>s.replace(/\\/g,"\\\\").replace(/\r?\n/g,"\\n").replace(/;/g,"\\;").replace(/,/g,"\\,");
const stamp=(d:Date)=>d.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");
/** UTF-8 octet folding keeps long bilingual titles valid in RFC 5545 files. */
function fold(line:string) {const out:string[]=[];let current="",bytes=0;for(const c of line){const n=new TextEncoder().encode(c).length;if(bytes+n>73){out.push(current);current=" ";bytes=1;}current+=c;bytes+=n;}out.push(current);return out.join("\r\n");}
export function scheduleCalendar(plan:ApplicationSchedule,now=new Date()) {
 const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//TrueDraft//Application plan//EN","CALSCALE:GREGORIAN","METHOD:PUBLISH"];
 for(const s of plan.sessions){const task=plan.tasks.find(t=>t.id===s.taskId);if(!task)continue;
  const instant=(time:string)=>{const d=deadlineInstant({date:s.date,time,timeZone:plan.timeZone},plan.timeZone);d.setUTCSeconds(0,0);return d;};
  lines.push("BEGIN:VEVENT",`UID:${escape(`${s.taskId}-${s.date}-${s.part}`)}@truedraft.local`,`DTSTAMP:${stamp(now)}`,`DTSTART:${stamp(instant(s.start))}`,`DTEND:${stamp(instant(s.end))}`,`SUMMARY:${escape(`${task.school} · ${task.title}`)}`,`DESCRIPTION:${escape(`Suggested work session, not an official deadline. ${task.major?`Programme: ${task.major}. `:""}${task.detail}\n${task.deadline?`Entered deadline: ${task.deadline.date} ${task.deadline.time??"time not entered"} (${task.deadline.timeZone}); verify source: ${task.deadline.source??"not supplied"}.`:"No official deadline entered."}`)}`,"END:VEVENT");
 }
 lines.push("END:VCALENDAR");return lines.map(fold).join("\r\n")+"\r\n";
}
