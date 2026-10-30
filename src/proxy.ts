import { NextRequest, NextResponse } from "next/server";

/**
 * Next.js 16 "proxy" runs on the Edge runtime.
 * DO NOT import Node-only modules here (better-sqlite3, fs, etc.)
 *
 * We intentionally do NOT enforce auth here.
 * Dashboard access control already happens in server layouts/pages (Node runtime).
 * This also prevents /api/* being redirected to /login.
 */
export default function proxy(_req: NextRequest) {
  return NextResponse.next();
}

/**
 * Apply to all routes (including /api) but do nothing.
 * If you later want to add edge headers, do it here.
 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
