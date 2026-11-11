import { apiRoute, jsonResponse, parseJson } from "@/server/http";
import { connectionInput, connectionSummary, saveConnection } from "@/server/ai/connection-settings";
import { requireAiSettingsOwner } from "@/server/ai/connection-auth";
export const GET = apiRoute("settings.ai.read", async request => {
  await requireAiSettingsOwner(request);
  return jsonResponse({ connection: connectionSummary() });
});
export const PUT = apiRoute("settings.ai.save", async request => {
  await requireAiSettingsOwner(request);
  return jsonResponse({ connection: saveConnection(await parseJson(request, connectionInput)) });
});
