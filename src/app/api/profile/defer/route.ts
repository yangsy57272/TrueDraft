import { z } from "zod";
import { apiRoute, jsonResponse, parseJson, requireApiUser } from "@/server/http";
import { DEFERRABLE_STEPS } from "@/lib/planning";
import { getProfile, saveProfile } from "@/server/services/profile";

/** "I'll do this later" for an optional journey step (e.g. exploring majors). */
export const PUT = apiRoute("profile.defer", async (request) => {
  const user = await requireApiUser(request);
  const { step, deferred } = await parseJson(request, z.object({ step: z.enum(DEFERRABLE_STEPS), deferred: z.boolean() }).strict());
  const profile = await getProfile(user.id);
  const others = profile.deferredSteps.filter((s) => s !== step);
  profile.deferredSteps = deferred ? [...others, step] : others;
  const saved = await saveProfile(user.id, profile);
  return jsonResponse({ deferredSteps: saved.deferredSteps });
});
