import { NextRequest, NextResponse } from "next/server";
import { validateInviteCode } from "@/lib/invites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, email } = body;

    if (!code) {
      return NextResponse.json(
        { ok: false, error: "Invite code is required" },
        { status: 400 }
      );
    }

    const result = validateInviteCode(code);

    if (!result.valid) {
      return NextResponse.json(
        { ok: false, error: result.reason },
        { status: 400 }
      );
    }

    // Store the validated invite in session/cookie for the auth callback
    const response = NextResponse.json({
      ok: true,
      invite: {
        code: result.invite?.code,
        role: result.invite?.role_name,
        expires: result.invite?.expires_at,
      },
    });

    // Set a temporary cookie with the invite code
    response.cookies.set("pending_invite", code, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Error validating invite:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to validate invite" },
      { status: 500 }
    );
  }
}