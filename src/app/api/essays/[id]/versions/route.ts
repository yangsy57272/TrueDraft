import { limits } from "@/config/deployment";
import { ApiError, apiRoute, assertUuid, jsonResponse, parseJson, requireApiUser } from "@/server/http";
import { consumeRateLimit } from "@/server/rate-limit";
import { assertOwnedEssay, latestVersionMatching, listVersions, saveVersion } from "@/server/services/essays";
import { versionCreateSchema } from "@/server/validation";
import { track } from "@/server/analytics";

type Ctx = { params: Promise<{ id: string }> };

export const GET = apiRoute<Ctx>("versions.list", async (request, { params }) => {
  const user = await requireApiUser(request);
  const id = assertUuid((await params).id);
  return jsonResponse({ versions: await listVersions(user.id, id) });
});

export const POST = apiRoute<Ctx>("versions.create", async (request, { params }) => {
  const user = await requireApiUser(request);
  const id = assertUuid((await params).id);
  const limit = await consumeRateLimit(`write:${user.id}`, limits.writesPerMinute, 60);
  if (!limit.allowed) throw new ApiError(429, "rate_limited");
  const { content, note } = await parseJson(request, versionCreateSchema);
  await assertOwnedEssay(user.id, id);
  const existing = note ? null : await latestVersionMatching(id, content);
  if (existing) {
    return jsonResponse({ id: existing.id, versionNumber: existing.versionNumber, wordCount: existing.wordCount, createdAt: existing.createdAt, unchanged: true });
  }
  const version = await saveVersion(user.id, id, content, note ?? null);
  track("version_saved");
  return jsonResponse(
    { id: version.id, versionNumber: version.versionNumber, wordCount: version.wordCount, createdAt: version.createdAt },
    201,
  );
});
