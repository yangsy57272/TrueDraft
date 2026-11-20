import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { DemoExperience } from "@/components/showcase/DemoExperience";
export const metadata: Metadata = { title: "Quality and evidence", description: "Reproducible fictional regression cases and explicit limits of TrueDraft's quality checks." };
export default async function QualityPage() {
  const { locale } = await getT();
  return <DemoExperience initialLocale={locale} initialStep="quality" />;
}
