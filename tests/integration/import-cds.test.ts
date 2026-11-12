import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { cdsDataset, school } from "@/db/schema";
import { importCds, type CdsFile } from "@/server/services/import-cds";

let schoolId: string;
beforeEach(async () => {
  [ { id: schoolId } ] = await db.insert(school).values({ slug: "example-college", name: "Example College", unitid: "999991", website: "https://example.edu" }).returning();
});
const file = (data: Record<string, unknown> = { applicants: 1000, admitted: 400, enrolled: 200 }): { filename: string; doc: CdsFile } => ({
  filename: "2025-2026-researched.json", doc: { extractedOn: "2026-11-12", method: "Automated extraction; not personally reviewed", records: [{ slug: "example-college", academicYear: "2025-2026", sourceUrl: "https://ir.example.edu/cds.pdf", data }] },
});
describe("bundled CDS reference import", () => {
  it("imports official sources with explicit automated provenance, updates idempotently and refreshes source links", async () => {
    const f = file();
    const catalog = [{ unitid: "999991", slug: "example-college", name: "Example College", status: "document_verified" as const, pageUrl: "https://ir.example.edu/common-data-set", academicYear: "2025-2026", checkedAt: "2026-11-12T00:00:00Z" }];
    expect(importCds([f], catalog)).toMatchObject({ imported: 1, linksUpdated: 1, skipped: [] });
    expect(importCds([file({ applicants: 1200, admitted: 400, enrolled: 200 })], catalog).imported).toBe(1);
    const rows = await db.select().from(cdsDataset);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ verifiedBy: null, verificationStatus: "verified", published: true, data: { applicants: 1200 } });
    expect(rows[0].verificationMethod).toContain("not personally reviewed");
    const [s] = await db.select().from(school).where(eq(school.id, schoolId));
    expect(s.cdsPageUrl).toBe(catalog[0].pageUrl);
    expect(s.linkCheckedAt).not.toBeNull();
  });
  it("preserves administrator drafts and unpublished imported datasets", async () => {
    const [row] = await db.insert(cdsDataset).values({ schoolId, academicYear: "2025-2026", sourceUrl: "https://example.edu/review.pdf", data: { applicants: 800 }, published: false, notes: "Operator draft" }).returning();
    expect(importCds([file()]).preserved).toBe(1);
    expect((await db.select().from(cdsDataset).where(eq(cdsDataset.id, row.id)))[0].data).toEqual({ applicants: 800 });
    await db.update(cdsDataset).set({ notes: "Imported from previous.json" }).where(eq(cdsDataset.id, row.id));
    expect(importCds([file()]).preserved).toBe(1);
  });
  it("preserves published manually maintained data", async () => {
    await db.insert(cdsDataset).values({ schoolId, academicYear: "2025-2026", sourceUrl: "https://example.edu/review.pdf", data: { applicants: 800 }, published: true, notes: "Manually checked" });
    expect(importCds([file()]).preserved).toBe(1);
  });
  it("rejects contradictory values, invalid editions and unsupported external sources", () => {
    expect(importCds([file({ applicants: 100, admitted: 200 })]).skipped).toHaveLength(1);
    const f = file();f.doc.records[0].academicYear = "2024-2026";
    expect(importCds([f]).skipped).toHaveLength(1);
    const external = file();external.doc.records[0].sourceUrl = "https://unrelated.edu/cds.pdf";
    expect(importCds([external]).skipped).toHaveLength(1);
  });
  it("does not promote unverified discovery hints into checked official links", async () => {
    importCds([], [{ unitid: "999991", slug: "example-college", name: "Example College", status: "needs_review", pageUrl: "https://example.edu/guessed-cds" }]);
    expect((await db.select().from(school))[0].cdsPageUrl).toBeNull();
    importCds([], [{ unitid: "999991", slug: "example-college", name: "Example College", status: "page_verified", pageUrl: "https://unrelated.edu/" }]);
    expect((await db.select().from(school))[0].cdsPageUrl).toBeNull();
  });
});
