import {describe,it,expect} from "vitest";
import {db} from "@/db";
import {school,applicationSchedule} from "@/db/schema";
import {eq} from "drizzle-orm";
import {PATCH as schedulePatch} from "@/app/api/schedule/route";
import {GET,PUT} from "@/app/api/resources/route";
import {PUT as schedulePut} from "@/app/api/schedule/route";
import {POST as addList} from "@/app/api/list/route";
import {getScheduleState, getApplicationSchedule} from "@/server/services/application-schedule";
import {parseEcbRates} from "@/server/services/student-resources";
import {defaultResources,newCostRecord,CURRENCIES} from "@/lib/student-resources";
import {schedulePreferencesSchema} from "@/lib/application-schedule";
import {exportUserData,deleteAccount} from "@/server/services/account";
import {req,json,signIn} from "../helpers/http";
async function setup(email:string){const a=await signIn(email);const [s]=await db.insert(school).values({slug:crypto.randomUUID(),name:"Resource test college",country:"UK",website:"https://example.edu"}).returning();const res=await addList(req("POST","/api/list",{cookie:a.cookie,body:{schoolId:s.id}}),undefined as never);const body=await json(res);return {...a,entryId:body.entry.id,slug:s.slug};}
describe("owned resource plans",()=>{
 it("requires authentication and preserves encrypted financial state through timetable updates/export/deletion",async()=>{
  expect((await GET(req("GET","/api/resources"),undefined as never)).status).toBe(401);
  const a=await setup("budget-owner@example.test"),b=await setup("budget-other@example.test");const p=defaultResources();p.applicationBudget=2000;p.annualBudget=80000;p.costs=[newCostRecord(a.entryId,"UK")];
  expect((await PUT(req("PUT","/api/resources",{cookie:a.cookie,body:p}),undefined as never)).status).toBe(200);
  const row=db.select().from(applicationSchedule).where(eq(applicationSchedule.userId,a.userId)).get()!;expect(row.encryptedData).not.toContain("80000");expect(getScheduleState(b.userId).resources.annualBudget).toBeNull();
  await schedulePut(req("PUT","/api/schedule",{cookie:a.cookie,body:schedulePreferencesSchema.parse({weeklyHours:10})}),undefined as never);expect(getScheduleState(a.userId).resources.annualBudget).toBe(80000);expect(getScheduleState(a.userId).preferences.weeklyHours).toBe(10);
  expect((await exportUserData(a.userId)).applicationSchedule.resources.costs[0].entryId).toBe(a.entryId);await deleteAccount(a.userId);expect(db.select().from(applicationSchedule).where(eq(applicationSchedule.userId,a.userId)).all()).toHaveLength(0);
 });
 it("rejects foreign entry costs/tasks, duplicate records and non-institutional grade sources",async()=>{
  const a=await setup("budget-a@example.test"),b=await setup("budget-b@example.test");const p=defaultResources();p.costs=[newCostRecord(b.entryId,"UK")];expect((await PUT(req("PUT","/api/resources",{cookie:a.cookie,body:p}),undefined as never)).status).toBe(404);
  p.costs=[newCostRecord(a.entryId,"UK"),newCostRecord(a.entryId,"UK")];expect((await PUT(req("PUT","/api/resources",{cookie:a.cookie,body:p}),undefined as never)).status).toBe(400);
  p.costs=[];p.assessments=[{slug:a.slug,program:"Test",field:"11",entryYear:2027,metric:"ib",low:30,high:30,source:"https://unrelated.example/entry"} as never];expect((await PUT(req("PUT","/api/resources",{cookie:a.cookie,body:p}),undefined as never)).status).toBe(400);
 });
 it("adds explicit work hours and lead days, without adding external waiting to work time",async()=>{
  const a=await setup("budget-time@example.test");const p=defaultResources();p.timeExtras=[{id:"test-task",entryId:a.entryId,label:"Test preparation",minutes:180,leadDays:30,phase:"application",done:false,date:"2027-03-01"}];
  expect((await PUT(req("PUT","/api/resources",{cookie:a.cookie,body:p}),undefined as never)).status).toBe(200);const data=await getApplicationSchedule(a.userId,new Date("2027-01-01T00:00:00Z"));const t=data.plan.tasks.find(t=>t.id==="resource:test-task")!;expect(t.minutes).toBe(180);expect(t.targetDate).toBe("2027-01-27");
  expect((await schedulePatch(req("PATCH","/api/schedule",{cookie:a.cookie,body:{taskId:"resource:test-task",done:true}}),undefined as never)).status).toBe(200);
  let saved=await json(await GET(req("GET","/api/resources",{cookie:a.cookie}),undefined as never));expect(saved.resources.timeExtras[0].done).toBe(true);
  expect((await schedulePatch(req("PATCH","/api/schedule",{cookie:a.cookie,body:{taskId:"resource:test-task",done:false}}),undefined as never)).status).toBe(200);
  saved=await json(await GET(req("GET","/api/resources",{cookie:a.cookie}),undefined as never));expect(saved.resources.timeExtras[0].done).toBe(false);
 });
 it("parses complete ECB unit-per-EUR snapshots and rejects partial responses",()=>{
  const xml=`<Cube time='2026-11-13'>${CURRENCIES.filter(c=>c!=="EUR").map(c=>`<Cube currency='${c}' rate='1.2'/>`).join("")}</Cube>`;expect(parseEcbRates(xml).rates.EUR).toBe(1);expect(parseEcbRates(xml).date).toBe("2026-11-13");expect(()=>parseEcbRates("<html>error</html>")).toThrow();expect(()=>parseEcbRates("<Cube time='2026-11-13'><Cube currency='USD' rate='1'/></Cube>")).toThrow();
 });
});
