import "server-only";
import { notFound } from "next/navigation";
import { requirePageUser } from "./session";

/** Admin pages 404 for non-admins so their existence isn't advertised. */
export async function requireAdminPage() {
  const user = await requirePageUser();
  if (!user.isAdmin) notFound();
  return user;
}
