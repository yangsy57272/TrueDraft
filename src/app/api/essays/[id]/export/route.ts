import { apiRoute, assertUuid, requireApiUser } from "@/server/http";
import { getEssay } from "@/server/services/essays";
import { getRun, listRuns } from "@/server/services/feedback";
import { renderEssayExport } from "@/server/export";

type Ctx = { params: Promise<{ id: string }> };

export const GET = apiRoute<Ctx>("essays.export", async (request, { params }) => {
  const user = await requireApiUser(request);
  const id = assertUuid((await params).id);
  const format = new URL(request.url).searchParams.get("format") === "txt" ? "txt" : "md";
  const essay = await getEssay(user.id, id);
  const runs = await listRuns(user.id, id, "full_feedback");
  const latest = runs.find((r) => r.status === "completed");
  const feedback = latest ? await getRun(user.id, id, latest.id) : null;
  const body = renderEssayExport(essay, feedback, format, user.preferredLanguage);
  const filename = `essay-${id.slice(0, 8)}.${format}`;
  return new Response(body, {
    headers: {
      "Content-Type": format === "md" ? "text/markdown; charset=utf-8" : "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
});
