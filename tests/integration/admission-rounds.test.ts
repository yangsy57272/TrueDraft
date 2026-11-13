import {describe,it,expect} from "vitest";
import {eq} from "drizzle-orm";
import {db} from "@/db";
import {school,collegeListEntry} from "@/db/schema";
import {addEntry,updateEntry,addDeadline,updateDeadline,listEntries} from "@/server/services/college-list";
import {getApplicationSchedule} from "@/server/services/application-schedule";
import {signIn} from "../helpers/http";
async function setup(){const me=await signIn("round-owner@example.test");const other=await signIn("round-other@example.test");const [s]=await db.insert(school).values({slug:"carnegie-mellon-university",name:"Carnegie Mellon University",website:"https://www.cmu.edu"}).returning();const entry=await addEntry(me.userId,{schoolId:s.id,intendedMajor:"Computer Science"});return {me,other,entry};}
describe("school-specific round selection and automatic deadlines",()=>{
 it("sets verified CMU RD and ED dates, replaces only managed records and recalculates the plan",async()=>{
  const {me,entry}=await setup();await addDeadline(me.userId,entry.id,{type:"financial_aid",date:"2027-02-15",timeZone:"UTC"});
  const rd=await updateEntry(me.userId,entry.id,{round:"rd",entryYear:2027,deadlineTrack:"general"});expect(rd.deadlines.find(d=>d.provenance)?.date).toBe("2027-01-04");const firstId=rd.deadlines.find(d=>d.provenance)!.id;
  const repeat=await updateEntry(me.userId,entry.id,{round:"rd"});expect(repeat.deadlines.find(d=>d.provenance)?.id).toBe(firstId);
  const ed=await updateEntry(me.userId,entry.id,{round:"ed"});expect(ed.deadlines.filter(d=>d.provenance)).toHaveLength(1);expect(ed.deadlines.find(d=>d.provenance)?.date).toBe("2026-11-02");expect(ed.deadlines.some(d=>d.type==="financial_aid")).toBe(true);
  const plan=await getApplicationSchedule(me.userId,new Date("2026-10-01T08:00:00Z"));expect(plan.plan.tasks.find(t=>t.kind==="submit")?.deadline?.date).toBe("2026-11-02");expect(plan.plan.tasks.find(t=>t.kind==="submit")?.source).toBe("official_catalog");
 });
 it("rejects unavailable rounds and foreign-account edits atomically",async()=>{
  const {me,other,entry}=await setup();await expect(updateEntry(me.userId,entry.id,{round:"ea",deadlineTrack:"general",category:"reach"})).rejects.toMatchObject({status:400});
  expect((await listEntries(me.userId))[0].category).toBe("unsure");await expect(updateEntry(other.userId,entry.id,{round:"rd",deadlineTrack:"general"})).rejects.toMatchObject({status:404});
 });
 it("uses the Drama/Music exception, clears stale managed dates for another entry year and invalidates proof on manual date edits",async()=>{
  const {me,entry}=await setup();const drama=await updateEntry(me.userId,entry.id,{round:"rd",entryYear:2027,deadlineTrack:"drama-music"});const auto=drama.deadlines.find(d=>d.provenance)!;expect(auto.date).toBe("2026-12-01");
  await updateDeadline(me.userId,entry.id,auto.id,{date:"2026-12-03"});expect((await listEntries(me.userId))[0].deadlines[0].provenance).toBeUndefined();
  await updateEntry(me.userId,entry.id,{round:"rd",deadlineTrack:"general"});const future=await updateEntry(me.userId,entry.id,{entryYear:2028});expect(future.deadlines.some(d=>d.provenance)).toBe(false);expect(future.deadlines.some(d=>d.date==="2026-12-03")).toBe(true);
  expect((await db.select().from(collegeListEntry).where(eq(collegeListEntry.id,entry.id)))[0].entryYear).toBe(2028);
 });
 it("new entries can start with a verified chosen round and unknown schools keep their dates unverified",async()=>{
  const {me}=await setup();const [s]=await db.insert(school).values({slug:"santa-clara-university",name:"Santa Clara University"}).returning();const scu=await addEntry(me.userId,{schoolId:s.id,round:"ea",entryYear:2027});expect(scu.deadlines[0].date).toBe("2026-11-01");const custom=await addEntry(me.userId,{customSchoolName:"Unverified university",round:"ea",entryYear:2027});expect(custom.deadlines).toHaveLength(0);
 });
});
