import { db } from "@/db";
import { magicLinks } from "@/db/schema";
import { eq, and, gt, lt } from "drizzle-orm";
import { randomBytes } from "crypto";

export class MagicLinkService {
  private static readonly EXPIRY_MINUTES = parseInt(
    process.env.MAGIC_LINK_EXPIRY_MINUTES || "15"
  );

  static generateToken(): string {
    return randomBytes(32).toString("base64url");
  }

  static async createMagicLink(data: {
    email: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ token: string; expires: Date }> {
    const token = this.generateToken();
    const expires = new Date(Date.now() + this.EXPIRY_MINUTES * 60 * 1000);

    await db.insert(magicLinks).values({
      email: data.email,
      token,
      expires,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });

    return { token, expires };
  }

  static async verifyMagicLink(
    token: string
  ): Promise<{ valid: boolean; email?: string; error?: string }> {
    try {
      const [link] = await db
        .select()
        .from(magicLinks)
        .where(
          and(
            eq(magicLinks.token, token),
            eq(magicLinks.used, false),
            gt(magicLinks.expires, new Date())
          )
        );

      if (!link) {
        return { valid: false, error: "Invalid or expired magic link" };
      }

      await db
        .update(magicLinks)
        .set({
          used: true,
          usedAt: new Date(),
        })
        .where(eq(magicLinks.token, token));

      return { valid: true, email: link.email };
    } catch (error) {
      console.error("[MagicLink] Verification error:", error);
      return { valid: false, error: "Verification failed" };
    }
  }

  static async cleanupExpiredLinks(): Promise<void> {
    try {
      await db.delete(magicLinks).where(lt(magicLinks.expires, new Date()));
    } catch (error) {
      console.error("[MagicLink] Cleanup error:", error);
    }
  }

  static async getMagicLinkStats(): Promise<{
    total: number;
    used: number;
    expired: number;
    pending: number;
  }> {
    try {
      const allLinks = await db.select().from(magicLinks);
      const now = Date.now();

      const stats = allLinks.reduce(
        (acc, link) => {
          acc.total++;
          if (link.used) {
            acc.used++;
          } else if (Number(link.expires) < now) {
            acc.expired++;
          } else {
            acc.pending++;
          }
          return acc;
        },
        { total: 0, used: 0, expired: 0, pending: 0 }
      );

      return stats;
    } catch (error) {
      console.error("[MagicLink] Stats error:", error);
      return { total: 0, used: 0, expired: 0, pending: 0 };
    }
  }
}
