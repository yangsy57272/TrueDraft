import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { requirePageUser } from "@/server/session";
import { getProfile } from "@/server/services/profile";
import { aiFactsFor } from "@/server/ai-facts";
import { ProfileEditor } from "@/components/journey/ProfileEditor";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("profile.title"), robots: { index: false } };
}

export default async function ProfilePage() {
  const user = await requirePageUser();
  const { t } = await getT();
  const [profile, ai] = await Promise.all([getProfile(user.id), aiFactsFor(user.id)]);
  return (
    <div className="container-prose max-w-4xl py-10">
      <h1 className="text-3xl font-semibold">{t("profile.title")}</h1>
      <p className="mt-2 text-ink-soft">{t("profile.intro")}</p>
      <div className="mt-8">
        <ProfileEditor initial={profile} ai={ai} />
      </div>
    </div>
  );
}
