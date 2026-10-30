import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const db = getDb();
    
    // Create magic link token
    const token = Math.random().toString(36).substring(2, 15);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour from now

    db.prepare(
      `INSERT INTO magic_links (email, token, expires_at, created_at)
       VALUES (?, ?, ?, ?)`
    ).run(email, token, expiresAt.getTime(), Date.now());

    return NextResponse.json({
      success: true,
      message: "Magic link sent",
      token, // For testing
    });
  } catch (error) {
    console.error("Magic link error:", error);
    return NextResponse.json(
      { error: "Failed to create magic link" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Check token validity
    const link = db
      .prepare("SELECT * FROM magic_links WHERE token = ?")
      .get(token) as any;

    if (!link) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    const now = Date.now();
    const expiresAt = typeof link.expires_at === "string" 
      ? new Date(link.expires_at).getTime() 
      : link.expires_at;

    if (now > expiresAt) {
      return NextResponse.json(
        { error: "Token expired" },
        { status: 401 }
      );
    }

    // Mark as used
    db.prepare("UPDATE magic_links SET used = 1 WHERE token = ?").run(token);

    return NextResponse.json({
      success: true,
      email: link.email,
      message: "Token is valid",
    });
  } catch (error) {
    console.error("Magic link verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify magic link" },
      { status: 500 }
    );
  }
}
