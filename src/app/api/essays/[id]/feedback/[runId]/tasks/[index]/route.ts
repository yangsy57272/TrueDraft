import { z } from "zod";
import { limits } from "@/config/deployment";
import { ApiError, apiRoute, assertUuid, jsonResponse, parseJson, requireApiUser } from "@/server/http";
import { consumeRateLimit } from "@/server/rate-limit";
import { setTaskState, TASK_STATES } from "@/server/services/feedback";

type Ctx = { params: Promise<{ id: string; runId: string; index: string }> };

/** Set the student's progress on one revision-plan task. */
export const PUT = apiRoute<Ctx>("feedback.task", async (request, { params }) => {
  const user = await requireApiUser(request);
  const { id, runId, index } = await params;
  const n = Number(index);
  if (!Number.isInteger(n) || n < 0 || n > 20) throw new ApiError(404, "not_found");
  const limit = await consumeRateLimit(`write:${user.id}`, limits.writesPerMinute, 60);
  if (!limit.allowed) throw new ApiError(429, "rate_limited");
  const { state } = await parseJson(request, z.object({ state: z.enum(TASK_STATES) }).strict());
  return jsonResponse({ taskStates: await setTaskState(user.id, assertUuid(id), assertUuid(runId), n, state) });
});
