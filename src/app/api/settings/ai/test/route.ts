import { ApiError, apiRoute, jsonResponse, parseJson } from "@/server/http";
import { consumeRateLimit } from "@/server/rate-limit";
import { requireAiSettingsOwner } from "@/server/ai/connection-auth";
import { connectionInput } from "@/server/ai/connection-settings";
import { testAiConnection } from "@/server/ai/connection-test";
import { z } from "zod";
export const maxDuration = 90;
export const POST = apiRoute("settings.ai.test", async request => {
  const user = await requireAiSettingsOwner(request);
  if (!(await consumeRateLimit(`ai:connection:${user.id}`, 12, 60)).allowed) throw new ApiError(429, "rate_limited");
  const { action, ...input } = await parseJson(request, connectionInput.extend({ action: z.enum(["models", "test"]) }));
  return jsonResponse(await testAiConnection(input, action));
});
