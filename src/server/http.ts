import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppUrl } from "@/config/deployment";
import { ApiError } from "./errors";
import { errorName, logger } from "./logger";
import { getUserFromHeaders, type AppUser } from "./session";

export { ApiError };

const NO_STORE = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

export function jsonResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { ...NO_STORE, ...extraHeaders } });
}

export function errorResponse(status: number, code: string, details?: Record<string, string | number>) {
  return jsonResponse({ error: { code, ...(details ? { details } : {}) } }, status);
}

/**
 * Reject cross-site state-changing requests. Browsers always send Origin on POST/PATCH/DELETE,
 * so a mismatched Origin means the request came from another site.
 */
export function assertSameOrigin(request: Request) {
  if (request.method === "GET" || request.method === "HEAD") return;
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    throw new ApiError(403, "cross_site_request");
  }
  if (!origin) return;
  const allowed = new Set([new URL(getAppUrl()).origin]);
  const host = request.headers.get("host");
  if (host && process.env.NODE_ENV !== "production") {
    allowed.add(`http://${host}`);
    allowed.add(`https://${host}`);
  }
  if (!allowed.has(origin)) throw new ApiError(403, "cross_site_request");
}

export async function requireApiUser(request: Request): Promise<AppUser> {
  const current = await getUserFromHeaders(request.headers);
  if (!current) throw new ApiError(401, "unauthenticated");
  return current;
}

const MAX_BODY_BYTES = 256 * 1024;

export async function parseJson<T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T>> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) throw new ApiError(413, "payload_too_large");
  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) throw new ApiError(413, "payload_too_large");
    raw = text ? JSON.parse(text) : {};
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, "invalid_json");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ApiError(400, "validation_failed", {
      field: issue?.path.join(".") || "body",
      reason: issue?.code ?? "invalid",
    });
  }
  return parsed.data;
}

type Handler<Ctx> = (request: Request, context: Ctx) => Promise<Response>;

/**
 * Wrap a route handler: same-origin check, uniform error mapping, and no stack traces or
 * provider errors in responses. Logs only the route and error class, never request bodies.
 */
export function apiRoute<Ctx>(route: string, handler: Handler<Ctx>): Handler<Ctx> {
  return async (request, context) => {
    try {
      assertSameOrigin(request);
      return await handler(request, context);
    } catch (error) {
      if (error instanceof ApiError) {
        return errorResponse(error.status, error.code, error.details);
      }
      logger.error("api.unhandled_error", { route, errorName: errorName(error) });
      return errorResponse(500, "internal_error");
    }
  };
}

export const uuidSchema = z.string().uuid();

export function assertUuid(value: string) {
  if (!uuidSchema.safeParse(value).success) throw new ApiError(404, "not_found");
  return value;
}
