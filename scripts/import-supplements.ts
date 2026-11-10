import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";
import { inArray, sql } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { school, schoolSupplements } from "../src/db/schema";
import { supplementFileSchema } from "../src/lib/supplements";

/**
 * Load data/supplements/<cycle>.json (default: the current cycle) into school_supplements.
 * Schools are matched by IPEDS UNITID, so run `npm run scorecard:import` first.
 * Re-running is safe: each school's row for the cycle is replaced.
 */
async function main() {
  const cycle = process.argv[2] ?? "2026-2027";
  const raw = JSON.parse(readFileSync(path.join(process.cwd(), "data", "supplements", `${cycle}.json`), "utf8"));
  const doc = supplementFileSchema.parse(raw);
  if (doc.cycle !== cycle) throw new Error(`file cycle ${doc.cycle} does not match ${cycle}`);
  const db = getDb();
  const unitids = [...new Set(doc.schools.map((s) => s.unitid))];
  const rows = await db.select({ id: school.id, unitid: school.unitid }).from(school).where(inArray(school.unitid, unitids));
  const byUnitid = new Map(rows.map((r) => [r.unitid!, r.id]));
  let imported = 0;
  const missing: string[] = [];
  for (const s of doc.schools) {
    const schoolId = byUnitid.get(s.unitid);
    if (!schoolId) {
      missing.push(`${s.directoryName} (${s.unitid})`);
      continue;
    }
    const values = { status: s.status, sourceUrl: s.sourceUrl, guideUrl: s.guideUrl, prompts: s.prompts, listUpdated: doc.compiledListUpdated, importedAt: new Date() };
    await db
      .insert(schoolSupplements)
      .values({ schoolId, cycle, ...values })
      .onConflictDoUpdate({ target: [schoolSupplements.schoolId, schoolSupplements.cycle], set: values });
    imported++;
  }
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(schoolSupplements);
  console.log(`Imported ${imported} schools for ${cycle} (${count} rows in total).`);
  if (missing.length) console.log(`Not in the directory (run scorecard:import first): ${missing.join(", ")}`);
  await closeDb();
}

main().catch(async (error) => {
  console.error(error);
  await closeDb();
  process.exit(1);
});
