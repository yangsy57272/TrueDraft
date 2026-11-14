import "server-only";
import {institutionalRoot,officialUrl} from "@/server/research/official-fetch";
import {getScheduleState,updateScheduleState,getApplicationSchedule} from "./application-schedule";
import {allSchoolEntries} from "./schools";
import {getProfile} from "./profile";
import {buildBudget,type BudgetSchool} from "@/lib/application-budget";
import {newCostRecord,emptyCost,resourcesSchema,CURRENCIES,validResourceDay,type CostLine,type StudentResources,type CostKey} from "@/lib/student-resources";
import {ApiError} from "../errors";
const cmu="https://www.cmu.edu/sfs/tuition/undergraduate/index.html";
const scu="https://www.scu.edu/media/offices/bursar/2026-27-Tuition-%26-Student-Fees-Schedule-UG-and-Graduate-Programs--Apr-2026.pdf";
const references:Record<string,{currency:string;cycle:string;source:string;values:Partial<Record<CostKey,number>>;note:string}>={
 "carnegie-mellon-university":{currency:"USD",cycle:"2026-2027",source:cmu,values:{tuition:69702,fees:1114,housing:11700,food:7950,books:1000,personal:1300,insurance:3093,setup:748},note:"Fall 2026 resident first-year reference, not a Fall 2027 quote. Annual fees exclude the one-time $748 first-year fee shown under setup. Housing/food are academic-year estimates; add vacations, travel and any insurance waiver conditions."},
 "santa-clara-university":{currency:"USD",cycle:"2026-2027",source:scu,values:{tuition:64956,application:75},note:"2026–27 published tuition/fee reference. Verify the student's future entry year, residency, housing, health insurance and programme extras; missing items remain unknown."},
 "nus":{currency:"SGD",cycle:"current-publication",source:"https://www.nus.edu.sg/oam/financial-aid/living-costs",values:{food:2600,personal:2200,transport:800,books:400},note:"Published academic-year living estimate excludes vacations and accommodation; the website does not establish a twelve-month budget or future tuition. Verify tuition-grant eligibility and any work obligation separately."},
};
function quote(amount:number,source:string,cycle:string,note:string):CostLine{return {...emptyCost(),amount:{low:amount,high:amount},status:"estimate",source,cycle,note};}
export async function getStudentResources(userId:string){
 const [schedule,all,profile]=await Promise.all([getApplicationSchedule(userId),allSchoolEntries(),getProfile(userId)]);
 const prefs=structuredClone(schedule.state.resources);prefs.timeExtras=prefs.timeExtras.map(t=>({...t,done:schedule.state.completed.includes(`resource:${t.id}`)}));const schools:BudgetSchool[]=schedule.schools.map(s=>({...s,major:s.major}));
 const saved=new Map(prefs.costs.map(c=>[c.entryId,c]));
 prefs.costs=schools.map(s=>{const existing=saved.get(s.id);if(existing)return existing;
  const record=newCostRecord(s.id,s.country);record.feeStatus=prefs.applicantStatusBySystem[s.country as keyof typeof prefs.applicantStatusBySystem]??prefs.feeStatus;
  if(s.platform==="ucas")record.route="ucas";else if(s.country==="US")record.route="direct";
  const ref=s.slug?references[s.slug]:null;
  if(ref&&record.currency===ref.currency){for(const [key,value]of Object.entries(ref.values))record.lines[key as CostKey]=quote(value,ref.source,ref.cycle,ref.note);}
  const institution=all.find(a=>a.school.slug===s.slug);
  if(!record.lines.tuition&&s.country==="US"&&institution?.facts.tuition){record.lines.tuition=quote(institution.facts.tuition.value,institution.latest?.sourceUrl??"https://collegescorecard.ed.gov/",institution.latest?.academicYear??institution.federal?.fileDate??"historical","Historical CDS/out-of-state federal reference, not a confirmed international current-year invoice. Verify fees and residency.");}
  if(s.slug==="carnegie-mellon-university")record.lines.application=quote(75,"https://www.cmu.edu/admission/admission/undergraduate-admission-requirements","current-publication","Current undergraduate application fee; waiver approval/entry-cycle applicability must be confirmed.");
  if(s.slug==="hku")record.lines.application=quote(780,"https://www.admissions.hku.hk/node/172","2027","2027 non-JUPAS/international application publication; confirm your exact route.");
  if(s.slug==="nus"&&record.feeStatus==="international"&&!/music|音乐/i.test(s.major??""))record.lines.application=quote(20,"https://www.nus.edu.sg/oam/admissions/application-overview","current-publication","International student with international qualification, except Music. Confirm the applicable route and any payment charges.");
  return record;
 });
 const institutions=schools.map(s=>{const found=all.find(a=>a.school.slug===s.slug);return {id:s.id,website:found?.school.website??null};});
 return {resources:prefs,schools,institutions,schoolOptions:all.filter(a=>a.school.country!=="US"||schools.some(s=>s.slug===a.school.slug)).map(a=>({slug:a.school.slug,name:a.school.name,nameZh:a.school.nameZh,country:a.school.country})),budget:buildBudget(schools,prefs.costs,prefs,schedule.plan),profileCurriculum:profile.curriculum};
}
export async function saveStudentResources(userId:string,input:unknown){
 const parsed=resourcesSchema.safeParse(input);if(!parsed.success)throw new ApiError(400,"validation_failed",{field:parsed.error.issues[0]?.path.join("."),reason:parsed.error.issues[0]?.message});
 const data=parsed.data;const [current,all]=await Promise.all([getApplicationSchedule(userId),allSchoolEntries()]);const owned=new Set(current.schools.map(s=>s.id));const slugs=new Set(all.map(s=>s.school.slug));
 if(data.costs.some(c=>!owned.has(c.entryId))||data.timeExtras.some(t=>t.entryId&&!owned.has(t.entryId)))throw new ApiError(404,"not_found");
 if(data.assessments.some(a=>!slugs.has(a.slug)))throw new ApiError(400,"validation_failed",{field:"assessments.slug"});
 for(const a of data.assessments){if(!a.source)continue;const website=all.find(s=>s.school.slug===a.slug)?.school.website;let valid=false;try{valid=Boolean(website&&officialUrl(a.source,institutionalRoot(website)));}catch{}if(!valid)throw new ApiError(400,"source_not_institutional",{field:"assessments.source"});}
 if(new Set(data.sharedPlatforms.map(g=>g.id)).size!==data.sharedPlatforms.length)throw new ApiError(400,"validation_failed",{reason:"duplicate_platforms"});
 if(new Set(data.costs.map(r=>r.entryId)).size!==data.costs.length||new Set(data.extras.map(r=>r.id)).size!==data.extras.length||new Set(data.timeExtras.map(r=>r.id)).size!==data.timeExtras.length||new Set(data.assessments.map(r=>`${r.slug}:${r.field}:${r.entryYear}`)).size!==data.assessments.length)throw new ApiError(400,"validation_failed",{reason:"duplicate_records"});
 updateScheduleState(userId,state=>({...state,resources:{...data,fx:state.resources.fx},completed:[...state.completed.filter(id=>!id.startsWith("resource:")),...data.timeExtras.filter(t=>t.done).map(t=>`resource:${t.id}`)]}));return getStudentResources(userId);
}
export const FX_SOURCE="https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";
export function parseEcbRates(xml:string){
 const date=xml.match(/time=['"](\d{4}-\d{2}-\d{2})['"]/)?.[1];const rates:Record<string,number>={EUR:1};for(const m of xml.matchAll(/currency=['"]([A-Z]{3})['"]\s+rate=['"]([\d.]+)['"]/g))rates[m[1]]=Number(m[2]);
 if(!date||!validResourceDay(date)||CURRENCIES.some(c=>!Number.isFinite(rates[c])||rates[c]<=0))throw new Error("incomplete_fx");
 return {date,source:FX_SOURCE,rates} as NonNullable<StudentResources["fx"]>;
}
export async function refreshResourceRates(userId:string){
 try{const res=await fetch(FX_SOURCE,{signal:AbortSignal.timeout(12000),cache:"no-store"});if(!res.ok)throw new Error("fx_http");const xml=await res.text();if(xml.length>120000)throw new Error("fx_size");const fx=parseEcbRates(xml);updateScheduleState(userId,state=>({...state,resources:{...state.resources,fx}}));return getStudentResources(userId);}catch{throw new ApiError(502,"exchange_unavailable");}
}
export {getScheduleState};
