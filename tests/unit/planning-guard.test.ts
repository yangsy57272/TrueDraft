import { describe, expect, it } from "vitest";
import { guardCvImport, profileToText } from "@/server/ai/planning-guard";
import { cvImportSchema } from "@/server/ai/schemas";
import { EMPTY_PROFILE, honorSchema } from "@/lib/planning";

const CV = ["Name: (removed)", "Robotics Club — captain, 2024–2026", "Courses: Physics HL, Economics SL", "Regional math olympiad, bronze"].join("\n");

describe("CV import guard", () => {
  it("attaches the CV line each item came from, and flags items that aren't in the CV", () => {
    const parsed = cvImportSchema.parse({
      courses: [{ name: "Physics HL", level: "ib_hl", grade: null, result: null }],
      activities: [{ type: "robotics", role: "Captain", organization: "Robotics Club", description: "Led the team.", grades: [11, 12], hours_per_week: 6, weeks_per_year: 30 }],
      honors: [
        { title: "Regional math olympiad", level: "regional", grades: [] },
        { title: "International Science Prize", level: "other", grades: [] },
      ],
      skipped_notes: [],
    });
    const out = guardCvImport(parsed, CV);
    expect(out.courses[0]).toMatchObject({ foundInCv: true, excerpt: "Courses: Physics HL, Economics SL" });
    expect(out.activities[0]).toMatchObject({ foundInCv: true, excerpt: "Robotics Club — captain, 2024–2026" });
    expect(out.honors[0]).toMatchObject({ foundInCv: true, excerpt: "Regional math olympiad, bronze" });
    expect(out.honors[1]).toMatchObject({ foundInCv: false, excerpt: null });
  });

  it("accepts the 'other' honor level in both the AI schema and the profile", () => {
    expect(cvImportSchema.safeParse({ courses: [], activities: [], honors: [{ title: "x", level: "other", grades: [] }], skipped_notes: [] }).success).toBe(true);
    expect(honorSchema.safeParse({ id: "h1", title: "Award", level: "other", grades: [] }).success).toBe(true);
  });

  it("never sends test scores, GPA, or course results to Major Explorer", () => {
    const text = profileToText({
      ...structuredClone(EMPTY_PROFILE),
      curriculum: "ib",
      courses: [{ id: "c", name: "Physics HL", level: "ib_hl", grade: 11, result: "7" }],
      interests: "Bridges",
      tests: { ...EMPTY_PROFILE.tests, satTotal: 1550, gpa: 3.9 },
    });
    expect(text).toContain("Physics HL");
    expect(text).not.toMatch(/1550|3\.9|result|\b7\b/);
  });
});
