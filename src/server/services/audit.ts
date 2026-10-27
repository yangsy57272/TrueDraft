import "server-only";
import { db } from "@/db";
import { auditEvent } from "@/db/schema";

export type AuditEventType =
  | "account_created"
  | "account_deleted"
  | "data_exported"
  | "essay_created"
  | "essay_deleted"
  | "essay_duplicated"
  | "feedback_deleted"
  | "consent_granted"
  | "consent_withdrawn"
  | "retention_changed"
  | "retention_purge"
  | "admin_resource_changed";

/** Record an audit event. Metadata must be identifiers/enums only — never essay or feedback text. */
export async function recordAudit(
  userId: string | null,
  eventType: AuditEventType,
  metadata: Record<string, string | number | boolean | null> = {},
) {
  await db.insert(auditEvent).values({ userId, eventType, metadata });
}
