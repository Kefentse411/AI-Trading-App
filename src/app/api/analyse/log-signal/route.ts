import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { signalHistory } from "@/db/schema";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { symbol, direction, confidence, entryPrice, targetPrice, stopLoss } = body;

  if (!symbol || !direction || confidence == null || entryPrice == null || targetPrice == null || stopLoss == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const db = getDb();
    const appUser = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(session.user.email) as { id: number } | undefined;

    if (!appUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // NOTE: adjust to your actual drizzle db instance/insert call —
    // getDb() here looks like it returns a raw better-sqlite3 handle
    // based on the layout.tsx usage (db.prepare(...).get(...)), so
    // I'm using the same raw-statement style rather than assuming
    // a separate drizzle client exists. Point me at the drizzle
    // client import if one exists and I'll switch this to db.insert(signalHistory)...
    db.prepare(
      `INSERT INTO signal_history
        (user_id, symbol, direction, confidence, entry_price, target_price, stop_loss)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(appUser.id, symbol, direction, confidence, entryPrice, targetPrice, stopLoss);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[log-signal] Failed to insert signal history:", error);
    return NextResponse.json({ error: "Failed to log signal" }, { status: 500 });
  }
}