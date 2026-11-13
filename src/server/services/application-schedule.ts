import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { applicationSchedule, essay, school, schoolSupplements } from "@/db/schema";
import { buildApplicationSchedule, defaultScheduleState, scheduleStateSchema, type ScheduleState, type ScheduleSchool } from "@/lib/application-schedule";
import { SUPPLEMENT_CYCLE } from "@/lib/supplements";
import { encryptJson, decryptJson } from "../crypto";
import { ApiError } from "../errors";
import { listEntries } from "./college-list";

export function getScheduleState(userId:string):ScheduleState {
 const row=getDb().select().from(applicationSchedule).where(eq(applicationSchedule.userId,userId)).get();
 return row?scheduleStateSchema.parse(decryptJson(row.encryptedData,"application_schedule")):defaultScheduleState();
}
export function updateScheduleState(userId:string,change:(state:ScheduleState)=>ScheduleState) {
 return getDb().transaction(tx=>{
  const row=tx.select().from(applicationSchedule).where(eq(applicationSchedule.userId,userId)).get();
  const old=row?scheduleStateSchema.parse(decryptJson(row.encryptedData,"application_schedule")):defaultScheduleState();
  const state=scheduleStateSchema.parse(change(old));const encryptedData=encryptJson(state,"application_schedule");
  tx.insert(applicationSchedule).values({userId,encryptedData}).onConflictDoUpdate({target:applicationSchedule.userId,set:{encryptedData,updatedAt:new Date()}}).run();return state;
 });
}
export async function getApplicationSchedule(userId:string,now=new Date()) {
 const entries=await listEntries(userId);const ids=entries.flatMap(e=>e.schoolId?[e.schoolId]:[]);const db=getDb();
 const institutions=ids.length?db.select({id:school.id,country:school.country}).from(school).where(inArray(school.id,ids)).all():[];
 const supplements=ids.length?db.select().from(schoolSupplements).where(and(inArray(schoolSupplements.schoolId,ids),eq(schoolSupplements.cycle,SUPPLEMENT_CYCLE))).all():[];
 const essays=db.select({id:essay.id,title:essay.title,promptText:essay.promptText,status:essay.status,draftWordCount:essay.draftWordCount,applicationType:essay.applicationType,listEntryId:essay.listEntryId}).from(essay).where(eq(essay.userId,userId)).all();
 const schools:ScheduleSchool[]=entries.map(e=>{const supp=supplements.find(s=>s.schoolId===e.schoolId);return {id:e.id,name:e.schoolName,slug:e.schoolSlug,major:e.intendedMajor,country:institutions.find(s=>s.id===e.schoolId)?.country??"",platform:e.platform??"other",round:e.round,entryYear:e.entryYear,deadlineTrack:e.deadlineTrack,admissionDeadlines:e.admissionDeadlines,status:e.status,deadlines:e.deadlines,checklist:e.checklist,supplementStatus:supp?.status??null,prompts:supp?.status==="confirmed"?supp.prompts:[]};});
 const state=getScheduleState(userId);return {state,schools,plan:buildApplicationSchedule(schools,essays,state,now)};
}
export async function setScheduleTask(userId:string,taskId:string,done:boolean) {
 const current=await getApplicationSchedule(userId);
 if(!current.plan.tasks.some(t=>t.id===taskId))throw new ApiError(404,"not_found");
 updateScheduleState(userId,state=>({...state,completed:done?[...new Set([...state.completed,taskId])]:state.completed.filter(id=>id!==taskId)}));
 return getApplicationSchedule(userId);
}
