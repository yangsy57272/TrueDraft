import { z } from "zod";
import { isoDate } from "./planning";
export const VERIFIED_ENTRY_YEAR=2027;
export const ADMISSION_ROUNDS=["ed","ed2","ea","rea","rd","rolling"] as const;
const roundSchema=z.enum(ADMISSION_ROUNDS);
export const admissionSourceSchema=z.object({id:z.string(),url:z.url().startsWith("https://"),checkedAt:z.iso.datetime(),sha256:z.string().regex(/^[a-f0-9]{64}$/),note:z.string(),checks:z.array(z.object({checkedAt:z.iso.datetime(),sha256:z.string().regex(/^[a-f0-9]{64}$/)})).length(2),assertions:z.array(z.object({round:roundSchema,date:isoDate,track:z.string()}))});
export const admissionOptionSchema=z.object({round:roundSchema,label:z.string().optional(),date:isoDate,time:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable(),timeZone:z.string(),timeBasis:z.enum(["institution","applicant_local","unknown"]),sourceIds:z.array(z.string()).min(2),note:z.string()});
export const admissionSchoolSchema=z.object({slug:z.string(),name:z.string(),entryYear:z.number().int(),completeRoundList:z.boolean(),cycleEvidence:z.string(),notes:z.string(),conflicts:z.array(z.object({url:z.url(),note:z.string()})).default([]),sources:z.array(admissionSourceSchema),tracks:z.array(z.object({id:z.string(),label:z.string(),note:z.string(),options:z.array(admissionOptionSchema)})).min(1)}).superRefine((s,ctx)=>{
 for(const track of s.tracks)for(const option of track.options){
  const supporting=s.sources.filter(source=>option.sourceIds.includes(source.id)&&source.assertions.some(a=>a.round===option.round&&a.date===option.date&&a.track===track.id));
  if(new Set(supporting.map(source=>source.url)).size<2)ctx.addIssue({code:"custom",message:"Two distinct fetched official publications must support the exact round/date/track"});
  if(![s.entryYear-1,s.entryYear].includes(Number(option.date.slice(0,4))))ctx.addIssue({code:"custom",message:"Deadline outside entry cycle"});
 }
});
export type AdmissionSchool=z.infer<typeof admissionSchoolSchema>;
export type AdmissionOption=z.infer<typeof admissionOptionSchema>;
export type OfficialDeadlineProvenance={kind:"official_catalog";schoolSlug:string;entryYear:number;round:string;track:string;date:string;checkedAt:string;sources:string[];timeBasis:"institution"|"applicant_local"|"unknown"};
export const deadlineTypeForRound:Record<string,string>={ed:"early_decision",ed2:"early_decision_2",ea:"early_action",rea:"restrictive_early_action",rd:"application",rolling:"application"};
export function verifiedOption(school:AdmissionSchool|null,round:string,entryYear:number,trackId:string|null) {
 if(!school||school.entryYear!==entryYear)return null;
 const track=school.tracks.find(t=>t.id===trackId)??(school.tracks.length===1?school.tracks[0]:null);
 const option=track?.options.find(o=>o.round===round);
 return option&&track?{option,track}:null;
}
