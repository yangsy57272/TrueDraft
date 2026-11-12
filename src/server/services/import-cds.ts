import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { cdsDataset, school } from "@/db/schema";
import { isInstitutionalSource, validateCdsData } from "./schools";

export type CdsRecord = {
  slug: string; academicYear: string; sourceUrl: string; sourcePageRef?: string;
  sourceExceptionReason?: string; data: Record<string, unknown>; method?: string;
};
export type CdsFile = { method: string; extractedOn: string; records: CdsRecord[] };
export type CdsCatalogEntry = {
  unitid: string | null; slug: string; name: string;
  status: "document_verified" | "page_verified" | "needs_review" | "fetch_failed" | "not_located";
  checkedAt?: string; pageUrl?: string; documentUrl?: string; academicYear?: string;
};

/** Import public reference data without replacing operator edits, drafts, or unpublished datasets. */
export function importCds(documents: { filename: string; doc: CdsFile }[], catalog: CdsCatalogEntry[] = []) {
  const db = getDb();
  const result = { imported: 0, linksUpdated: 0, preserved: 0, skipped: [] as { slug: string; reason: string }[] };
  db.transaction(tx => {
    for (const entry of catalog) {
      if (!["document_verified", "page_verified"].includes(entry.status)) continue;
      const s = tx.select().from(school).where(eq(school.slug, entry.slug)).get();
      const url = entry.pageUrl ?? entry.documentUrl;
      // A reachable historical file must not downgrade a known newer institutional entry.
      if (s?.latestCdsYearListed && entry.academicYear && s.latestCdsYearListed > entry.academicYear) continue;
      if (!s || !url || !isInstitutionalSource(url, { ...s, cdsPageUrl: null })) continue;
      tx.update(school).set({ cdsPageUrl: url, linkCheckedAt: entry.checkedAt ? new Date(entry.checkedAt) : null,
        ...(entry.academicYear ? { latestCdsYearListed: entry.academicYear } : {}) }).where(eq(school.id, s.id)).run();
      result.linksUpdated++;
    }
    for (const { filename, doc } of documents) {
      for (const r of doc.records) {
        const skip = (reason: string) => result.skipped.push({ slug: r.slug, reason });
        const s = tx.select().from(school).where(eq(school.slug, r.slug)).get();
        if (!s) { skip("school not in directory"); continue; }
        const year = /^(20\d{2})-(20\d{2})$/.exec(r.academicYear);
        if (!year || Number(year[2]) !== Number(year[1]) + 1) { skip("invalid reporting year"); continue; }
        const institutional = isInstitutionalSource(r.sourceUrl, s);
        if (!institutional && !r.sourceExceptionReason) { skip("off-domain source without documented institutional link"); continue; }
        let data;
        try { data = validateCdsData(r.data); } catch { skip("invalid or contradictory CDS values"); continue; }
        const existing = tx.select().from(cdsDataset).where(and(eq(cdsDataset.schoolId, s.id), eq(cdsDataset.academicYear, r.academicYear))).get();
        if (existing && (existing.verifiedBy || !existing.published || !existing.notes?.startsWith("Imported from "))) { result.preserved++; continue; }
        const values = { schoolId: s.id, academicYear: r.academicYear, sourceUrl: r.sourceUrl,
          sourcePageRef: r.sourcePageRef ?? null, sourceDomainException: !institutional,
          sourceExceptionReason: institutional ? null : r.sourceExceptionReason!, data,
          verificationStatus: "verified", verifiedAt: new Date(`${doc.extractedOn}T00:00:00Z`), verifiedBy: null,
          verificationMethod: r.method ?? doc.method, published: true, notes: `Imported from ${filename}` };
        if (existing) tx.update(cdsDataset).set(values).where(eq(cdsDataset.id, existing.id)).run();
        else tx.insert(cdsDataset).values(values).run();
        result.imported++;
      }
    }
  });
  return result;
}
