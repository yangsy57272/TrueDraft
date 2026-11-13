import { z } from "zod";
import { apiRoute, ApiError, jsonResponse, parseJson, requireApiUser } from "@/server/http";
import { consumeRateLimit } from "@/server/rate-limit";
import { collectResearch } from "@/server/research/collect";
export const maxDuration = 90;
export const POST = apiRoute<{ params: Promise<{slug:string}> }>("school.research.sources", async (request,{params}) => {
  const user = await requireApiUser(request);
  const input = await parseJson(request,z.object({ program:z.string().trim().min(2).max(160), officialUrls:z.array(z.string().url().max(1800)).max(6).default([]) }));
  const limit = await consumeRateLimit(`research:${user.id}`,12,3600);
  if (!limit.allowed) throw new ApiError(429,"rate_limited");
  return jsonResponse(await collectResearch((await params).slug,input.program,input.officialUrls));
});
