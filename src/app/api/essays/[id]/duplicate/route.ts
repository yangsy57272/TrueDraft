import { apiRoute, assertUuid, jsonResponse, requireApiUser } from "@/server/http";
import { duplicateEssay } from "@/server/services/essays";
import { createTranslator } from "@/i18n/translate";

type Ctx = { params: Promise<{ id: string }> };

export const POST = apiRoute<Ctx>("essays.duplicate", async (request, { params }) => {
  const user = await requireApiUser(request);
  const id = assertUuid((await params).id);
  const { t } = createTranslator(user.preferredLanguage);
  const copy = await duplicateEssay(user.id, id, t("dashboard.copyPrefix"));
  return jsonResponse({ id: copy.id }, 201);
});
