import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/permissions";
import { getAppUserIdByEmail } from "@/lib/get-app-user";
import {
  getBlockedEntities,
  getRateLimitStats,
  blockEntity,
  unblockEntity,
  cleanupExpiredLimits,
} from "@/lib/rate-limiting";

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

  cleanupExpiredLimits();

  const blocked = getBlockedEntities();
  const stats = getRateLimitStats();

  return NextResponse.json({ ok: true, blocked, stats });
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
  const { identifier, type, reason, durationMinutes } = body || {};

  if (!identifier || !type) {
    return NextResponse.json(
      { ok: false, error: "identifier and type are required" },
      { status: 400 }
    );
  }

  blockEntity(
    identifier,
    type,
    reason || "manual_block",
    Number(durationMinutes) || 60,
    userId
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  const userId = getAppUserIdByEmail(session?.user?.email ?? "");

  if (!session?.user?.id || !isAdmin(userId)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const identifier = searchParams.get("identifier");

  if (!identifier) {
    return NextResponse.json(
      { ok: false, error: "identifier is required" },
      { status: 400 }
    );
  }

  const success = unblockEntity(identifier, userId);

  if (!success) {
    return NextResponse.json(
      { ok: false, error: "Entity not found or not blocked" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}
