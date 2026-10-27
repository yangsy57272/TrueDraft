import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { brainstormNote } from "@/db/schema";
import { decryptJson, encryptJson } from "../crypto";
import { ApiError } from "../errors";
import { assertOwnedEssay } from "./essays";

export type BrainstormTurn = { role: "coach" | "student"; text: string };

/** Brainstorming conversations are only stored when the student explicitly clicks "Save notes". */
export async function saveBrainstormNote(userId: string, essayId: string, turns: BrainstormTurn[]) {
  await assertOwnedEssay(userId, essayId);
  const [row] = await db
    .insert(brainstormNote)
    .values({ essayId, encryptedContent: encryptJson({ turns }, "brainstorm_note") })
    .returning({ id: brainstormNote.id, createdAt: brainstormNote.createdAt });
  return row;
}

export async function listBrainstormNotes(userId: string, essayId: string) {
  await assertOwnedEssay(userId, essayId);
  const rows = await db
    .select()
    .from(brainstormNote)
    .where(eq(brainstormNote.essayId, essayId))
    .orderBy(desc(brainstormNote.createdAt));
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    turns: decryptJson<{ turns: BrainstormTurn[] }>(r.encryptedContent, "brainstorm_note").turns,
  }));
}

export async function deleteBrainstormNote(userId: string, essayId: string, noteId: string) {
  await assertOwnedEssay(userId, essayId);
  const removed = await db
    .delete(brainstormNote)
    .where(and(eq(brainstormNote.id, noteId), eq(brainstormNote.essayId, essayId)))
    .returning({ id: brainstormNote.id });
  if (removed.length === 0) throw new ApiError(404, "not_found");
}
