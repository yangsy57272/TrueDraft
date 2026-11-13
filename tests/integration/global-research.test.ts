import {describe,it,expect} from "vitest";
import {db} from "@/db";
import {school,user} from "@/db/schema";
import {importGlobalSchools} from "@/server/services/import-global-schools";
import {searchSchools} from "@/server/services/schools";
import {createPlanningRun,completePlanningRun,getResearchRun} from "@/server/services/profile";
import {eq} from "drizzle-orm";
describe("global directory and private school research",()=>{
 it("imports five additional systems idempotently and filters Hong Kong without requiring U.S. data",async()=>{
  await db.insert(school).values({slug:"university-of-st-andrews",name:"University of St Andrews",country:"US"});
  const n=importGlobalSchools();importGlobalSchools();const rows=await db.select().from(school);expect(rows).toHaveLength(n);expect(rows.find(s=>s.slug==="university-of-st-andrews")?.country).toBe("UK");expect(new Set(rows.map(s=>s.country))).toEqual(new Set(["UK","HK","CA","AU","SG"]));
  const hk=await searchSchools({country:"HK"});expect(hk.matchCount).toBe(8);expect(hk.results.every(r=>r.school.country==="HK"&&r.latest===null&&r.federal===null)).toBe(true);
  await db.update(school).set({name:"Operator title"}).where(eq(school.slug,"hku"));importGlobalSchools();expect((await searchSchools({q:"Operator title"})).matchCount).toBe(1);
 });
 it("only returns the owner's completed research, with encrypted results",async()=>{
  await db.insert(user).values([{id:"owner",name:"A",email:"a@example.com"},{id:"other",name:"B",email:"b@example.com"}]);
  const r=await createPlanningRun({userId:"owner",kind:"school_research",feedbackLanguage:"en",provider:"mock",modelName:"mock",promptVersion:"test",schemaVersion:"test",redactionCount:0});
  expect(await getResearchRun("owner",r.id)).toBeNull();await completePlanningRun(r.id,{evidence:{schoolSlug:"hku"}},"mock");
  expect((await getResearchRun("owner",r.id))?.result).toEqual({evidence:{schoolSlug:"hku"}});expect(await getResearchRun("other",r.id)).toBeNull();
 });
});
