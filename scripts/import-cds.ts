import "dotenv/config";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { cdsDataset, school } from "../src/db/schema";
import { isInstitutionalSource, validateCdsData } from "../src/server/services/schools";

/**
 * Import reviewed CDS datasets from data/cds/*.json (values + the source line each came from).
 * Every record passes the same validation as admin entry; records that fail are reported and skipped.
 * Usage: npm run cds:import
 */
type Record_ = {
  slug: string;
  academicYear: string;
  sourceUrl: string;
  sourcePageRef?: string;
  sourceExceptionReason?: string;
  data: Record<string, unknown>;
};

async function main() {
  const db = getDb();
  const dir = path.join(process.cwd(), "data", "cds");
  let imported = 0;
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const doc = JSON.parse(readFileSync(path.join(dir, file), "utf8")) as { method: string; extractedOn: string; records: Record_[] };
    for (const r of doc.records) {
      const [s] = await db.select().from(school).where(eq(school.slug, r.slug)).limit(1);
      if (!s) {
        console.warn(`skip ${r.slug}: school not in directory`);
        continue;
      }
      const institutional = isInstitutionalSource(r.sourceUrl, s);
      if (!institutional && !r.sourceExceptionReason) {
        console.warn(`skip ${r.slug}: source is off the institution's domain and no reviewed exception is recorded`);
        continue;
      }
      let data;
      try {
        data = validateCdsData(r.data);
      } catch (error) {
        console.warn(`skip ${r.slug}: invalid data (${(error as { details?: { field?: string } }).details?.field ?? "unknown"})`);
        continue;
      }
      const values = {
        schoolId: s.id,
        academicYear: r.academicYear,
        sourceUrl: r.sourceUrl,
        sourcePageRef: r.sourcePageRef ?? null,
        sourceDomainException: !institutional,
        sourceExceptionReason: institutional ? null : r.sourceExceptionReason!,
        data,
        verificationStatus: "verified",
        verifiedAt: new Date(`${doc.extractedOn}T00:00:00Z`),
        verifiedBy: null,
        verificationMethod: doc.method,
        published: true,
        notes: `Imported from ${file}`,
      };
      const [existing] = await db
        .select({ id: cdsDataset.id })
        .from(cdsDataset)
        .where(and(eq(cdsDataset.schoolId, s.id), eq(cdsDataset.academicYear, r.academicYear)))
        .limit(1);
      if (existing) await db.update(cdsDataset).set(values).where(eq(cdsDataset.id, existing.id));
      else await db.insert(cdsDataset).values(values);
      imported += 1;
      console.log(`imported ${r.slug} ${r.academicYear} (${Object.keys(data).length} fields)`);
    }
  }
  console.log(`Done: ${imported} datasets.`);
  await closeDb();
}

main().catch((error) => {
  console.error("CDS import failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
