import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { getAppUserIdByEmail } from "@/lib/get-app-user";
import { magicLinks, magicRateLimits } from "@/db/schema";
import { gte, sql, count, eq, and } from "drizzle-orm";

async function isAdmin(session: any): Promise<boolean> {
  const { isAdmin: checkAdmin } = await import("@/lib/permissions");
  return checkAdmin(getAppUserIdByEmail(session?.user?.email ?? ""));
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !(await isAdmin(session))) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const now = Date.now();
    const intervals = {
      "1h": now - 60 * 60 * 1000,
      "6h": now - 6 * 60 * 60 * 1000,
      "24h": now - 24 * 60 * 60 * 1000,
      "7d": now - 7 * 24 * 60 * 60 * 1000,
    };

    const stats: Record<string, any> = {};

    for (const [period, timestamp] of Object.entries(intervals)) {
      const timestampDate = new Date(timestamp);

      const [linksResult] = await db
        .select({ count: count() })
        .from(magicLinks)
        .where(gte(magicLinks.createdAt, timestampDate));

      const [usedResult] = await db
        .select({ count: count() })
        .from(magicLinks)
        .where(
          and(
            gte(magicLinks.createdAt, timestampDate),
            eq(magicLinks.used, true)
          )
        );

      const [rateLimitResult] = await db
        .select({ count: count() })
        .from(magicRateLimits)
        .where(gte(magicRateLimits.windowStart, timestampDate));

      stats[period] = {
        created: linksResult.count,
        used: usedResult.count,
        rateLimitHits: rateLimitResult.count,
        successRate:
          linksResult.count > 0
            ? Math.round((usedResult.count / linksResult.count) * 100)
            : 0,
      };
    }

    const systemMetrics = {
      timestamp: now,
      uptime: Math.round(process.uptime()),
      memoryUsage: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
      },
      nodeVersion: process.version,
    };

    const oneHourAgoDate = new Date(intervals["1h"]);
    const recentRateLimits = await db
      .select()
      .from(magicRateLimits)
      .where(gte(magicRateLimits.windowStart, oneHourAgoDate));

    const ipActivity: Record<string, number> = {};
    const emailActivity: Record<string, number> = {};

    recentRateLimits.forEach((limit) => {
      if (limit.type === "ip") {
        ipActivity[limit.identifier] =
          (ipActivity[limit.identifier] || 0) + (limit.count || 0);
      } else if (limit.type === "email") {
        emailActivity[limit.identifier] =
          (emailActivity[limit.identifier] || 0) + (limit.count || 0);
      }
    });

    const topIPs = Object.entries(ipActivity)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([ip, count]) => ({ ip, requests: count }));

    const topEmails = Object.entries(emailActivity)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([email, count]) => ({ email, requests: count }));

    const minutelyData = [];
    for (let i = 59; i >= 0; i--) {
      const minuteStart = now - i * 60 * 1000;
      const minuteEnd = minuteStart + 60 * 1000;
      const minuteStartDate = new Date(minuteStart);

      const [recentLinks] = await db
        .select({ count: count() })
        .from(magicLinks)
        .where(
          and(
            gte(magicLinks.createdAt, minuteStartDate),
            sql`${magicLinks.createdAt} < ${minuteEnd}`
          )
        );

      const [recentRates] = await db
        .select({ count: count() })
        .from(magicRateLimits)
        .where(
          and(
            gte(magicRateLimits.windowStart, minuteStartDate),
            sql`${magicRateLimits.windowStart} < ${minuteEnd}`
          )
        );

      minutelyData.push({
        timestamp: minuteStart,
        magicLinks: recentLinks?.count || 0,
        rateLimitHits: recentRates?.count || 0,
      });
    }

    return NextResponse.json({
      periods: stats,
      system: systemMetrics,
      activity: { topIPs, topEmails },
      realtime: minutelyData,
      lastUpdated: now,
    });
  } catch (error) {
    console.error("[AdminMagicLinksStats] GET error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !(await isAdmin(session))) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    return GET(request);
  } catch (error) {
    console.error("[AdminMagicLinksStats] POST error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
