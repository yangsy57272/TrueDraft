import { apiRoute, jsonResponse, parseJson, requireApiUser } from "@/server/http";
import { getProfile, saveProfile } from "@/server/services/profile";
import { z } from "zod";

export const GET = apiRoute("profile.get", async (request) => {
  const user = await requireApiUser(request);
  return jsonResponse({ profile: await getProfile(user.id) });
});

/** Replace the whole profile (validated and encrypted server-side). */
export const PUT = apiRoute("profile.save", async (request) => {
  const user = await requireApiUser(request);
  const { profile } = await parseJson(request, z.object({ profile: z.unknown() }));
  return jsonResponse({ profile: await saveProfile(user.id, profile) });
});
