import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { school, schoolSupplements } from "@/db/schema";
import type { SupplementFile } from "@/lib/supplements";

/** Replace this cycle's public catalog atomically, preserving all applicant records. */
export function importSupplements(doc: SupplementFile) {
  return getDb().transaction((tx) => {
    const rows = tx.select({ id: school.id, unitid: school.unitid }).from(school).all();
    const byUnitid = new Map(rows.map((row) => [row.unitid, row.id]));
    let imported = 0;
    const missing: string[] = [];
    for (const entry of doc.schools) {
      let schoolId = entry.unitid ? byUnitid.get(entry.unitid) : undefined;
      if (!entry.unitid && entry.slug) {
        tx.insert(school).values({
          slug: entry.slug, name: entry.directoryName, published: true,
          website: entry.sourceUrl ? new URL(entry.sourceUrl).origin : null,
        }).onConflictDoNothing({ target: school.slug }).run();
        schoolId = tx.select({ id: school.id }).from(school).where(eq(school.slug, entry.slug)).get()?.id;
      }
      if (!schoolId) {
        missing.push(entry.directoryName);
        continue;
      }
      const values = {
        status: entry.status, sourceUrl: entry.sourceUrl, guideUrl: entry.guideUrl,
        prompts: entry.prompts, verification: entry.verification ?? null,
        listUpdated: doc.compiledListUpdated, importedAt: new Date(),
      };
      tx.insert(schoolSupplements).values({ schoolId, cycle: doc.cycle, ...values })
        .onConflictDoUpdate({ target: [schoolSupplements.schoolId, schoolSupplements.cycle], set: values }).run();
      imported++;
    }
    if (missing.length) throw new Error(`School catalog is incomplete. Run scorecard:import first. Missing: ${missing.join(", ")}`);
    return { imported, missing };
  });
}
