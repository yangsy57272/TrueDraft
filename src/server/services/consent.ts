import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { consentRecord } from "@/db/schema";
import { getPolicyVersion } from "@/config/deployment";
import { recordAudit } from "./audit";

/**
 * Consent types.
 * - ai_processing: required before any AI feedback; the student may withdraw it at any time
 *   (saving drafts keeps working without it).
 * There are deliberately no training or marketing consents in this version.
 */
export const CONSENT_TYPES = ["ai_processing"] as const;
export type ConsentType = (typeof CONSENT_TYPES)[number];

export async function getActiveConsent(userId: string, consentType: ConsentType) {
  const [row] = await db
    .select()
    .from(consentRecord)
    .where(
      and(
        eq(consentRecord.userId, userId),
        eq(consentRecord.consentType, consentType),
        eq(consentRecord.granted, true),
        isNull(consentRecord.withdrawalTimestamp),
      ),
    )
    .orderBy(desc(consentRecord.timestamp))
    .limit(1);
  return row ?? null;
}

/** True only when consent was granted for the CURRENT policy version and not withdrawn. */
export async function hasCurrentConsent(userId: string, consentType: ConsentType) {
  const active = await getActiveConsent(userId, consentType);
  return Boolean(active && active.policyVersion === getPolicyVersion());
}

export async function grantConsent(userId: string, consentType: ConsentType) {
  const policyVersion = getPolicyVersion();
  // Close out any older grant so there is exactly one active record.
  await db
    .update(consentRecord)
    .set({ withdrawalTimestamp: new Date() })
    .where(
      and(
        eq(consentRecord.userId, userId),
        eq(consentRecord.consentType, consentType),
        isNull(consentRecord.withdrawalTimestamp),
      ),
    );
  const [row] = await db
    .insert(consentRecord)
    .values({ userId, consentType, policyVersion, granted: true })
    .returning();
  await recordAudit(userId, "consent_granted", { consentType, policyVersion });
  return row;
}

export async function withdrawConsent(userId: string, consentType: ConsentType) {
  const updated = await db
    .update(consentRecord)
    .set({ withdrawalTimestamp: new Date() })
    .where(
      and(
        eq(consentRecord.userId, userId),
        eq(consentRecord.consentType, consentType),
        eq(consentRecord.granted, true),
        isNull(consentRecord.withdrawalTimestamp),
      ),
    )
    .returning({ id: consentRecord.id });
  if (updated.length > 0) await recordAudit(userId, "consent_withdrawn", { consentType });
  return updated.length;
}

export async function listConsents(userId: string) {
  return db
    .select({
      consentType: consentRecord.consentType,
      policyVersion: consentRecord.policyVersion,
      granted: consentRecord.granted,
      timestamp: consentRecord.timestamp,
      withdrawalTimestamp: consentRecord.withdrawalTimestamp,
    })
    .from(consentRecord)
    .where(eq(consentRecord.userId, userId))
    .orderBy(desc(consentRecord.timestamp));
}
