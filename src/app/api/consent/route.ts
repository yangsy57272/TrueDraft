import { apiRoute, jsonResponse, parseJson, requireApiUser } from "@/server/http";
import { getActiveConsent, grantConsent, withdrawConsent } from "@/server/services/consent";
import { getPolicyVersion } from "@/config/deployment";
import { consentSchema } from "@/server/validation";

export const GET = apiRoute("consent.get", async (request) => {
  const user = await requireApiUser(request);
  const active = await getActiveConsent(user.id, "ai_processing");
  return jsonResponse({
    aiProcessing: active ? { grantedAt: active.timestamp, policyVersion: active.policyVersion, current: active.policyVersion === getPolicyVersion() } : null,
  });
});

export const POST = apiRoute("consent.update", async (request) => {
  const user = await requireApiUser(request);
  const { consentType, action } = await parseJson(request, consentSchema);
  if (action === "grant") {
    const record = await grantConsent(user.id, consentType);
    return jsonResponse({ ok: true, grantedAt: record.timestamp, policyVersion: record.policyVersion });
  }
  await withdrawConsent(user.id, consentType);
  return jsonResponse({ ok: true });
});
