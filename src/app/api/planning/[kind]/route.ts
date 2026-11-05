import { z } from "zod";
import { FEEDBACK_LANGUAGES } from "@/i18n/config";
import { ApiError, apiRoute, ndjsonStream, parseJson, requireApiUser } from "@/server/http";
import { executePlanningRun, MAX_CV_CHARS, preparePlanningRun } from "@/server/ai/planning";
import { PLANNING_TOOL_KINDS, type PlanningToolKind } from "@/server/ai/schemas";

type Ctx = { params: Promise<{ kind: string }> };

export const maxDuration = 300;

const bodySchema = z.object({
  cvText: z.string().max(MAX_CV_CHARS + 1000).optional(),
  feedbackLanguage: z.enum(FEEDBACK_LANGUAGES).optional(),
});

/** Profile-level AI tools (Major Explorer, CV import). Streams NDJSON progress like the essay tools. */
export const POST = apiRoute<Ctx>("planning.run", async (request, { params }) => {
  const user = await requireApiUser(request);
  const { kind } = await params;
  if (!(PLANNING_TOOL_KINDS as readonly string[]).includes(kind)) throw new ApiError(404, "not_found");
  const input = await parseJson(request, bodySchema);
  const prepared = await preparePlanningRun(user, kind as PlanningToolKind, input);
  return ndjsonStream((stage) => executePlanningRun(prepared, stage));
});
