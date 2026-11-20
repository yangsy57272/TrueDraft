import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { DemoExperience } from "@/components/showcase/DemoExperience";
export const metadata: Metadata = { title: "Interactive demo", description: "Explore a fictional TrueDraft application journey without signing in or making an AI request." };
export default async function DemoPage() {
  const { locale } = await getT();
  return <DemoExperience initialLocale={locale} />;
}
