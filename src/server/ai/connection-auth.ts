import "server-only";
import { ApiError, requireApiUser } from "../http";
import { aiSettingsEditable } from "./connection-settings";
export async function requireAiSettingsOwner(request: Request) {
  const user = await requireApiUser(request);
  if (!aiSettingsEditable() || user.email.toLowerCase() !== process.env.TRUEDRAFT_DESKTOP_EMAIL?.toLowerCase()) throw new ApiError(403, "forbidden");
  return user;
}
