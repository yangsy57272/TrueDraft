import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic redirect for private pages when no session cookie exists. This is only a UX
 * shortcut: every private page and API route still verifies the session on the server.
 */
const PRIVATE_PREFIXES = ["/dashboard", "/essays", "/settings", "/library", "/admin"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }
  const hasSession = request.cookies.getAll().some((c) => c.name.endsWith("td.session_token"));
  if (!hasSession) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/essays/:path*", "/settings/:path*", "/library/:path*", "/admin/:path*"],
};
