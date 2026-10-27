import { ApiError, apiRoute, assertUuid, jsonResponse, requireApiUser } from "@/server/http";
import { getVersion } from "@/server/services/essays";

type Ctx = { params: Promise<{ id: string; n: string }> };

export const GET = apiRoute<Ctx>("versions.get", async (request, { params }) => {
  const user = await requireApiUser(request);
  const { id, n } = await params;
  assertUuid(id);
  const number = Number(n);
  if (!Number.isInteger(number) || number < 1) throw new ApiError(404, "not_found");
  const v = await getVersion(user.id, id, number);
  return jsonResponse({
    version: { id: v.id, versionNumber: v.versionNumber, wordCount: v.wordCount, versionNote: v.versionNote, createdAt: v.createdAt, content: v.content },
  });
});
