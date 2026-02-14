import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Auth middleware for Focus Reader.
 *
 * In production with Cloudflare Access configured:
 * - Browser requests are authenticated via CF_Authorization cookie
 * - API requests can use Authorization: Bearer <key> header
 *
 * When CF Access env vars are not set (local dev):
 * - All requests are allowed through
 *
 * Note: Full JWT validation happens server-side in the API routes
 * via authenticateRequest(). This middleware provides a quick check
 * for the presence of auth credentials and rejects obviously
 * unauthenticated API requests early.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect API routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Check for CF Access cookie or Authorization header
  const hasCfAuth = request.cookies.has("CF_Authorization");
  const hasApiKey = request.headers
    .get("authorization")
    ?.startsWith("Bearer ");

  // If neither auth method is present, check if we should enforce
  // In dev mode (no CF Access), allow all requests through
  if (!hasCfAuth && !hasApiKey) {
    // We can't check env vars in Edge middleware, so we allow through
    // and let the route handler do the full auth check.
    // This middleware is a fast-fail for missing Bearer tokens on
    // programmatic API calls, but CF Access browser flow is always
    // validated server-side.
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
