import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { school } from "@/db/schema";
import institutions from "../../../data/global-schools.json";
/** Reference-only directory entries. Never fabricate U.S. CDS, ranks, odds, or fee currencies. */
export function importGlobalSchools() {
  const db = getDb();
  return db.transaction(tx => {
    for (const entry of institutions) tx.insert(school).values(entry).onConflictDoNothing({ target: school.slug }).run();
    // Earlier supplement-only inserts inherited the schema's US default for St Andrews.
    tx.update(school).set({country:"UK"}).where(and(eq(school.slug,"university-of-st-andrews"),eq(school.country,"US"),eq(school.name,"University of St Andrews"))).run();
    return institutions.length;
  });
}
