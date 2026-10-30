import { auth } from "@/auth";
import { hasPermission, Permission } from "./permissions";
import { getAppUserIdByEmail } from "./get-app-user";
import { redirect } from "next/navigation";

export async function requireAuth() {
  const session = await auth();
  
  if (!session?.user?.id) {
    console.warn("🔒 [auth-guard] requireAuth: No session found, redirecting to /login", {
      hasSession: !!session,
      hasUser: !!session?.user,
      id: session?.user?.id,
    });
    redirect("/login");
  }
  return session;
}

export async function requirePermission(permission: Permission) {
  const session = await requireAuth();
  const email = session.user.email ?? "";
  const userId = getAppUserIdByEmail(email);

  console.log(`🔒 [auth-guard] Checking permission: "${permission}" for user: ${email} (appUserId: ${userId})`);

  if (!hasPermission(userId, permission)) {
    console.warn(`🔒 [auth-guard] Permission denied: "${permission}" for user: ${email} (appUserId: ${userId})`);
    redirect("/dashboard?error=permission_denied");
  }

  return session;
}

export async function requireAdmin() {
  return await requirePermission("admin.users.read");
}
