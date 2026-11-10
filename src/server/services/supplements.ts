import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { school, schoolSupplements } from "@/db/schema";
import { SUPPLEMENT_CYCLE } from "@/lib/supplements";

/** This cycle's supplemental essay prompts for one school, or null when none were imported. */
export async function getSupplements(schoolId: string, cycle = SUPPLEMENT_CYCLE) {
  const [row] = await db
    .select()
    .from(schoolSupplements)
    .where(and(eq(schoolSupplements.schoolId, schoolId), eq(schoolSupplements.cycle, cycle)))
    .limit(1);
  return row ?? null;
}

/** One prompt by school slug and order, for pre-filling a new essay. */
export async function getSupplementPrompt(slug: string, order: number) {
  const [row] = await db
    .select({ schoolId: school.id, schoolName: school.name, sourceUrl: schoolSupplements.sourceUrl, prompts: schoolSupplements.prompts, status: schoolSupplements.status })
    .from(schoolSupplements)
    .innerJoin(school, eq(school.id, schoolSupplements.schoolId))
    .where(and(eq(school.slug, slug), eq(school.published, true), eq(schoolSupplements.cycle, SUPPLEMENT_CYCLE)))
    .limit(1);
  if (!row || row.status !== "confirmed") return null;
  const prompt = row.prompts.find((p) => p.order === order);
  return prompt ? { schoolId: row.schoolId, schoolName: row.schoolName, sourceUrl: row.sourceUrl, prompt } : null;
}
