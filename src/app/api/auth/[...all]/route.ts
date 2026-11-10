import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/server/auth";
import { isDesktopMode } from "@/config/production-guard";

const handler = toNextJsHandler(auth);
export const GET = handler.GET;

export function POST(request: Request) {
  if (isDesktopMode() && new URL(request.url).pathname.replace(/\/$/, "") === "/api/auth/sign-in/magic-link"
    && request.headers.get("x-truedraft-desktop-token") !== process.env.TRUEDRAFT_DESKTOP_TOKEN) {
    return new Response(null, { status: 403 });
  }
  return handler.POST(request);
}
