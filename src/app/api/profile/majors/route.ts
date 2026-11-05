import { randomUUID } from "node:crypto";
import { z } from "zod";
import { ApiError, apiRoute, jsonResponse, parseJson, requireApiUser } from "@/server/http";
import { getProfile, saveProfile } from "@/server/services/profile";

const addSchema = z.object({ name: z.string().trim().min(1).max(80), cipFamily: z.string().regex(/^\d{2}$/).nullish() });

/** Add a major to "Majors I'm considering". */
export const POST = apiRoute("profile.majors.add", async (request) => {
  const user = await requireApiUser(request);
  const { name, cipFamily } = await parseJson(request, addSchema);
  const profile = await getProfile(user.id);
  if (profile.intendedMajors.some((m) => m.name.toLowerCase() === name.toLowerCase())) {
    return jsonResponse({ majors: profile.intendedMajors });
  }
  if (profile.intendedMajors.length >= 8) throw new ApiError(409, "list_full");
  profile.intendedMajors.push({ id: randomUUID(), name, cipFamily: cipFamily ?? null });
  const saved = await saveProfile(user.id, profile);
  return jsonResponse({ majors: saved.intendedMajors }, 201);
});

export const DELETE = apiRoute("profile.majors.remove", async (request) => {
  const user = await requireApiUser(request);
  const { id } = await parseJson(request, z.object({ id: z.string().min(1).max(40) }));
  const profile = await getProfile(user.id);
  profile.intendedMajors = profile.intendedMajors.filter((m) => m.id !== id);
  const saved = await saveProfile(user.id, profile);
  return jsonResponse({ majors: saved.intendedMajors });
});
