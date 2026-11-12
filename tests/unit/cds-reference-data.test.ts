import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { cdsDataSchema } from "@/lib/planning";

type Row = { slug: string; academicYear: string; sourceUrl: string; sourceSha256?: string; sourceLines?: Record<string, unknown>; sourcePages?: Record<string, number | null>; data: Record<string, unknown> };
const dir = path.resolve("data/cds");
const files = readdirSync(dir).filter(f => /^20\d{2}-20\d{2}.*\.json$/.test(f));
const rows = files.flatMap(filename => (JSON.parse(readFileSync(path.join(dir, filename), "utf8")).records as Row[]).map(r => ({ ...r, filename })));
describe("published CDS reference data", () => {
  it("has unique school-edition records and valid, mutually consistent field values", () => {
    const keys = rows.map(r => `${r.slug}:${r.academicYear}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const r of rows) {
      const result = cdsDataSchema.safeParse(r.data);
      expect(result.success, `${r.slug} ${r.academicYear}: ${result.success ? "" : result.error.message}`).toBe(true);
    }
  });
  it("keeps source evidence and a file checksum for every newly extracted field", () => {
    for (const r of rows.filter(r => r.filename.includes("researched"))) {
      expect(r.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(r.sourceUrl).toMatch(/^https?:\/\//);
      for (const key of Object.keys(r.data)) {
        expect(r.sourceLines?.[key], `${r.slug}.${key}`).toBeTruthy();
        expect(r.sourcePages).toHaveProperty(key);
      }
    }
  });
  it("does not assign one report to multiple institution slugs", () => {
    const hashes = new Map<string, string>();
    for (const r of rows.filter(r => r.sourceSha256)) {
      const previous = hashes.get(r.sourceSha256!);
      expect(!previous || previous === r.slug, `${r.sourceSha256}: ${previous} vs ${r.slug}`).toBe(true);
      hashes.set(r.sourceSha256!, r.slug);
    }
  });
});
