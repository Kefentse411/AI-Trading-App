import { auth } from "@/auth";
import { getUserNotificationPreferences, updateNotificationPreferences } from "@/lib/notifications";
import { getAppUserIdByEmail } from "@/lib/get-app-user";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = getAppUserIdByEmail(session.user.email);

  if (!userId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const prefs = await getUserNotificationPreferences(userId);

  return NextResponse.json({
    preferences: prefs || {
      emailNotifications: true,
      smsNotifications: false,
      bullishSignals: true,
      bearishSignals: true,
      riskAlerts: true,
      minConfidenceThreshold: 0.5,
    },
  });
}

export async function PUT(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = getAppUserIdByEmail(session.user.email);

  if (!userId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = await req.json();

  const success = await updateNotificationPreferences(userId, body);

  if (success) {
    return NextResponse.json({ ok: true, message: "Preferences updated" });
  } else {
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}