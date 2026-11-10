import { z } from "zod";
import { getPrivacyFacts } from "@/config/deployment";
import { ApiError, apiRoute, ndjsonStream, parseJson, requireAdmin } from "@/server/http";
import { extractCdsDraft, MAX_CDS_TEXT_CHARS } from "@/server/ai/planning";
import { ModelCallError } from "@/server/ai/run";
import { consumeRateLimit } from "@/server/rate-limit";

export const maxDuration = 600;

/** Admin-only: AI-assisted pre-fill of a CDS draft from pasted document text. Nothing is saved. */
export const POST = apiRoute("admin.cds.extract", async (request) => {
  const admin = await requireAdmin(request);
  if (!getPrivacyFacts().aiConfigured) throw new ApiError(503, "ai_not_configured");
  const { text } = await parseJson(request, z.object({ text: z.string().min(20).max(MAX_CDS_TEXT_CHARS) }));
  const limit = await consumeRateLimit(`ai:admin:${admin.id}`, 30, 3600);
  if (!limit.allowed) throw new ApiError(429, "rate_limited");
  return ndjsonStream(async (onProgress) => {
    try {
      return await extractCdsDraft(admin.id, text, onProgress);
    } catch (error) {
      throw new ApiError(502, error instanceof ModelCallError ? error.code : "ai_unavailable");
    }
  });
});
