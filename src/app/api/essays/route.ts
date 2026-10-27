import { apiRoute, jsonResponse, parseJson, requireApiUser } from "@/server/http";
import { createEssay, listEssays } from "@/server/services/essays";
import { recordAudit } from "@/server/services/audit";
import { essayCreateSchema } from "@/server/validation";
import { track } from "@/server/analytics";

export const GET = apiRoute("essays.list", async (request) => {
  const user = await requireApiUser(request);
  return jsonResponse({ essays: await listEssays(user.id) });
});

export const POST = apiRoute("essays.create", async (request) => {
  const user = await requireApiUser(request);
  const input = await parseJson(request, essayCreateSchema);
  const essay = await createEssay(user.id, input);
  await recordAudit(user.id, "essay_created", { essayId: essay.id });
  track("essay_created", { applicationType: input.applicationType, language: input.feedbackLanguage });
  return jsonResponse({ id: essay.id }, 201);
});
