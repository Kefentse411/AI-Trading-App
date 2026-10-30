/**
 * Resolves the integer user ID from database.db using the authenticated email.
 *
 * Background: NextAuth stores sessions in sqlite.db with UUID string IDs.
 * Our app logic (roles, permissions, audit) uses database.db with integer IDs.
 * This helper bridges the two systems cleanly.
 */
import { getDb } from "@/lib/db";

export interface AppUser {
  id: number;
  email: string;
  name: string | null;
  image: string | null;
  roleId: number;
}

export function getAppUserByEmail(email: string): AppUser | null {
  try {
    const db = getDb();
    const user = db
      .prepare("SELECT id, email, name, image, role_id FROM users WHERE email = ?")
      .get(email) as (AppUser & { role_id: number }) | undefined;

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      roleId: user.role_id,
    };
  } catch (error) {
    console.error("[getAppUserByEmail] Error:", error);
    return null;
  }
}

export function getAppUserIdByEmail(email: string): number {
  return getAppUserByEmail(email)?.id ?? 0;
}
