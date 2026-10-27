import { requirePageUser } from "@/server/session";

export const dynamic = "force-dynamic";

/** All pages in this group require a signed-in user (checked on the server for every request). */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requirePageUser();
  return <>{children}</>;
}
