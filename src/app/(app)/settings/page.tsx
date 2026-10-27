import type { Metadata } from "next";
import { getPolicyVersion } from "@/config/deployment";
import { getT } from "@/i18n/server";
import { requirePageUser } from "@/server/session";
import { getPrivacySettings } from "@/server/services/account";
import { getActiveConsent } from "@/server/services/consent";
import { SettingsClient } from "./SettingsClient";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("settings.title") };
}

export default async function SettingsPage() {
  const user = await requirePageUser();
  const { t } = await getT();
  const settings = await getPrivacySettings(user.id);
  const consent = await getActiveConsent(user.id, "ai_processing");
  return (
    <div className="container-prose py-10">
      <h1 className="text-3xl font-semibold">{t("settings.title")}</h1>
      <SettingsClient
        email={user.email}
        displayName={user.displayName}
        preferredLanguage={user.preferredLanguage}
        feedbackLanguage={user.feedbackLanguage}
        retention={settings.retentionPreference}
        consent={consent ? { grantedAt: consent.timestamp.toISOString(), policyVersion: consent.policyVersion, current: consent.policyVersion === getPolicyVersion() } : null}
      />
    </div>
  );
}
