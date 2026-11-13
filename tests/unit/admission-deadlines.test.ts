import {describe,it,expect} from "vitest";
import reference from "../../data/admission-deadlines/2026-2027.json";
import {admissionSchoolSchema,verifiedOption} from "@/lib/admission-deadlines";
import {googleCalendarLink} from "@/lib/schedule-calendar";
import {buildApplicationSchedule,defaultScheduleState,type ScheduleSchool} from "@/lib/application-schedule";
describe("official round deadline reference",()=>{
 it("requires two distinct publications and two retrievals per exact date/round/programme",()=>{
  const slugs=new Set<string>();for(const row of reference.schools){const s=admissionSchoolSchema.parse(row);expect(slugs.has(s.slug)).toBe(false);slugs.add(s.slug);for(const source of s.sources){expect(source.checks).toHaveLength(2);expect(source.sha256).toBe(source.checks[1].sha256);}}
  const cmu=admissionSchoolSchema.parse(reference.schools.find(s=>s.slug==="carnegie-mellon-university"));const tampered=structuredClone(cmu);tampered.tracks[0].options[0].sourceIds=[cmu.sources[0].id,cmu.sources[0].id];expect(admissionSchoolSchema.safeParse(tampered).success).toBe(false);
 });
 it("does not invent CMU Early Action or reuse dates across entry years; preserves programme exceptions",()=>{
  const cmu=admissionSchoolSchema.parse(reference.schools.find(s=>s.slug==="carnegie-mellon-university"));expect(verifiedOption(cmu,"ea",2027,"general")).toBeNull();expect(verifiedOption(cmu,"ed",2027,"general")?.option.date).toBe("2026-11-02");expect(verifiedOption(cmu,"rd",2027,"general")?.option.date).toBe("2027-01-04");expect(verifiedOption(cmu,"rd",2027,"drama-music")?.option.date).toBe("2026-12-01");expect(verifiedOption(cmu,"rd",2028,"general")).toBeNull();
 });
 it("distinguishes real LAC deadlines instead of assigning all colleges November 15",()=>{
  const bowdoin=admissionSchoolSchema.parse(reference.schools.find(s=>s.slug==="bowdoin-college"));const pomona=admissionSchoolSchema.parse(reference.schools.find(s=>s.slug==="pomona-college"));expect(verifiedOption(bowdoin,"ed",2027,"general")?.option.date).toBe("2026-11-15");expect(verifiedOption(pomona,"ed",2027,"general")?.option.date).toBe("2026-11-08");
 });
 it("Google preview links carry work timing without copying essay content or private notes",()=>{
  const school:ScheduleSchool={id:"one",name:"Example College",slug:null,major:"Psychology",country:"US",platform:"other",round:"rd",status:"planning",deadlines:[],checklist:[],supplementStatus:"none",prompts:[]};const p=buildApplicationSchedule([school],[],defaultScheduleState(),new Date("2026-11-13T08:00:00Z"));p.tasks[0].detail="Private student content";const u=new URL(googleCalendarLink(p,p.sessions[0])!);expect(u.hostname).toBe("calendar.google.com");expect(u.searchParams.get("action")).toBe("TEMPLATE");expect(u.searchParams.get("dates")).toMatch(/^\d{8}T\d{6}Z\/\d{8}T\d{6}Z$/);expect(u.href).not.toContain("Private");expect(u.searchParams.get("text")).toContain("Example College");
 });
});
