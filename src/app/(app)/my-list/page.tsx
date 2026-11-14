import Link from "next/link";
import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { requirePageUser } from "@/server/session";
import { listEntries } from "@/server/services/college-list";
import { CollegeList } from "@/components/journey/CollegeList";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("list.title"), robots: { index: false } };
}

export default async function MyListPage() {
  const user = await requirePageUser();
  const { t, locale } = await getT();
  const entries = await listEntries(user.id);
  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{t("list.title")}</h1>
          <p className="mt-2 max-w-3xl text-ink-soft">{t("list.intro")}</p>
        </div>
        <Link href="/my-list/plan" className="btn btn-primary">{locale === "zh-CN" ? "我的申请时间表" : "My application plan"}</Link>
        <Link href="/my-list/resources" className="btn btn-secondary">{locale === "zh-CN" ? "预算与录取分组" : "Budget & admission groups"}</Link>
        <Link href="/my-list/deadlines" className="btn btn-secondary">{t("journey.actions.track")}</Link>
      </div>
      <div className="mt-8">
        <CollegeList entries={entries.map(({ createdAt: _c, updatedAt: _u, ...rest }) => rest)} />
      </div>
    </div>
  );
}
