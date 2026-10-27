import { ApiError, apiRoute, assertUuid, parseJson, requireApiUser } from "@/server/http";
import { executeAiRun, prepareAiRun } from "@/server/ai/run";
import { SCHEMAS, type ToolKind } from "@/server/ai/schemas";
import { aiRequestSchema } from "@/server/validation";

type Ctx = { params: Promise<{ id: string; kind: string }> };

export const maxDuration = 300;

/**
 * Run an AI tool. Validation, consent, and rate limits are checked first and return ordinary
 * HTTP errors. Then the response streams newline-delimited JSON events:
 *   {"type":"stage","stage":"structure"} … {"type":"done","runId":"…","result":{…}}
 *   or {"type":"error","code":"ai_unavailable"}
 */
export const POST = apiRoute<Ctx>("ai.run", async (request, { params }) => {
  const user = await requireApiUser(request);
  const { id, kind } = await params;
  assertUuid(id);
  if (!(kind in SCHEMAS)) throw new ApiError(404, "not_found");
  const options = await parseJson(request, aiRequestSchema);
  const prepared = await prepareAiRun(user, id, kind as ToolKind, options);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          // Client went away; the run still completes and is saved.
        }
      };
      try {
        const outcome = await executeAiRun(prepared, (stage) => send({ type: "stage", stage }));
        send({ type: "done", ...outcome });
      } catch (error) {
        const code = error instanceof ApiError ? error.code : "ai_unavailable";
        send({ type: "error", code });
      } finally {
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
      "X-Accel-Buffering": "no",
    },
  });
});
