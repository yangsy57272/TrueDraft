import "server-only";
import { getPrivacyFacts } from "@/config/deployment";
import { hasCurrentConsent } from "./services/consent";

/** The AI facts a client component needs to show privacy notes and the consent dialog. */
export async function aiFactsFor(userId: string) {
  const facts = getPrivacyFacts();
  return {
    configured: facts.aiConfigured,
    isMock: facts.aiIsMock,
    providerName: facts.providerDisplayName,
    noTrainingConfirmed: facts.providerNoTrainingConfirmed,
    consentCurrent: await hasCurrentConsent(userId, "ai_processing"),
  };
}
