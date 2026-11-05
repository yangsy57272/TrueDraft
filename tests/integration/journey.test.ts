import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { essay, planningRun, studentProfile } from "@/db/schema";
import { GET as getProfileRoute, PUT as putProfile } from "@/app/api/profile/route";
import { DELETE as removeMajor, POST as addMajor } from "@/app/api/profile/majors/route";
import { POST as runPlanning } from "@/app/api/planning/[kind]/route";
import { GET as listRuns } from "@/app/api/planning/runs/route";
import { DELETE as deleteRun } from "@/app/api/planning/runs/[id]/route";
import { GET as getList, POST as addToList } from "@/app/api/list/route";
import { DELETE as removeFromList, PATCH as patchList } from "@/app/api/list/[id]/route";
import { POST as createEssay } from "@/app/api/essays/route";
import { POST as consent } from "@/app/api/consent/route";
import { GET as exportData } from "@/app/api/account/export/route";
import { DELETE as deleteAccount } from "@/app/api/account/route";
import * as providerModule from "@/server/ai/provider";
import type { StructuredRequest } from "@/server/ai/provider";
import { SEED_SCHOOLS } from "@/content/schools";
import { school } from "@/db/schema";
import { ctx, json, readStream, req, sampleEssay, signIn } from "../helpers/http";

let me: { cookie: string; userId: string };
let other: { cookie: string; userId: string };

const PROFILE = {
  graduationYear: 2027,
  curriculum: "ib",
  courses: [
    { id: "c1", name: "Physics HL", level: "ib_hl", grade: 11, result: "7" },
    { id: "c2", name: "Economics SL", level: "ib_sl", grade: 11 },
  ],
  activities: [
    { id: "a1", type: "robotics", role: "Build lead", organization: "School Robotics Club", description: "Designed the drivetrain and taught new members CAD.", grades: [10, 11], hoursPerWeek: 6, weeksPerYear: 30 },
  ],
  honors: [{ id: "h1", title: "Provincial Physics Olympiad, second prize", level: "regional", grades: [11] }],
  tests: { satTotal: 1530, toefl: 112 },
  interests: "I like figuring out why machines fail.",
  values: "Small classes",
  preferences: { sizes: ["medium"], regions: ["northeast"], testPlan: "submit", needAid: "yes" },
  intendedMajors: [],
};

beforeEach(async () => {
  me = await signIn("journey@example.test");
  other = await signIn("other@example.test");
});
afterEach(() => vi.restoreAllMocks());

const grant = (who = me) => consent(req("POST", "/x", { cookie: who.cookie, body: { consentType: "ai_processing", action: "grant" } }), undefined as never);
const save = (body: unknown, who = me) => putProfile(req("PUT", "/api/profile", { cookie: who.cookie, body: { profile: body } }), undefined as never);
const planning = (kind: string, body: Record<string, unknown> = {}, who = me) => runPlanning(req("POST", "/x", { cookie: who.cookie, body }), ctx({ kind }));

function fakeProvider(respond: (r: StructuredRequest) => unknown, calls: StructuredRequest[] = []): providerModule.AiProvider {
  return {
    kind: "fake",
    model: "fake-model",
    async generate(request) {
      calls.push(request);
      return { json: respond(request), model: "fake-model", providerRef: null };
    },
  };
}

describe("student profile", () => {
  it("saves, encrypts, and returns the profile only to its owner", async () => {
    expect((await save(PROFILE)).status).toBe(200);
    const mine = await json(await getProfileRoute(req("GET", "/api/profile", { cookie: me.cookie }), undefined as never));
    expect(mine.profile.courses[0].name).toBe("Physics HL");
    expect(mine.profile.activities[0].organization).toBe("School Robotics Club");
    const theirs = await json(await getProfileRoute(req("GET", "/api/profile", { cookie: other.cookie }), undefined as never));
    expect(theirs.profile.courses).toEqual([]);
    const [row] = await db.select().from(studentProfile).where(eq(studentProfile.userId, me.userId));
    expect(row.encryptedData).not.toContain("Robotics");
  });

  it("enforces the Common App 150-character activity limit and valid enums", async () => {
    const tooLong = { ...PROFILE, activities: [{ ...PROFILE.activities[0], description: "x".repeat(151) }] };
    expect((await save(tooLong)).status).toBe(400);
    const badLevel = { ...PROFILE, courses: [{ ...PROFILE.courses[0], level: "super_hard" }] };
    expect((await save(badLevel)).status).toBe(400);
  });

  it("adds and removes intended majors", async () => {
    await save(PROFILE);
    const added = await json(await addMajor(req("POST", "/x", { cookie: me.cookie, body: { name: "Mechanical Engineering", cipFamily: "14" } }), undefined as never));
    expect(added.majors).toHaveLength(1);
    const again = await json(await addMajor(req("POST", "/x", { cookie: me.cookie, body: { name: "mechanical engineering" } }), undefined as never));
    expect(again.majors).toHaveLength(1);
    const removed = await json(await removeMajor(req("DELETE", "/x", { cookie: me.cookie, body: { id: added.majors[0].id } }), undefined as never));
    expect(removed.majors).toHaveLength(0);
  });
});

describe("Major Explorer", () => {
  const response = {
    themes: [{ theme: "Building things", evidence: "Robotics build lead" }],
    suggestions: [
      {
        major: "Mechanical Engineering",
        cip_family: "14",
        why_it_might_fit: "You design drivetrains.",
        based_on: ["School Robotics Club", "Physics HL", "Varsity fencing captain"],
        what_you_would_study: "Mechanics",
        related_majors: ["Robotics"],
        ways_to_test_interest: ["Take a free statics course"],
        questions_to_ask_yourself: ["Do you enjoy debugging?"],
        zh_note: null,
      },
      { major: "Something", cip_family: "99", why_it_might_fit: "x", based_on: [], what_you_would_study: "x", related_majors: [], ways_to_test_interest: [], questions_to_ask_yourself: [], zh_note: null },
    ],
    broader_options: [],
    reflective_questions: [],
    notes_on_naming: "Names vary.",
    limitations: "AI can be wrong.",
  };

  it("requires consent and a non-empty profile", async () => {
    expect((await planning("major_explorer")).status).toBe(403);
    await grant();
    const empty = await planning("major_explorer");
    expect((await json(empty)).error.code).toBe("profile_empty");
  });

  it("grounds suggestions in the profile, drops invalid field codes, and never sends scores", async () => {
    await save(PROFILE);
    await grant();
    const calls: StructuredRequest[] = [];
    vi.spyOn(providerModule, "getProvider").mockResolvedValue(fakeProvider(() => response, calls));
    const events = await readStream(await planning("major_explorer"));
    const done = events.find((e) => e.type === "done");
    const s = done.result.suggestions;
    expect(s[0].based_on).toEqual([
      { text: "School Robotics Club", grounded: true },
      { text: "Physics HL", grounded: true },
      { text: "Varsity fencing captain", grounded: false },
    ]);
    expect(s[1].cip_family).toBeNull();
    // Data minimisation: scores, GPA, graduation year, and preferences are not sent.
    expect(calls[0].user).toContain("School Robotics Club");
    expect(calls[0].user).not.toMatch(/1530|112|2027|needAid|northeast/);
    expect(calls[0].user).not.toContain("journey@example.test");
  });

  it("stores explorations encrypted, lists them, and only the owner can delete", async () => {
    await save(PROFILE);
    await grant();
    vi.spyOn(providerModule, "getProvider").mockResolvedValue(fakeProvider(() => response));
    const done = (await readStream(await planning("major_explorer"))).find((e) => e.type === "done");
    const [row] = await db.select().from(planningRun).where(eq(planningRun.id, done.runId));
    expect(row.encryptedStructuredResult).not.toContain("Mechanical");
    const runs = await json(await listRuns(req("GET", "/api/planning/runs?kind=major_explorer", { cookie: me.cookie }), undefined as never));
    expect(runs.runs[0].result.suggestions[0].major).toBe("Mechanical Engineering");
    expect((await deleteRun(req("DELETE", "/x", { cookie: other.cookie }), ctx({ id: done.runId }))).status).toBe(404);
    expect((await deleteRun(req("DELETE", "/x", { cookie: me.cookie }), ctx({ id: done.runId }))).status).toBe(200);
  });

  it("rejects unknown planning tools (essay or admin tools can't be run here)", async () => {
    await grant();
    expect((await planning("cds_extract")).status).toBe(404);
    expect((await planning("full_feedback")).status).toBe(404);
  });
});

describe("CV import", () => {
  const CV = "Li Ming · li.ming@example.com · +86 138 1234 5678\nSchool Robotics Club — Build lead (Grades 10-11)\nAP Calculus BC\nNational Chemistry Olympiad finalist";

  it("redacts contact details, flags unverifiable items, and never stores the extraction", async () => {
    await grant();
    const calls: StructuredRequest[] = [];
    vi.spyOn(providerModule, "getProvider").mockResolvedValue(
      fakeProvider(
        () => ({
          courses: [{ name: "AP Calculus BC", level: "ap", grade: 14, result: null }],
          activities: [
            { type: "robotics", role: "Build lead", organization: "School Robotics Club", description: "Led builds", grades: [10, 11, 13], hours_per_week: 200, weeks_per_year: 30 },
            { type: "other", role: "President", organization: "Invented Society", description: "Not in CV", grades: [], hours_per_week: null, weeks_per_year: null },
          ],
          honors: [{ title: "National Chemistry Olympiad finalist", level: "national", grades: [] }],
          skipped_notes: ["contact details omitted"],
        }),
        calls,
      ),
    );
    const events = await readStream(await planning("cv_import", { cvText: CV }));
    const done = events.find((e) => e.type === "done");
    expect(calls[0].user).not.toContain("li.ming@example.com");
    expect(calls[0].user).not.toContain("138 1234 5678");
    expect(done.result.courses[0].grade).toBeNull();
    expect(done.result.activities[0].grades).toEqual([10, 11]);
    expect(done.result.activities[0].hours_per_week).toBeNull();
    expect(done.result.activities[0].foundInCv).toBe(true);
    expect(done.result.activities[1].foundInCv).toBe(false);
    const [row] = await db.select().from(planningRun).where(eq(planningRun.id, done.runId));
    expect(row.encryptedStructuredResult).toBeNull();
  });

  it("validates CV input", async () => {
    await grant();
    expect((await json(await planning("cv_import", { cvText: "  " }))).error.code).toBe("cv_required");
    expect((await planning("cv_import", { cvText: "x".repeat(14000) })).status).toBe(400);
  });
});

describe("college list", () => {
  let schoolId: string;
  beforeEach(async () => {
    const [row] = await db.insert(school).values({ ...SEED_SCHOOLS[0], published: true }).returning();
    schoolId = row.id;
  });

  it("adds directory and custom schools with a default checklist; duplicates are rejected", async () => {
    const add = await addToList(req("POST", "/api/list", { cookie: me.cookie, body: { schoolId } }), undefined as never);
    expect(add.status).toBe(201);
    const dup = await addToList(req("POST", "/api/list", { cookie: me.cookie, body: { schoolId } }), undefined as never);
    expect((await json(dup)).error.code).toBe("already_on_list");
    await addToList(req("POST", "/api/list", { cookie: me.cookie, body: { customSchoolName: "University of Toronto" } }), undefined as never);
    const list = await json(await getList(req("GET", "/api/list", { cookie: me.cookie }), undefined as never));
    expect(list.entries).toHaveLength(2);
    expect(list.entries[0].checklist.length).toBeGreaterThan(3);
    expect(list.entries[0].category).toBe("unsure");
    const theirs = await json(await getList(req("GET", "/api/list", { cookie: other.cookie }), undefined as never));
    expect(theirs.entries).toEqual([]);
  });

  it("only the owner can edit or remove an entry, and notes are encrypted", async () => {
    const { id } = await json(await addToList(req("POST", "/api/list", { cookie: me.cookie, body: { schoolId } }), undefined as never));
    expect((await patchList(req("PATCH", "/x", { cookie: other.cookie, body: { status: "submitted" } }), ctx({ id }))).status).toBe(404);
    expect((await removeFromList(req("DELETE", "/x", { cookie: other.cookie }), ctx({ id }))).status).toBe(404);
    const ok = await patchList(req("PATCH", "/x", { cookie: me.cookie, body: { category: "reach", round: "ea", deadline: "2026-11-01", notes: "Visit in spring" } }), ctx({ id }));
    expect(ok.status).toBe(200);
    const bad = await patchList(req("PATCH", "/x", { cookie: me.cookie, body: { category: "guaranteed" } }), ctx({ id }));
    expect(bad.status).toBe(400);
    const list = await json(await getList(req("GET", "/api/list", { cookie: me.cookie }), undefined as never));
    expect(list.entries[0]).toMatchObject({ category: "reach", round: "ea", deadline: "2026-11-01", notes: "Visit in spring" });
  });

  it("links essays only to the student's own list entries", async () => {
    const { id } = await json(await addToList(req("POST", "/api/list", { cookie: me.cookie, body: { schoolId } }), undefined as never));
    const foreign = await createEssay(req("POST", "/api/essays", { cookie: other.cookie, body: { ...sampleEssay, listEntryId: id } }), undefined as never);
    expect(foreign.status).toBe(404);
    const mine = await json(await createEssay(req("POST", "/api/essays", { cookie: me.cookie, body: { ...sampleEssay, listEntryId: id } }), undefined as never));
    const list = await json(await getList(req("GET", "/api/list", { cookie: me.cookie }), undefined as never));
    expect(list.entries[0].essays[0].id).toBe(mine.id);
    // Removing the school keeps the essay but unlinks it.
    await removeFromList(req("DELETE", "/x", { cookie: me.cookie }), ctx({ id }));
    const [row] = await db.select().from(essay).where(eq(essay.id, mine.id));
    expect(row.listEntryId).toBeNull();
  });
});

describe("export and deletion include planning data", () => {
  it("exports profile, list, and explorations, and deletes them with the account", async () => {
    await save(PROFILE);
    await addToList(req("POST", "/api/list", { cookie: me.cookie, body: { customSchoolName: "Example U" } }), undefined as never);
    const data = await (await exportData(req("GET", "/api/account/export", { cookie: me.cookie }), undefined as never)).json();
    expect(data.profile.courses[0].name).toBe("Physics HL");
    expect(data.collegeList[0].school).toBe("Example U");
    expect(data.majorExplorations).toEqual([]);
    await deleteAccount(req("DELETE", "/api/account", { cookie: me.cookie, body: { confirm: "DELETE" } }), undefined as never);
    expect(await db.select().from(studentProfile).where(eq(studentProfile.userId, me.userId))).toHaveLength(0);
  });
});
