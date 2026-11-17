import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { requirePageUser } from "@/server/session";
import { getApplicationSchedule } from "@/server/services/application-schedule";
import { ApplicationHub } from "@/components/journey/ApplicationHub";
export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getT();
  return { title: locale === "zh-CN" ? "申请行动中心" : "Application action centre", robots: { index: false } };
}
export default async function ApplicationHubPage() {
  const user = await requirePageUser();
  const data = await getApplicationSchedule(user.id);
  return <ApplicationHub initial={{ schools: data.schools, plan: data.plan }} generatedAt={new Date().toISOString()} />;
}
