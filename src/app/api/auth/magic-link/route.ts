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

    // Get client IP from headers
    const clientIP = 
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') ||
      'unknown';

    const userAgent = request.headers.get('user-agent') || 'unknown';

    const db = getDb();

    // Check rate limiting (max 5 requests per hour per IP)
    const hourStart = Date.now() - 1000 * 60 * 60;
    const recentRequests = db
      .prepare(
        `SELECT COUNT(*) as count FROM magic_links 
         WHERE client_ip = ? AND created_at > ?`
      )
      .get(clientIP, hourStart) as any;

    if (recentRequests.count >= 5) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // Create magic link token
    const token = Math.random().toString(36).substring(2, 15) + 
                  Math.random().toString(36).substring(2, 15);
    
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    db.prepare(
      `INSERT INTO magic_links (email, token, expires_at, client_ip, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      email,
      token,
      expiresAt.toISOString(),
      clientIP,
      userAgent,
      new Date().toISOString()
    );

    // In production, send email here
    console.log(`Magic link for ${email}: ${token}`);

    return NextResponse.json({
      success: true,
      message: "Check your email for the magic link",
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

    const now = new Date();
    const expiresAt = new Date(link.expires_at);

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
