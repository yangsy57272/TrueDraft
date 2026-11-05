import { z } from "zod";
import { limits } from "@/config/deployment";
import { ApiError, apiRoute, assertUuid, jsonResponse, parseJson, requireApiUser } from "@/server/http";
import { consumeRateLimit } from "@/server/rate-limit";
import { removeDeadline, updateDeadline } from "@/server/services/college-list";

type Ctx = { params: Promise<{ id: string; deadlineId: string }> };

function assertItemId(value: string) {
  if (!/^[A-Za-z0-9-]{1,40}$/.test(value)) throw new ApiError(404, "not_found");
  return value;
}

export const PATCH = apiRoute<Ctx>("list.deadline.update", async (request, { params }) => {
  const user = await requireApiUser(request);
  const { id, deadlineId } = await params;
  const limit = await consumeRateLimit(`write:${user.id}`, limits.writesPerMinute, 60);
  if (!limit.allowed) throw new ApiError(429, "rate_limited");
  const body = await parseJson(request, z.record(z.string(), z.unknown()));
  return jsonResponse({ entry: await updateDeadline(user.id, assertUuid(id), assertItemId(deadlineId), body) });
});

export const DELETE = apiRoute<Ctx>("list.deadline.remove", async (request, { params }) => {
  const user = await requireApiUser(request);
  const { id, deadlineId } = await params;
  return jsonResponse({ entry: await removeDeadline(user.id, assertUuid(id), assertItemId(deadlineId)) });
});
