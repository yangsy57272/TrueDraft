import { ApiError, apiRoute, assertUuid, ndjsonStream, parseJson, requireApiUser } from "@/server/http";
import { executeAiRun, prepareAiRun } from "@/server/ai/run";
import { ESSAY_TOOL_KINDS, type EssayToolKind } from "@/server/ai/schemas";
import { aiRequestSchema } from "@/server/validation";

type Ctx = { params: Promise<{ id: string; kind: string }> };

export const maxDuration = 600;

/**
 * Run an AI tool. Validation, consent, and rate limits are checked first and return ordinary
 * HTTP errors. Then the response streams newline-delimited JSON events:
 *   {"type":"stage","stage":"structure","generatedChars":128} … {"type":"done","runId":"…","result":{…}}
 *   or {"type":"error","code":"ai_unavailable"}
 */
export const POST = apiRoute<Ctx>("ai.run", async (request, { params }) => {
  const user = await requireApiUser(request);
  const { id, kind } = await params;
  assertUuid(id);
  if (!(ESSAY_TOOL_KINDS as readonly string[]).includes(kind)) throw new ApiError(404, "not_found");
  const options = await parseJson(request, aiRequestSchema);
  const prepared = await prepareAiRun(user, id, kind as EssayToolKind, options);

  return ndjsonStream((onProgress) => executeAiRun(prepared, onProgress));
});
