import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";
import { eq, sql } from "drizzle-orm";
import { closeDb, getDb } from "../src/db";
import { federalProfile, school } from "../src/db/schema";
import { SEED_SCHOOLS } from "../src/content/schools";

/**
 * Load data/scorecard/institutions.json (built from the official College Scorecard file by
 * scripts/build-scorecard-extract.ts) into the school directory:
 * - schools already in the directory are matched by IPEDS UNITID and keep their own names, links
 *   and CDS data; only their federal_profile row is refreshed;
 * - every other institution is added as a published school with its federal data.
 * Re-running is safe: it updates in place.
 */
type Institution = {
  unitid: string;
  name: string;
  city: string | null;
  state: string | null;
  control: "public" | "private";
  website: string | null;
  [key: string]: unknown;
};

function slugify(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

async function main() {
  const db = getDb();
  const doc = JSON.parse(readFileSync(path.join(process.cwd(), "data", "scorecard", "institutions.json"), "utf8")) as {
    fileDate: string;
    periods: Record<string, unknown>;
    institutions: Institution[];
  };

  // Make sure seeded schools carry their UNITID before matching.
  for (const s of SEED_SCHOOLS) {
    await db.update(school).set({ unitid: s.unitid }).where(eq(school.slug, s.slug));
  }

  const existing = await db.select({ id: school.id, slug: school.slug, unitid: school.unitid }).from(school);
  const byUnitid = new Map(existing.filter((s) => s.unitid).map((s) => [s.unitid!, s.id]));
  const slugs = new Set(existing.map((s) => s.slug));

  let added = 0;
  let refreshed = 0;
  for (const inst of doc.institutions) {
    const { unitid, name, city, state, control, website, ...values } = inst;
    const data = { ...values, periods: doc.periods };
    let schoolId = byUnitid.get(unitid);
    if (!schoolId) {
      let slug = slugify(name);
      if (slugs.has(slug)) slug = `${slug}-${(state ?? "us").toLowerCase()}`;
      if (slugs.has(slug)) slug = `${slug}-${unitid}`;
      slugs.add(slug);
      const [row] = await db
        .insert(school)
        .values({ slug, name, city, state, control, website, unitid, published: true })
        .returning({ id: school.id });
      schoolId = row.id;
      byUnitid.set(unitid, schoolId);
      added++;
    } else {
      refreshed++;
    }
    await db
      .insert(federalProfile)
      .values({ schoolId, unitid, fileDate: doc.fileDate, data })
      .onConflictDoUpdate({ target: federalProfile.schoolId, set: { unitid, fileDate: doc.fileDate, data, updatedAt: sql`now()` } });
  }
  console.log(`College Scorecard ${doc.fileDate}: ${added} schools added, ${refreshed} existing schools refreshed.`);
  await closeDb();
}

main().catch((error) => {
  console.error("Import failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
