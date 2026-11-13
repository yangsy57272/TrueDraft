import {describe,it,expect} from "vitest";
import {db} from "@/db";
import {applicationSchedule,school,schoolSupplements} from "@/db/schema";
import {POST as addList} from "@/app/api/list/route";
import {GET,PUT,PATCH} from "@/app/api/schedule/route";
import {GET as calendar} from "@/app/api/schedule/calendar/route";
import {getScheduleState} from "@/server/services/application-schedule";
import {deleteAccount,exportUserData} from "@/server/services/account";
import {schedulePreferencesSchema} from "@/lib/application-schedule";
import {req,json,signIn} from "../helpers/http";
import {eq} from "drizzle-orm";
describe("private application schedules",()=>{
 it("requires sign-in and saves encrypted preferences without changing another account",async()=>{
  expect((await GET(req("GET","/api/schedule"),undefined as never)).status).toBe(401);
  const a=await signIn("planner@example.test"),b=await signIn("otherplanner@example.test");
  const prefs=schedulePreferencesSchema.parse({weeklyHours:9,timeZone:"Asia/Shanghai"});
  const response=await PUT(req("PUT","/api/schedule",{cookie:a.cookie,body:prefs}),undefined as never);expect(response.status).toBe(200);
  expect(getScheduleState(a.userId).preferences.weeklyHours).toBe(9);expect(getScheduleState(b.userId).preferences.weeklyHours).toBe(6);
  const [row]=await db.select().from(applicationSchedule).where(eq(applicationSchedule.userId,a.userId));expect(row.encryptedData).not.toContain("Asia/Shanghai");
  expect((await exportUserData(a.userId)).applicationSchedule.preferences.weeklyHours).toBe(9);
  await deleteAccount(a.userId);expect(await db.select().from(applicationSchedule).where(eq(applicationSchedule.userId,a.userId))).toHaveLength(0);
 });
 it("plans actual chosen supplements, persists task completion and rejects foreign task IDs",async()=>{
  const a=await signIn("planowner@example.test"),b=await signIn("planother@example.test");
  const [s]=await db.insert(school).values({slug:"plan-college",name:"Plan College",website:"https://example.edu"}).returning();
  await db.insert(schoolSupplements).values({schoolId:s.id,cycle:"2026-2027",status:"confirmed",prompts:[{order:1,prompt:"Why our specific courses and community?",requirement:"Required",limit:250,unit:"words",limitText:"250 words",notes:null}]});
  await addList(req("POST","/api/list",{cookie:a.cookie,body:{schoolId:s.id,intendedMajor:"Engineering",platform:"common_app"}}),undefined as never);
  const initial=await json(await GET(req("GET","/api/schedule",{cookie:a.cookie}),undefined as never));
  expect(initial.plan.tasks.some((t:{title:string})=>t.title.includes("Supplement #1"))).toBe(true);const id=initial.plan.tasks[0].id;
  expect((await PATCH(req("PATCH","/api/schedule",{cookie:b.cookie,body:{taskId:id,done:true}}),undefined as never)).status).toBe(404);
  expect((await PATCH(req("PATCH","/api/schedule",{cookie:a.cookie,body:{taskId:id,done:true}}),undefined as never)).status).toBe(200);expect(getScheduleState(a.userId).completed).toContain(id);
  const cal=await calendar(req("GET","/api/schedule/calendar",{cookie:a.cookie}),undefined as never);expect(cal.headers.get("cache-control")).toBe("no-store");expect(await cal.text()).toContain("Plan College");
 });
});
