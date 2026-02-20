import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Auth middleware for Focus Reader.
 *
 * Auth is enforced in route handlers (`withAuth`) where mode-specific
 * resolution happens (session/cf-access/api-key/single-user fallback).
 *
 * This middleware only performs a light presence check for common auth cookies
 * and bearer tokens; it intentionally does not validate credentials.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect API routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Check for app session / CF Access cookies or Authorization header
  const hasSession = request.cookies.has("fr_session");
  const hasCfAuth = request.cookies.has("CF_Authorization");
  const hasApiKey = request.headers
    .get("authorization")
    ?.startsWith("Bearer ");

  if (!hasSession && !hasCfAuth && !hasApiKey) {
    // Route handlers make the final auth decision.
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
