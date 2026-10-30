import { getUserRole } from "./roles";

export type Permission = 
  | "admin.users.read"
  | "admin.users.write" 
  | "admin.system.read"
  | "admin.system.write"
  | "dashboard.read"
  | "trading.read"
  | "trading.write";

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: [
    "admin.users.read",
    "admin.users.write",
    "admin.system.read", 
    "admin.system.write",
    "dashboard.read",
    "trading.read",
    "trading.write",
  ],
  user: [
    "dashboard.read",
    "trading.read", 
    "trading.write",
  ],
  viewer: [
    "dashboard.read",
    "trading.read",
  ],
};

export function hasPermission(userId: number, permission: Permission): boolean {
  const userRole = getUserRole(userId);
  
  if (!userRole) return false;
  
  const rolePermissions = ROLE_PERMISSIONS[userRole.name] || [];
  const hasAccess = rolePermissions.includes(permission);
  
  console.log(`🔍 hasPermission for user ${userId}, permission ${permission}: ${hasAccess} (role: ${userRole.name})`);
  
  return hasAccess;
}

export function hasAnyPermission(userId: number, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(userId, permission));
}

export function hasAllPermissions(userId: number, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(userId, permission));
}

export function getUserPermissions(userId: number): Permission[] {
  const userRole = getUserRole(userId);
  
  if (!userRole) return [];
  
  return ROLE_PERMISSIONS[userRole.name] || [];
}

export function requirePermission(userId: number, permission: Permission): void {
  if (!hasPermission(userId, permission)) {
    throw new Error(`Permission denied: ${permission}`);
  }
}

export function isAdmin(userId: number): boolean {
  return hasPermission(userId, "admin.users.read");
}

export function canAccessDashboard(userId: number): boolean {
  const hasAccess = hasPermission(userId, "dashboard.read");
  console.log(`🔍 canAccessDashboard for user ${userId}: ${hasAccess}`);
  return hasAccess;
}

export function canManageUsers(userId: number): boolean {
  return hasPermission(userId, "admin.users.write");
}