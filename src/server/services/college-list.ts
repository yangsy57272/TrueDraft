import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { collegeListEntry, essay, school } from "@/db/schema";
import { DEFAULT_CHECKLIST, listEntryInputSchema, type ListEntryInput } from "@/lib/planning";
import { decryptText, encryptText } from "../crypto";
import { ApiError } from "../errors";

const MAX_ENTRIES = 40;

function validate(input: unknown, partial: boolean): Partial<ListEntryInput> {
  const schema = partial ? listEntryInputSchema.partial() : listEntryInputSchema;
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ApiError(400, "validation_failed", { field: issue?.path.join(".") || "entry", reason: issue?.code ?? "invalid" });
  }
  return parsed.data;
}

export function defaultChecklist() {
  return DEFAULT_CHECKLIST.map((key) => ({ id: randomUUID(), key, done: false }));
}

export async function listEntries(userId: string) {
  const rows = await db
    .select({ entry: collegeListEntry, school })
    .from(collegeListEntry)
    .leftJoin(school, eq(collegeListEntry.schoolId, school.id))
    .where(eq(collegeListEntry.userId, userId))
    .orderBy(asc(collegeListEntry.createdAt));
  const ids = rows.map((r) => r.entry.id);
  const essays = ids.length
    ? await db
        .select({ id: essay.id, title: essay.title, listEntryId: essay.listEntryId, status: essay.status, draftWordCount: essay.draftWordCount, wordLimit: essay.wordLimit })
        .from(essay)
        .where(and(eq(essay.userId, userId), inArray(essay.listEntryId, ids)))
    : [];
  return rows.map(({ entry, school: s }) => ({
    id: entry.id,
    schoolId: entry.schoolId,
    schoolSlug: s?.slug ?? null,
    schoolName: s?.name ?? entry.customSchoolName ?? "",
    schoolNameZh: s?.nameZh ?? null,
    category: entry.category,
    round: entry.round,
    platform: entry.platform,
    deadline: entry.deadline,
    intendedMajor: entry.intendedMajor,
    status: entry.status,
    notes: entry.encryptedNotes ? decryptText(entry.encryptedNotes, "list_notes") : "",
    checklist: entry.checklist,
    essays: essays.filter((e) => e.listEntryId === entry.id),
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  }));
}
export type ListEntryView = Awaited<ReturnType<typeof listEntries>>[number];

export async function addEntry(userId: string, input: unknown) {
  const data = validate(input, false) as ListEntryInput;
  if (!data.schoolId && !data.customSchoolName?.trim()) throw new ApiError(400, "school_required");
  const existing = await db.select({ id: collegeListEntry.id }).from(collegeListEntry).where(eq(collegeListEntry.userId, userId));
  if (existing.length >= MAX_ENTRIES) throw new ApiError(409, "list_full");
  if (data.schoolId) {
    const [s] = await db.select({ id: school.id }).from(school).where(and(eq(school.id, data.schoolId), eq(school.published, true))).limit(1);
    if (!s) throw new ApiError(404, "not_found");
  }
  try {
    const [row] = await db
      .insert(collegeListEntry)
      .values({
        userId,
        schoolId: data.schoolId ?? null,
        customSchoolName: data.schoolId ? null : data.customSchoolName!.trim(),
        category: data.category,
        round: data.round,
        platform: data.platform ?? null,
        deadline: data.deadline ?? null,
        intendedMajor: data.intendedMajor ?? null,
        status: data.status,
        encryptedNotes: data.notes ? encryptText(data.notes, "list_notes") : null,
        checklist: data.checklist ?? defaultChecklist(),
      })
      .returning({ id: collegeListEntry.id });
    return row;
  } catch (error) {
    const e = error as { code?: string; cause?: { code?: string } };
    if (e?.code === "23505" || e?.cause?.code === "23505") throw new ApiError(409, "already_on_list");
    throw error;
  }
}

export async function updateEntry(userId: string, entryId: string, input: unknown) {
  const data = validate(input, true);
  const values: Partial<typeof collegeListEntry.$inferInsert> = {};
  if (data.category !== undefined) values.category = data.category;
  if (data.round !== undefined) values.round = data.round;
  if (data.platform !== undefined) values.platform = data.platform ?? null;
  if (data.deadline !== undefined) values.deadline = data.deadline ?? null;
  if (data.intendedMajor !== undefined) values.intendedMajor = data.intendedMajor ?? null;
  if (data.status !== undefined) values.status = data.status;
  if (data.checklist !== undefined) values.checklist = data.checklist;
  if (data.customSchoolName !== undefined && data.customSchoolName) values.customSchoolName = data.customSchoolName.trim();
  if (data.notes !== undefined) values.encryptedNotes = data.notes ? encryptText(data.notes, "list_notes") : null;
  const updated = await db
    .update(collegeListEntry)
    .set(values)
    .where(and(eq(collegeListEntry.id, entryId), eq(collegeListEntry.userId, userId)))
    .returning({ id: collegeListEntry.id });
  if (!updated.length) throw new ApiError(404, "not_found");
}

export async function removeEntry(userId: string, entryId: string) {
  const removed = await db
    .delete(collegeListEntry)
    .where(and(eq(collegeListEntry.id, entryId), eq(collegeListEntry.userId, userId)))
    .returning({ id: collegeListEntry.id });
  if (!removed.length) throw new ApiError(404, "not_found");
}

/** Validate that a list entry belongs to the user (used when linking an essay to a school). */
export async function assertOwnedEntry(userId: string, entryId: string) {
  const [row] = await db
    .select({ id: collegeListEntry.id })
    .from(collegeListEntry)
    .where(and(eq(collegeListEntry.id, entryId), eq(collegeListEntry.userId, userId)))
    .limit(1);
  if (!row) throw new ApiError(404, "not_found");
}

export async function listedSchoolIds(userId: string) {
  const rows = await db.select({ schoolId: collegeListEntry.schoolId }).from(collegeListEntry).where(eq(collegeListEntry.userId, userId));
  return new Set(rows.map((r) => r.schoolId).filter(Boolean) as string[]);
}
