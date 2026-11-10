import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { supplementFileSchema, wordLimitFor } from "@/lib/supplements";

const file = JSON.parse(readFileSync(path.join(process.cwd(), "data", "supplements", "2026-2027.json"), "utf8"));

describe("supplement prompts data", () => {
  it("passes validation", () => {
    const parsed = supplementFileSchema.safeParse(file);
    expect(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues.slice(0, 3))).toBe(true);
  });

  it("matches each school to one directory institution", () => {
    const ids = file.schools.map((s: { unitid: string | null; slug?: string }) => s.unitid ?? s.slug);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("does not carry third-party guide text, only links", () => {
    for (const s of file.schools) {
      expect(s.guideUrl == null || s.guideUrl.startsWith("https://www.collegeessayguy.com/")).toBe(true);
      for (const p of s.prompts) expect([undefined, "official", "summary"]).toContain(p.wording);
    }
  });

  it("rejects a confirmed school without prompts", () => {
    const bad = { ...file, schools: [{ ...file.schools.find((s: { status: string }) => s.status === "confirmed"), prompts: [] }] };
    expect(supplementFileSchema.safeParse(bad).success).toBe(false);
  });
});

describe("wordLimitFor", () => {
  it("pre-fills word limits only", () => {
    expect(wordLimitFor({ limit: 250, unit: "words" })).toBe(250);
    expect(wordLimitFor({ limit: 350, unit: "characters" })).toBeNull();
    expect(wordLimitFor({ limit: null, unit: null })).toBeNull();
  });
});
