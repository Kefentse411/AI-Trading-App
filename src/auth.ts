import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Email from "next-auth/providers/email";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import type { Adapter } from "next-auth/adapters";
import { sendMagicLinkEmail } from "@/lib/send-magic-link";

const ADMIN_EMAILS = [
  "kefentsecharlie5@gmail.com",
];

async function syncUserToAppDb(email: string, name?: string | null, image?: string | null): Promise<number> {
  try {
    const { getDb } = require("@/lib/db");
    const appDb = getDb();
    const now = Math.floor(Date.now() / 1000);
    const isAdmin = ADMIN_EMAILS.includes(email);
    const roleId = isAdmin ? 1 : 2;

    const existing = appDb
      .prepare("SELECT id, role_id FROM users WHERE email = ?")
      .get(email) as { id: number; role_id: number } | undefined;

    if (existing) {
      appDb.prepare(`
        UPDATE users
        SET name = ?, image = ?, updated_at = ?
        WHERE email = ?
      `).run(name || null, image || null, now, email);

      return existing.id;
    }

    const result = appDb.prepare(`
      INSERT INTO users (email, name, image, role_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(email, name || null, image || null, roleId, now, now);

    const newId = result.lastInsertRowid as number;
    console.log(`[Auth] Synced user: ${email} → id=${newId} role=${roleId}`);

    // Brand-new app user — initialize their notification preferences
    try {
      const { initializeNotificationPreferencesForUser } = await import("@/lib/init-notification-prefs");
      await initializeNotificationPreferencesForUser(newId, email);
    } catch (initError) {
      console.error("[Auth] Failed to initialize notification preferences:", initError);
    }

    return newId;
  } catch (error) {
    console.error("[Auth] syncUserToAppDb error:", error);
    return 0;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db) as Adapter,

  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Email({
      server: "smtp://fake:fake@localhost:587",
      from: process.env.EMAIL_FROM || "AlgoEdge Pro <onboarding@resend.dev>",
      sendVerificationRequest: async ({ identifier: email, url }) => {
        try {
          const result = await sendMagicLinkEmail({
            to: email,
            magicUrl: url,
          });
          console.log(`[Auth] Magic link sent via ${result.provider} to ${email}`);
          if (result.provider === "dev" && result.devUrl) {
            console.log(`[DEV] Magic link URL: ${result.devUrl}`);
          }
        } catch (error) {
          console.error("[Auth] sendVerificationRequest error:", error);
          throw error;
        }
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;

      try {
        const appUserId = await syncUserToAppDb(user.email, user.name, user.image);

        if (appUserId > 0) {
          const { logAuditEvent } = await import("@/lib/audit");
          await logAuditEvent({
            userId: appUserId,
            action: "admin.login",
            resourceType: "session",
            details: {
              provider: account?.provider,
              email: user.email,
            },
          });
        }
      } catch (error) {
        console.error("[Auth] signIn callback error:", error);
      }

      return true;
    },

    async session({ session, user }) {
      if (session.user) {
        // Safe mapping of all NextAuth user ID variants (Drizzle Adapter vs JWT strategies)
        session.user.id = user?.id || session.user.id || (session as any).userId;

        try {
          const { getDb } = await import("@/lib/db");
          const appDb = getDb();
          const appUser = appDb
            .prepare("SELECT id, role_id FROM users WHERE email = ?")
            .get(session.user.email) as { id: number; role_id: number } | undefined;

          if (appUser) {
            (session.user as any).appUserId = appUser.id;
            (session.user as any).roleId = appUser.role_id;

            // Fetch the actual role details from the roles table (Fixes Sidebar visibility check!)
            const role = appDb
              .prepare("SELECT name, description FROM roles WHERE id = ?")
              .get(appUser.role_id) as { name: string; description: string } | undefined;

            if (role) {
              (session.user as any).role = {
                id: appUser.role_id,
                name: role.name,
                description: role.description,
              };
            }

            console.log(`[Auth Session] Resolved appUserId=${appUser.id}, role=${role?.name || "none"} for ${session.user.email}`);
          }
        } catch (error) {
          console.error("[Auth] session callback error:", error);
        }
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
    verifyRequest: "/login?magic=sent",
  },

  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },

  secret: process.env.AUTH_SECRET,
});