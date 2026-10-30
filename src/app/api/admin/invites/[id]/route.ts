import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/permissions";
import { getAppUserIdByEmail } from "@/lib/get-app-user";
import { deleteInvite, getInviteUsage } from "@/lib/invites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = getAppUserIdByEmail(session?.user?.email ?? "");

  if (!session?.user?.id || !isAdmin(userId)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 403 }
    );
  }

  const { id } = await params;
  const inviteId = Number(id);

  const usage = getInviteUsage(inviteId);
  return NextResponse.json({ ok: true, usage });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = getAppUserIdByEmail(session?.user?.email ?? "");

  if (!session?.user?.id || !isAdmin(userId)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 403 }
    );
  }

  const { id } = await params;
  const inviteId = Number(id);

  const success = deleteInvite(inviteId, userId);

  if (!success) {
    return NextResponse.json(
      { ok: false, error: "Invite not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}
