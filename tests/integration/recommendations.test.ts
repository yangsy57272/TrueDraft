import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { federalProfile, school, schoolSupplements } from "@/db/schema";
import { EMPTY_PROFILE, type StudentProfile } from "@/lib/planning";
import { recommendSchools } from "@/server/services/recommendations";
import { getSupplementPrompt } from "@/server/services/supplements";
import { POST as addToList } from "@/app/api/list/route";
import { json, req, signIn } from "../helpers/http";

/** Federal-only colleges with a range of admit rates, all strong in computer science (CIP 11). */
const COLLEGES = [
  { slug: "sel-a", rate: 8, state: "MA", undergrads: 6000, cs: 20 },
  { slug: "sel-b", rate: 25, state: "MA", undergrads: 8000, cs: 12 },
  { slug: "mid-a", rate: 45, state: "OH", undergrads: 9000, cs: 10 },
  { slug: "mid-b", rate: 50, state: "CA", undergrads: 20000, cs: 9 },
  { slug: "open-a", rate: 80, state: "MA", undergrads: 7000, cs: 8 },
  { slug: "open-b", rate: 90, state: "TX", undergrads: 30000, cs: 0.5 }, // below the 1% field threshold
  { slug: "no-rate", rate: null, state: "MA", undergrads: 5000, cs: 30 },
];

const profile = (patch: Partial<StudentProfile> = {}): StudentProfile => ({
  ...structuredClone(EMPTY_PROFILE),
  intendedMajors: [{ id: crypto.randomUUID(), name: "Computer Science", cipFamily: "11" }],
  ...patch,
});

beforeEach(async () => {
  for (const [i, c] of COLLEGES.entries()) {
    const [s] = await db.insert(school).values({ slug: c.slug, name: `College ${c.slug}`, state: c.state, control: "private", unitid: `90000${i}` }).returning();
    await db.insert(federalProfile).values({
      schoolId: s.id,
      unitid: `90000${i}`,
      fileDate: "2026-11-02",
      data: { admissionRate: c.rate, undergrads: c.undergrads, satEbrw25: 600, satEbrw75: 700, satMath25: 600, satMath75: 750, degreesByField: { "11": c.cs, "52": 20 } },
    });
  }
});

describe("college recommendations", () => {
  it("needs a major linked to a field", async () => {
    const r = await recommendSchools({ ...structuredClone(EMPTY_PROFILE) });
    expect(r.fields).toEqual([]);
    expect(r.candidates).toBe(0);
  });

  it("sorts candidates into reach / target / safety with reasons, without guessing missing admit rates", async () => {
    const r = await recommendSchools(profile());
    const slugs = (k: "reach" | "target" | "likely") => r.buckets[k].map((x) => x.school.slug).sort();
    expect(slugs("reach")).toEqual(["sel-a", "sel-b"]);
    expect(slugs("target")).toEqual(["mid-a", "mid-b"]);
    expect(slugs("likely")).toEqual(["open-a"]);
    expect(r.noAdmitRate).toBe(1);
    expect(r.candidates).toBe(6);
    expect(r.buckets.reach.find((x) => x.school.slug === "sel-a")?.fit.reasons[0]).toEqual({ code: "very_selective", rate: 8 });
    expect(r.buckets.target[0].fit.reasons).toContainEqual({ code: "no_score" });
  });

  it("moves schools with the student's score, using approximate section-sum ranges", async () => {
    const strong = await recommendSchools(profile({ tests: { satTotal: 1500 } }));
    expect(strong.buckets.likely.map((x) => x.school.slug).sort()).toEqual(["mid-a", "mid-b", "open-a"]);
    expect(strong.buckets.reach.map((x) => x.school.slug)).toEqual(["sel-a"]); // under 15% stays a reach
    const reason = strong.buckets.likely[0].fit.reasons.find((x) => x.code === "score");
    expect(reason).toMatchObject({ test: "sat", position: "above", low: 1200, high: 1450, approximate: true });
  });

  it("prefers schools matching size and region, and labels the ones used to fill gaps", async () => {
    const r = await recommendSchools(profile({ preferences: { sizes: ["medium"], regions: ["northeast"], testPlan: "undecided", needAid: "unsure" } }));
    const target = r.buckets.target;
    expect(target.every((x) => x.outsidePreferences)).toBe(true); // no northeast/medium targets, so filled from others
    expect(r.buckets.reach.every((x) => !x.outsidePreferences)).toBe(true);
  });

  it("adds a school to the list with the suggested category", async () => {
    const student = await signIn("rec@example.test");
    const [s] = await db.select().from(school).limit(1);
    const res = await addToList(req("POST", "/x", { cookie: student.cookie, body: { schoolId: s.id, category: "likely" } }), undefined as never);
    expect(res.status).toBe(201);
    expect((await json(res)).entry.category).toBe("likely");
  });

  it("finds a supplement prompt by school and number", async () => {
    const [s] = await db.select().from(school).limit(1);
    await db.insert(schoolSupplements).values({
      schoolId: s.id,
      cycle: "2026-2027",
      status: "confirmed",
      sourceUrl: "https://example.edu/apply",
      prompts: [{ order: 1, prompt: "Why us?", limitText: "250 words", limit: 250, unit: "words", requirement: "Required", notes: null }],
    });
    expect((await getSupplementPrompt(s.slug, 1))?.prompt.prompt).toBe("Why us?");
    expect(await getSupplementPrompt(s.slug, 2)).toBeNull();
  });
});
