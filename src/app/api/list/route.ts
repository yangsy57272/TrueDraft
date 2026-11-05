import { z } from "zod";
import { limits } from "@/config/deployment";
import { ApiError, apiRoute, jsonResponse, parseJson, requireApiUser } from "@/server/http";
import { consumeRateLimit } from "@/server/rate-limit";
import { addEntry, listEntries } from "@/server/services/college-list";

export const GET = apiRoute("list.get", async (request) => {
  const user = await requireApiUser(request);
  return jsonResponse({ entries: await listEntries(user.id) });
});

export const POST = apiRoute("list.add", async (request) => {
  const user = await requireApiUser(request);
  const limit = await consumeRateLimit(`write:${user.id}`, limits.writesPerMinute, 60);
  if (!limit.allowed) throw new ApiError(429, "rate_limited");
  const body = await parseJson(request, z.record(z.string(), z.unknown()));
  const entry = await addEntry(user.id, body);
  return jsonResponse({ id: entry.id, entry }, 201);
});
