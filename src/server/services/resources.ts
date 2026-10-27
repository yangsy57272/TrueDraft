import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { resource, type Resource } from "@/db/schema";
import { ApiError } from "../errors";
import { recordAudit } from "./audit";

/*
 * Educational resources live in their own table and knowledge collections. Student essays are
 * never written here. Third-party / licensed material must be placed in a separate collection
 * with its license recorded, and is only used for AI guidance when an administrator explicitly
 * enables `retrievalAllowed` after recording permission.
 */

import { LICENSE_STATUSES, RESOURCE_ACCESS, RESOURCE_CATEGORIES, RESOURCE_COLLECTIONS } from "@/lib/constants";
export { LICENSE_STATUSES, RESOURCE_ACCESS, RESOURCE_CATEGORIES, RESOURCE_COLLECTIONS };

export type ResourceViewer = { email: string } | null;

function restrictedAllowlist() {
  return (process.env.AUTHORIZED_RESOURCE_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function accessLevelsFor(viewer: ResourceViewer): string[] {
  if (!viewer) return ["public"];
  return restrictedAllowlist().includes(viewer.email.toLowerCase())
    ? ["public", "authenticated", "restricted"]
    : ["public", "authenticated"];
}

export async function listPublishedResources(viewer: ResourceViewer, language?: string) {
  const rows = await db
    .select()
    .from(resource)
    .where(and(eq(resource.published, true), inArray(resource.access, accessLevelsFor(viewer))))
    .orderBy(asc(resource.category), asc(resource.title));
  return language ? rows.filter((r) => r.language === language || r.language === "multi") : rows;
}

export async function getPublishedResource(viewer: ResourceViewer, slug: string) {
  const [row] = await db
    .select()
    .from(resource)
    .where(and(eq(resource.slug, slug), eq(resource.published, true), inArray(resource.access, accessLevelsFor(viewer))))
    .limit(1);
  return row ?? null;
}

/**
 * Guidance passages an administrator has approved for AI use. Returns nothing unless at least
 * one resource is published, has retrieval enabled, and is accessible to this student.
 */
export async function getRetrievalGuidance(viewer: { email: string }, categories: string[], maxChars = 6000) {
  const rows = await db
    .select()
    .from(resource)
    .where(
      and(
        eq(resource.published, true),
        eq(resource.retrievalAllowed, true),
        eq(resource.contentType, "article"),
        inArray(resource.access, accessLevelsFor(viewer)),
        inArray(resource.licenseStatus, ["original", "licensed"]),
      ),
    );
  const ranked = rows
    .map((r) => ({ r, score: categories.includes(r.category) ? 1 : 0 }))
    .sort((a, b) => b.score - a.score);
  const picked: { title: string; source: string; text: string }[] = [];
  let used = 0;
  for (const { r } of ranked) {
    if (used >= maxChars) break;
    const text = r.contentOrUrl.slice(0, Math.max(0, maxChars - used));
    used += text.length;
    picked.push({ title: r.title, source: r.source, text });
  }
  return picked;
}

/* ----------------------------- admin ------------------------------ */

export type ResourceInput = {
  slug: string;
  title: string;
  summary: string;
  contentOrUrl: string;
  contentType: "article" | "external_link";
  language: string;
  category: (typeof RESOURCE_CATEGORIES)[number];
  source: string;
  author: string;
  licenseStatus: (typeof LICENSE_STATUSES)[number];
  permissionNotes: string | null;
  collection: (typeof RESOURCE_COLLECTIONS)[number];
  access: (typeof RESOURCE_ACCESS)[number];
  retrievalAllowed: boolean;
  published: boolean;
};

function validateResourcePolicy(input: ResourceInput) {
  if (input.licenseStatus === "licensed" && !input.permissionNotes?.trim()) {
    throw new ApiError(400, "permission_notes_required");
  }
  if (input.licenseStatus === "licensed" && input.collection === "original") {
    throw new ApiError(400, "licensed_must_use_separate_collection");
  }
  if (input.retrievalAllowed && (input.contentType !== "article" || input.licenseStatus === "public_link")) {
    throw new ApiError(400, "retrieval_not_permitted_for_links");
  }
}

export async function adminListResources() {
  return db.select().from(resource).orderBy(asc(resource.collection), asc(resource.title));
}

export async function adminGetResource(id: string) {
  const [row] = await db.select().from(resource).where(eq(resource.id, id)).limit(1);
  if (!row) throw new ApiError(404, "not_found");
  return row;
}

export async function adminUpsertResource(adminUserId: string, id: string | null, input: ResourceInput): Promise<Resource> {
  validateResourcePolicy(input);
  try {
    if (id) {
      const [row] = await db.update(resource).set(input).where(eq(resource.id, id)).returning();
      if (!row) throw new ApiError(404, "not_found");
      await recordAudit(adminUserId, "admin_resource_changed", { action: "update", resourceId: row.id });
      return row;
    }
    const [row] = await db.insert(resource).values(input).returning();
    await recordAudit(adminUserId, "admin_resource_changed", { action: "create", resourceId: row.id });
    return row;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if ((error as { code?: string })?.code === "23505" || (error as { cause?: { code?: string } })?.cause?.code === "23505") {
      throw new ApiError(409, "slug_taken");
    }
    throw error;
  }
}

/** Removing a resource never touches student essays: they live in unrelated tables. */
export async function adminDeleteResource(adminUserId: string, id: string) {
  const removed = await db.delete(resource).where(eq(resource.id, id)).returning({ id: resource.id });
  if (removed.length === 0) throw new ApiError(404, "not_found");
  await recordAudit(adminUserId, "admin_resource_changed", { action: "delete", resourceId: id });
}
