import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { verifyPasscode } from "@/lib/passcode-store";
import { checkIPRateLimit, checkUserRateLimit } from "@/lib/rate-limit-middleware";
import { recordSuccessfulAction, blockEntity } from "@/lib/rate-limiting";
import { logAuditEvent } from "@/lib/audit";
import { getRealIP } from "@/lib/rate-limit-middleware";
import { getAppUserIdByEmail } from "@/lib/get-app-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth();
  const email = session?.user?.email;

  if (!email) {
    return NextResponse.json(
      { ok: false, error: "Not authenticated." },
      { status: 401 }
    );
  }

  // Resolve integer user ID from database.db using email
  const userId = getAppUserIdByEmail(email);

  // 1. IP-based rate limit (pass email for admin check)
  const ipCheck = await checkIPRateLimit(req, "verify_attempt", email);

  if (!ipCheck.allowed) {
    logAuditEvent({
      userId: userId || 0,
      action: "rate_limit.exceeded",
      resourceType: "passcode",
      details: { limitType: "ip", ip: ipCheck.ip, email },
    }).catch(console.error);

    return NextResponse.json(
      { ok: false, error: ipCheck.error },
      { status: 429, headers: ipCheck.headers }
    );
  }

  // 2. User-based rate limit
  const userCheck = await checkUserRateLimit(email, "verify_attempt");

  if (!userCheck.allowed) {
    logAuditEvent({
      userId: userId || 0,
      action: "rate_limit.exceeded",
      resourceType: "passcode",
      details: { limitType: "user", email },
    }).catch(console.error);

    return NextResponse.json(
      { ok: false, error: userCheck.error },
      { status: 429 }
    );
  }

  // Log if admin bypassed rate limit
  if (userCheck.isAdmin || ipCheck.isAdmin) {
    logAuditEvent({
      userId: userId || 0,
      action: "rate_limit.bypassed",
      resourceType: "passcode",
      details: { email, reason: "admin_user" },
    }).catch(console.error);
  }

  const body = await req.json().catch(() => null);
  const code = body?.code;

  if (!code || typeof code !== "string") {
    return NextResponse.json(
      { ok: false, error: "Passcode is required." },
      { status: 400, headers: ipCheck.headers }
    );
  }

  const result = verifyPasscode(email, code);

  if (!result.ok) {
    // Brute force escalation: block after repeated failures (unless admin)
    if (!userCheck.isAdmin && !ipCheck.isAdmin && userCheck.remainingAttempts !== undefined && userCheck.remainingAttempts <= 1) {
      blockEntity(getRealIP(req), "ip", "brute_force", 60, userId || undefined);

      logAuditEvent({
        userId: userId || 0,
        action: "user.blocked",
        resourceType: "session",
        details: {
          email,
          reason: "brute_force",
          ip: getRealIP(req),
          durationMinutes: 60,
        },
      }).catch(console.error);
    }

    return NextResponse.json(
      {
        ok: false,
        error: result.reason,
        remainingAttempts: userCheck.remainingAttempts,
      },
      { status: 400, headers: ipCheck.headers }
    );
  }

  // Success: clear rate limits for this identity
  recordSuccessfulAction(email, "verify_attempt");
  recordSuccessfulAction(email, "passcode_request");
  recordSuccessfulAction(getRealIP(req), "verify_attempt");

  logAuditEvent({
    userId: userId || 0,
    action: "passcode.verified",
    resourceType: "passcode",
    details: { email },
  }).catch(console.error);

  const res = NextResponse.json({ ok: true });

  res.cookies.set("passcode_verified", "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  return res;
}