import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/permissions";
import { getAuditLogs, getAuditStats } from "@/lib/audit";
import { getAppUserIdByEmail } from "@/lib/get-app-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = getAppUserIdByEmail(session?.user?.email ?? "");

  if (!session?.user?.id || !isAdmin(userId)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);
  const offset = Number(searchParams.get("offset")) || 0;
  const action = searchParams.get("action") || undefined;
  const targetUserId = searchParams.get("userId")
    ? Number(searchParams.get("userId"))
    : undefined;
  const resourceType = searchParams.get("resourceType") || undefined;

  try {
    const logs = getAuditLogs({
      limit,
      offset,
      action: action as any,
      userId: targetUserId,
      resourceType: resourceType as any,
    });

    const stats = getAuditStats();

    return NextResponse.json({
      ok: true,
      logs,
      stats,
      pagination: {
        limit,
        offset,
        hasMore: logs.length === limit,
      },
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
