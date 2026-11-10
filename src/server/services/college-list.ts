import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, isUniqueViolation } from "@/db";
import { collegeListEntry, essay, school } from "@/db/schema";
import { DEFAULT_CHECKLIST, MAX_CHECKLIST_ITEMS, listEntryInputSchema, listEntryPatchSchema, type ListEntryInput } from "@/lib/planning";
import { decryptText, encryptText } from "../crypto";
import { deadlineInputSchema, deadlinePatchSchema, MAX_DEADLINES, type Deadline } from "@/lib/deadlines";
import { ApiError } from "../errors";

const MAX_ENTRIES = 40;

function validate<T>(schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false; error: { issues: { path: PropertyKey[]; code: string }[] } } }, input: unknown): T {
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

export async function listEntries(userId: string, onlyId?: string) {
  const rows = await db
    .select({ entry: collegeListEntry, school })
    .from(collegeListEntry)
    .leftJoin(school, eq(collegeListEntry.schoolId, school.id))
    .where(onlyId ? and(eq(collegeListEntry.userId, userId), eq(collegeListEntry.id, onlyId)) : eq(collegeListEntry.userId, userId))
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
    deadlines: entry.deadlines as Deadline[],
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

/** One entry in the same shape as the list, so the client can replace its copy with it. */
export async function getEntryView(userId: string, entryId: string) {
  const [view] = await listEntries(userId, entryId);
  if (!view) throw new ApiError(404, "not_found");
  return view;
}

export async function addEntry(userId: string, input: unknown) {
  const data = validate<ListEntryInput>(listEntryInputSchema, input);
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
        intendedMajor: data.intendedMajor ?? null,
        status: data.status,
        encryptedNotes: data.notes ? encryptText(data.notes, "list_notes") : null,
        checklist: data.checklist ?? defaultChecklist(),
      })
      .returning({ id: collegeListEntry.id });
    return getEntryView(userId, row.id);
  } catch (error) {
    if (isUniqueViolation(error)) throw new ApiError(409, "already_on_list");
    throw error;
  }
}

export async function updateEntry(userId: string, entryId: string, input: unknown) {
  const data = validate(listEntryPatchSchema, input);
  const values: Partial<typeof collegeListEntry.$inferInsert> = {};
  if (data.category !== undefined) values.category = data.category;
  if (data.round !== undefined) values.round = data.round;
  if (data.platform !== undefined) values.platform = data.platform ?? null;
  if (data.intendedMajor !== undefined) values.intendedMajor = data.intendedMajor || null;
  if (data.status !== undefined) values.status = data.status;
  if (data.customSchoolName !== undefined && data.customSchoolName) values.customSchoolName = data.customSchoolName.trim();
  if (data.notes !== undefined) values.encryptedNotes = data.notes ? encryptText(data.notes, "list_notes") : null;
  if (Object.keys(values).length > 0) {
    const updated = await db
      .update(collegeListEntry)
      .set(values)
      .where(and(eq(collegeListEntry.id, entryId), eq(collegeListEntry.userId, userId)))
      .returning({ id: collegeListEntry.id });
    if (!updated.length) throw new ApiError(404, "not_found");
  }
  return getEntryView(userId, entryId);
}

type ChecklistItem = (typeof collegeListEntry.$inferSelect)["checklist"][number];

/** Change one entry's checklist in a write transaction, so concurrent operations never lose each other. */
async function mutateChecklist(userId: string, entryId: string, change: (items: ChecklistItem[]) => ChecklistItem[]) {
  await db.transaction((tx) => {
    const [row] = tx
      .select({ checklist: collegeListEntry.checklist })
      .from(collegeListEntry)
      .where(and(eq(collegeListEntry.id, entryId), eq(collegeListEntry.userId, userId)))
      .all();
    if (!row) throw new ApiError(404, "not_found");
    tx.update(collegeListEntry).set({ checklist: change(row.checklist) }).where(eq(collegeListEntry.id, entryId)).run();
  }, { behavior: "immediate" });
  return getEntryView(userId, entryId);
}

/** Set (not toggle) an item's state, so a retried request has the same effect. */
export function setChecklistItem(userId: string, entryId: string, itemId: string, done: boolean) {
  return mutateChecklist(userId, entryId, (items) => {
    if (!items.some((i) => i.id === itemId)) throw new ApiError(404, "not_found");
    return items.map((i) => (i.id === itemId ? { ...i, done } : i));
  });
}

export function addChecklistItem(userId: string, entryId: string, label: string, itemId: string = randomUUID()) {
  const clean = label.trim().slice(0, 80);
  if (!clean) throw new ApiError(400, "validation_failed", { field: "label", reason: "too_small" });
  return mutateChecklist(userId, entryId, (items) => {
    if (items.some((i) => i.id === itemId)) return items; // retried request
    if (items.length >= MAX_CHECKLIST_ITEMS) throw new ApiError(409, "checklist_full");
    return [...items, { id: itemId, key: null, label: clean, done: false }];
  });
}

/** Deadlines use the same transactional, per-item pattern as the checklist. */
async function mutateDeadlines(userId: string, entryId: string, change: (items: Deadline[]) => Deadline[]) {
  await db.transaction((tx) => {
    const [row] = tx
      .select({ deadlines: collegeListEntry.deadlines })
      .from(collegeListEntry)
      .where(and(eq(collegeListEntry.id, entryId), eq(collegeListEntry.userId, userId)))
      .all();
    if (!row) throw new ApiError(404, "not_found");
    tx.update(collegeListEntry).set({ deadlines: change(row.deadlines as Deadline[]) }).where(eq(collegeListEntry.id, entryId)).run();
  }, { behavior: "immediate" });
  return getEntryView(userId, entryId);
}

export function addDeadline(userId: string, entryId: string, input: unknown, itemId: string = randomUUID()) {
  const data = validate(deadlineInputSchema, input);
  return mutateDeadlines(userId, entryId, (items) => {
    if (items.some((d) => d.id === itemId)) return items; // retried request
    if (items.length >= MAX_DEADLINES) throw new ApiError(409, "deadlines_full");
    return [...items, { id: itemId, type: data.type, date: data.date, time: data.time ?? null, timeZone: data.timeZone, source: data.source || null, label: data.label || null, done: data.done }];
  });
}

export function updateDeadline(userId: string, entryId: string, deadlineId: string, input: unknown) {
  const patch = validate(deadlinePatchSchema, input);
  return mutateDeadlines(userId, entryId, (items) => {
    if (!items.some((d) => d.id === deadlineId)) throw new ApiError(404, "not_found");
    return items.map((d) =>
      d.id === deadlineId
        ? {
            ...d,
            ...(patch.type !== undefined && { type: patch.type }),
            ...(patch.date !== undefined && { date: patch.date }),
            ...(patch.time !== undefined && { time: patch.time ?? null }),
            ...(patch.timeZone !== undefined && { timeZone: patch.timeZone }),
            ...(patch.source !== undefined && { source: patch.source || null }),
            ...(patch.label !== undefined && { label: patch.label || null }),
            ...(patch.done !== undefined && { done: patch.done }),
          }
        : d,
    );
  });
}

export function removeDeadline(userId: string, entryId: string, deadlineId: string) {
  return mutateDeadlines(userId, entryId, (items) => items.filter((d) => d.id !== deadlineId));
}

export function removeChecklistItem(userId: string, entryId: string, itemId: string) {
  return mutateChecklist(userId, entryId, (items) => items.filter((i) => i.id !== itemId));
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
