import { db } from "@/db";
import { magicRateLimits } from "@/db/schema";
import { eq, and, lt, gte } from "drizzle-orm";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const defaultConfigs = {
  ip: {
    windowMs: parseInt(process.env.MAGIC_LINK_WINDOW_MS || "3600000"),
    maxRequests: parseInt(process.env.MAGIC_LINK_IP_LIMIT || "5"),
  },
  email: {
    windowMs: parseInt(process.env.MAGIC_LINK_WINDOW_MS || "3600000"),
    maxRequests: parseInt(process.env.MAGIC_LINK_EMAIL_LIMIT || "3"),
  },
};

export class RateLimiter {
  private config: RateLimitConfig;
  private type: "ip" | "email";

  constructor(type: "ip" | "email", config?: Partial<RateLimitConfig>) {
    this.type = type;
    this.config = { ...defaultConfigs[type], ...config };
  }

  async checkLimit(
    identifier: string
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const windowStartDate = new Date(now - this.config.windowMs);

    try {
      await this.cleanup();

      const existing = await db
        .select()
        .from(magicRateLimits)
        .where(
          and(
            eq(magicRateLimits.identifier, identifier),
            eq(magicRateLimits.type, this.type),
            gte(magicRateLimits.windowStart, windowStartDate)
          )
        );

      const currentCount = existing.reduce(
        (sum, record) => sum + (record.count ?? 0),
        0
      );
      const remaining = Math.max(0, this.config.maxRequests - currentCount);
      const resetTime = now + this.config.windowMs;

      if (currentCount >= this.config.maxRequests) {
        return { allowed: false, remaining: 0, resetTime };
      }

      await db.insert(magicRateLimits).values({
        identifier,
        type: this.type,
        count: 1,
        windowStart: new Date(now),
        expiresAt: new Date(resetTime),
      });

      return { allowed: true, remaining: remaining - 1, resetTime };
    } catch (error) {
      console.error("[MagicRateLimit] checkLimit error:", error);
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: now + this.config.windowMs,
      };
    }
  }

  private async cleanup() {
    try {
      await db
        .delete(magicRateLimits)
        .where(lt(magicRateLimits.expiresAt, new Date()));
    } catch (error) {
      console.error("[MagicRateLimit] cleanup error:", error);
    }
  }

  async getRemainingRequests(identifier: string): Promise<number> {
    const now = Date.now();
    const windowStartDate = new Date(now - this.config.windowMs);

    try {
      const existing = await db
        .select()
        .from(magicRateLimits)
        .where(
          and(
            eq(magicRateLimits.identifier, identifier),
            eq(magicRateLimits.type, this.type),
            gte(magicRateLimits.windowStart, windowStartDate)
          )
        );

      const currentCount = existing.reduce(
        (sum, record) => sum + (record.count ?? 0),
        0
      );
      return Math.max(0, this.config.maxRequests - currentCount);
    } catch (error) {
      console.error("[MagicRateLimit] getRemainingRequests error:", error);
      return this.config.maxRequests;
    }
  }
}

export const ipRateLimiter = new RateLimiter("ip");
export const emailRateLimiter = new RateLimiter("email");
