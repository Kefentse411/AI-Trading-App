import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/permissions";
import { getAppUserIdByEmail } from "@/lib/get-app-user";
import { getDb } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = getAppUserIdByEmail(session?.user?.email ?? "");

  if (!session?.user?.id || !isAdmin(userId)) {
    await logAuditEvent({
      userId: userId || 0,
      action: "permission.denied",
      resourceType: "user",
      details: { attemptedAction: "role_update" },
    });

    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 403 }
    );
  }

  const { id } = await params;
  const targetUserId = Number(id);
  const body = await req.json().catch(() => null);
  const { role_id } = body;

  if (!role_id || typeof role_id !== "number") {
    return NextResponse.json(
      { ok: false, error: "role_id is required" },
      { status: 400 }
    );
  }

  const db = getDb();

  const role = db.prepare("SELECT * FROM roles WHERE id = ?").get(role_id) as any;
  if (!role) {
    return NextResponse.json(
      { ok: false, error: "Role not found" },
      { status: 404 }
    );
  }

  const targetUser = db.prepare(`
    SELECT u.*, r.name as current_role
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = ?
  `).get(targetUserId) as any;

  if (!targetUser) {
    return NextResponse.json(
      { ok: false, error: "User not found" },
      { status: 404 }
    );
  }

  db.prepare(`
    UPDATE users
    SET role_id = ?, updated_at = strftime('%s', 'now')
    WHERE id = ?
  `).run(role_id, targetUserId);

  await logAuditEvent({
    userId,
    action: "user.role.updated",
    resourceType: "user",
    resourceId: targetUserId.toString(),
    details: {
      targetUserEmail: targetUser.email,
      previousRole: targetUser.current_role,
      newRole: role.name,
    },
  });

  const updatedUser = db.prepare(`
    SELECT
      u.id, u.email, u.name, u.image,
      r.id as role_id, r.name as role_name
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = ?
  `).get(targetUserId);

  return NextResponse.json({ ok: true, user: updatedUser });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = getAppUserIdByEmail(session?.user?.email ?? "");

  if (!session?.user?.id || !isAdmin(userId)) {
    await logAuditEvent({
      userId: userId || 0,
      action: "permission.denied",
      resourceType: "user",
      details: { attemptedAction: "user_deletion" },
    });

    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 403 }
    );
  }

  const { id } = await params;
  const targetUserId = Number(id);

  if (targetUserId === userId) {
    return NextResponse.json(
      { ok: false, error: "You cannot delete your own account" },
      { status: 400 }
    );
  }

  const db = getDb();

  const targetUser = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(targetUserId) as any;

  if (!targetUser) {
    return NextResponse.json(
      { ok: false, error: "User not found" },
      { status: 404 }
    );
  }

  db.prepare(
    "DELETE FROM passcodes WHERE email = (SELECT email FROM users WHERE id = ?)"
  ).run(targetUserId);

  db.prepare("DELETE FROM users WHERE id = ?").run(targetUserId);

  await logAuditEvent({
    userId,
    action: "user.deleted",
    resourceType: "user",
    resourceId: targetUserId.toString(),
    details: {
      deletedUserEmail: targetUser.email,
      deletedUserName: targetUser.name,
    },
  });

  return NextResponse.json({ ok: true });
}
