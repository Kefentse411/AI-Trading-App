import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  generatePasscode,
  getExistingValidPasscode,
  savePasscode,
} from "@/lib/passcode-store";
import { sendPasscodeEmail } from "@/lib/send-passcode-email";
import { checkIPRateLimit, checkUserRateLimit } from "@/lib/rate-limit-middleware";
import { logAuditEvent } from "@/lib/audit";
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
  const ipCheck = await checkIPRateLimit(req, "passcode_request", email);

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
  const userCheck = await checkUserRateLimit(email, "passcode_request");

  if (!userCheck.allowed) {
    logAuditEvent({
      userId: userId || 0,
      action: "rate_limit.exceeded",
      resourceType: "passcode",
      details: { limitType: "user", email },
    }).catch(console.error);

    return NextResponse.json(
      { ok: false, error: userCheck.error },
      { status: 429, headers: ipCheck.headers }
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

  // 3. Reuse existing valid code, otherwise generate
  let code = getExistingValidPasscode(email);

  if (!code) {
    code = generatePasscode();
    savePasscode(email, code);
  }

  const result = await sendPasscodeEmail({ to: email, code });

  logAuditEvent({
    userId: userId || 0,
    action: "passcode.sent",
    resourceType: "passcode",
    details: { email, provider: result.provider },
  }).catch(console.error);

  return NextResponse.json(
    {
      ok: true,
      provider: result.provider,
      devCode: result.devCode ?? null,
      remainingAttempts: userCheck.remainingAttempts,
    },
    { headers: ipCheck.headers }
  );
}