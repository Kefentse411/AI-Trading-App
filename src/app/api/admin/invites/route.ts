import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/permissions";
import { getAppUserIdByEmail } from "@/lib/get-app-user";
import {
  getAllInvites,
  createInvite,
  getInviteStats,
  cleanupExpiredInvites,
  isInviteRequired,
  setInviteRequired,
} from "@/lib/invites";
import { getAllRoles } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const userId = getAppUserIdByEmail(session?.user?.email ?? "");

  if (!session?.user?.id || !isAdmin(userId)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 403 }
    );
  }

  cleanupExpiredInvites();

  const invites = getAllInvites();
  const stats = getInviteStats();
  const roles = getAllRoles();
  const inviteRequiredSetting = isInviteRequired();

  return NextResponse.json({
    ok: true,
    invites,
    stats,
    roles,
    inviteRequired: inviteRequiredSetting,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = getAppUserIdByEmail(session?.user?.email ?? "");

  if (!session?.user?.id || !isAdmin(userId)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const { action, maxUses, expiresInDays, roleId, notes, inviteRequired } =
    body || {};

  if (action === "toggle_requirement") {
    setInviteRequired(inviteRequired, userId);
    return NextResponse.json({ ok: true });
  }

  if (action === "create_invite") {
    const result = createInvite(userId, {
      maxUses: Number(maxUses) || 1,
      expiresInDays: Number(expiresInDays) || 7,
      roleId: Number(roleId) || 2,
      notes: notes || null,
    });

    return NextResponse.json({ ok: true, invite: result });
  }

  return NextResponse.json(
    { ok: false, error: "Invalid action" },
    { status: 400 }
  );
}
