import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { essay, essayVersion, planningRun, studentProfile } from "@/db/schema";
import { encryptJson } from "@/server/crypto";
import { POST as saveVersionRoute } from "@/app/api/essays/[id]/versions/route";
import { GET as getProfileRoute, PUT as putProfile } from "@/app/api/profile/route";
import { DELETE as removeMajor, POST as addMajor } from "@/app/api/profile/majors/route";
import { POST as runPlanning } from "@/app/api/planning/[kind]/route";
import { GET as listRuns } from "@/app/api/planning/runs/route";
import { DELETE as deleteRun } from "@/app/api/planning/runs/[id]/route";
import { GET as getList, POST as addToList } from "@/app/api/list/route";
import { DELETE as removeFromList, PATCH as patchList } from "@/app/api/list/[id]/route";
import { POST as addChecklistItem } from "@/app/api/list/[id]/checklist/route";
import { DELETE as removeChecklistItem, PATCH as setChecklistItem } from "@/app/api/list/[id]/checklist/[itemId]/route";
import { POST as addDeadlineRoute } from "@/app/api/list/[id]/deadlines/route";
import { DELETE as removeDeadlineRoute, PATCH as patchDeadlineRoute } from "@/app/api/list/[id]/deadlines/[deadlineId]/route";
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
    const ok = await patchList(req("PATCH", "/x", { cookie: me.cookie, body: { category: "reach", round: "ea", intendedMajor: "Physics", notes: "Visit in spring" } }), ctx({ id }));
    expect(ok.status).toBe(200);
    const bad = await patchList(req("PATCH", "/x", { cookie: me.cookie, body: { category: "guaranteed" } }), ctx({ id }));
    expect(bad.status).toBe(400);
    const list = await json(await getList(req("GET", "/api/list", { cookie: me.cookie }), undefined as never));
    expect(list.entries[0]).toMatchObject({ category: "reach", round: "ea", intendedMajor: "Physics", notes: "Visit in spring" });
  });

  it("updates only the fields sent and never resets the others to defaults", async () => {
    const { id } = await json(await addToList(req("POST", "/api/list", { cookie: me.cookie, body: { schoolId, category: "reach", status: "in_progress" } }), undefined as never));
    const res = await json(await patchList(req("PATCH", "/x", { cookie: me.cookie, body: { round: "ed" } }), ctx({ id })));
    expect(res.entry).toMatchObject({ category: "reach", status: "in_progress", round: "ed" });
    const major = await json(await patchList(req("PATCH", "/x", { cookie: me.cookie, body: { intendedMajor: "History" } }), ctx({ id })));
    expect(major.entry).toMatchObject({ category: "reach", round: "ed", intendedMajor: "History" });
    // The whole checklist can no longer be replaced through a field update.
    expect((await patchList(req("PATCH", "/x", { cookie: me.cookie, body: { checklist: [] } }), ctx({ id }))).status).toBe(400);
  });

  it("applies concurrent checklist operations without losing any of them", async () => {
    const { id, entry } = await json(await addToList(req("POST", "/api/list", { cookie: me.cookie, body: { customSchoolName: "Custom College" } }), undefined as never));
    const [a, b, c] = entry.checklist;
    const set = (itemId: string, done: boolean, cookie = me.cookie) =>
      setChecklistItem(req("PATCH", "/x", { cookie, body: { done } }), ctx({ id, itemId }));
    // Rapid clicks on different items, sent at the same time.
    const results = await Promise.all([set(a.id, true), set(b.id, true), set(c.id, true)]);
    expect(results.map((r) => r.status)).toEqual([200, 200, 200]);
    // A field update racing with a checklist click doesn't undo it, and vice versa.
    await Promise.all([patchList(req("PATCH", "/x", { cookie: me.cookie, body: { intendedMajor: "Biology" } }), ctx({ id })), set(a.id, false)]);
    const [after] = (await json(await getList(req("GET", "/api/list", { cookie: me.cookie }), undefined as never))).entries;
    expect(after.intendedMajor).toBe("Biology");
    expect(after.checklist.filter((i: { done: boolean }) => i.done).map((i: { id: string }) => i.id)).toEqual([b.id, c.id]);
    // Setting is idempotent, so a retried request has the same effect.
    await set(b.id, true);
    expect((await json(await set(b.id, true))).entry.checklist.find((i: { id: string }) => i.id === b.id).done).toBe(true);
    // Custom items: add (idempotent with a client id), remove; owners only.
    const add = (cookie = me.cookie) => addChecklistItem(req("POST", "/x", { cookie, body: { label: "Portfolio", itemId: "custom-1" } }), ctx({ id }));
    expect((await add()).status).toBe(201);
    const twice = await json(await add());
    expect(twice.entry.checklist.filter((i: { label?: string }) => i.label === "Portfolio")).toHaveLength(1);
    expect((await add(other.cookie)).status).toBe(404);
    expect((await set(a.id, true, other.cookie)).status).toBe(404);
    expect((await set("no-such-item", true)).status).toBe(404);
    const removed = await json(await removeChecklistItem(req("DELETE", "/x", { cookie: me.cookie }), ctx({ id, itemId: "custom-1" })));
    expect(removed.entry.checklist.some((i: { id: string }) => i.id === "custom-1")).toBe(false);
  });

  it("keeps several typed deadlines per school with time zone, source, and done state", async () => {
    const { id } = await json(await addToList(req("POST", "/api/list", { cookie: me.cookie, body: { customSchoolName: "Deadline College" } }), undefined as never));
    const add = (body: Record<string, unknown>, cookie = me.cookie) => addDeadlineRoute(req("POST", "/x", { cookie, body }), ctx({ id }));
    const ed = await json(await add({ type: "early_decision", date: "2026-11-01", timeZone: "America/New_York", source: "https://example.edu/apply", itemId: "dl-ed" }));
    expect(ed.entry.deadlines).toEqual([{ id: "dl-ed", type: "early_decision", date: "2026-11-01", time: null, timeZone: "America/New_York", source: "https://example.edu/apply", label: null, done: false }]);
    // Retrying with the same id doesn't duplicate; concurrent adds are all kept.
    await add({ type: "early_decision", date: "2026-11-01", itemId: "dl-ed" });
    await Promise.all([add({ type: "financial_aid", date: "2026-11-15", itemId: "dl-aid" }), add({ type: "interview", date: "2026-11-20", time: "17:00", timeZone: "Asia/Shanghai", itemId: "dl-int" })]);
    const patch = (did: string, body: Record<string, unknown>) => patchDeadlineRoute(req("PATCH", "/x", { cookie: me.cookie, body }), ctx({ id, deadlineId: did }));
    const done = await json(await patch("dl-ed", { done: true }));
    expect(done.entry.deadlines.map((d: { id: string }) => d.id).sort()).toEqual(["dl-aid", "dl-ed", "dl-int"]);
    expect(done.entry.deadlines.find((d: { id: string }) => d.id === "dl-ed")).toMatchObject({ done: true, timeZone: "America/New_York", source: "https://example.edu/apply" });
    // Validation: real dates, times, and zones only; strict fields.
    expect((await add({ type: "application", date: "2026-02-31" })).status).toBe(400);
    expect((await add({ type: "application", date: "2026-02-28", timeZone: "Mars/Base" })).status).toBe(400);
    expect((await add({ type: "deadline_of_doom", date: "2026-02-28" })).status).toBe(400);
    expect((await patch("dl-aid", { admissionChance: 1 })).status).toBe(400);
    // Owner only.
    expect((await add({ type: "application", date: "2026-12-01" }, other.cookie)).status).toBe(404);
    expect((await patchDeadlineRoute(req("PATCH", "/x", { cookie: other.cookie, body: { done: true } }), ctx({ id, deadlineId: "dl-aid" }))).status).toBe(404);
    const removed = await json(await removeDeadlineRoute(req("DELETE", "/x", { cookie: me.cookie }), ctx({ id, deadlineId: "dl-int" })));
    expect(removed.entry.deadlines).toHaveLength(2);
    const exported = await (await exportData(req("GET", "/api/account/export", { cookie: me.cookie }), undefined as never)).json();
    expect(exported.collegeList[0].deadlines).toHaveLength(2);
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
  it("exports every exploration (no cap), with identifiers, and pages the history without gaps", async () => {
    const base = Date.now() - 1_000_000;
    // 25 explorations, several sharing the same millisecond to exercise the keyset cursor.
    await db.insert(planningRun).values(
      Array.from({ length: 25 }, (_, i) => ({
        userId: me.userId,
        kind: "major_explorer",
        feedbackLanguage: "en",
        provider: "fake",
        modelName: "fake",
        promptVersion: "p",
        schemaVersion: "s",
        status: "completed",
        encryptedStructuredResult: encryptJson({ n: i }, "planning_result"),
        createdAt: new Date(base + Math.floor(i / 3) * 1000),
      })),
    );
    const data = await (await exportData(req("GET", "/api/account/export", { cookie: me.cookie }), undefined as never)).json();
    expect(data.format).toBe("truedraft-export/v2");
    expect(data.account.id).toBe(me.userId);
    expect(data.majorExplorations).toHaveLength(25);
    expect(new Set(data.majorExplorations.map((r: { id: string }) => r.id)).size).toBe(25);
    expect(data.majorExplorations.map((r: { result: { n: number } }) => r.result.n).sort((a: number, b: number) => a - b)).toEqual(Array.from({ length: 25 }, (_, i) => i));
    expect(data.activity.length).toBeGreaterThan(0);

    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const url: string = `/api/planning/runs?kind=major_explorer${cursor ? `&cursor=${cursor}` : ""}`;
      const page: { runs: { id: string }[]; nextCursor: string | null } = await json(await listRuns(req("GET", url, { cookie: me.cookie }), undefined as never));
      seen.push(...page.runs.map((r) => r.id));
      cursor = page.nextCursor;
      pages++;
    } while (cursor && pages < 10);
    expect(pages).toBe(2);
    expect(seen).toHaveLength(25);
    expect(new Set(seen).size).toBe(25);
    // Another student's cursor reveals nothing.
    const foreign = await json(await listRuns(req("GET", `/api/planning/runs?kind=major_explorer&cursor=${seen[5]}`, { cookie: other.cookie }), undefined as never));
    expect(foreign.runs).toEqual([]);
  });

  it("encrypts version notes at rest and exports them with ids", async () => {
    const { id } = await json(await createEssay(req("POST", "/api/essays", { cookie: me.cookie, body: sampleEssay }), undefined as never));
    await saveVersionRoute(req("POST", "/x", { cookie: me.cookie, body: { content: "Second draft", note: "Moved the stall scene earlier" } }), ctx({ id }));
    const rows = await db.select().from(essayVersion).where(eq(essayVersion.essayId, id));
    const withNote = rows.find((r) => r.versionNumber === 2)!;
    expect(withNote.legacyVersionNote).toBeNull();
    expect(withNote.encryptedVersionNote).toMatch(/^v1\./);
    expect(JSON.stringify(rows)).not.toContain("stall scene");
    const data = await (await exportData(req("GET", "/api/account/export", { cookie: me.cookie }), undefined as never)).json();
    const v2 = data.essays[0].versions.find((v: { versionNumber: number }) => v.versionNumber === 2);
    expect(v2).toMatchObject({ note: "Moved the stall scene earlier" });
    expect(v2.id).toBe(withNote.id);
    expect(data.essays[0].id).toBe(id);
  });
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
