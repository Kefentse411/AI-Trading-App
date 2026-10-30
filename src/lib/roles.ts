import { getDb } from "./db";

export type Role = {
  id: number;
  name: string;
  description: string;
  created_at: number;
};

export type UserWithRole = {
  id: number;
  email: string;
  name: string;
  image: string;
  role: {
    id: number;
    name: string;
    description: string;
  };
};

export function getUserRole(userId: number): Role | null {
  const db = getDb();
  
  const stmt = db.prepare(`
    SELECT r.id, r.name, r.description, r.created_at
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = ?
  `);
  
  const role = stmt.get(userId) as Role | undefined;
  return role || null;
}

export function getUserWithRole(userId: number): UserWithRole | null {
  const db = getDb();
  
  const stmt = db.prepare(`
    SELECT 
      u.id, u.email, u.name, u.image,
      r.id as role_id, r.name as role_name, r.description as role_description
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = ?
  `);
  
  const row = stmt.get(userId) as any;
  
  if (!row) return null;
  
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    image: row.image,
    role: {
      id: row.role_id,
      name: row.role_name,
      description: row.role_description,
    },
  };
}

export function updateUserRole(userId: number, roleId: number): boolean {
  const db = getDb();
  
  const stmt = db.prepare(`
    UPDATE users SET role_id = ? WHERE id = ?
  `);
  
  const result = stmt.run(roleId, userId);
  return result.changes > 0;
}

export function getAllRoles(): Role[] {
  const db = getDb();
  
  const stmt = db.prepare(`
    SELECT id, name, description, created_at
    FROM roles
    ORDER BY name
  `);
  
  return stmt.all() as Role[];
}

export function getRoleByName(roleName: string): Role | null {
  const db = getDb();
  
  const stmt = db.prepare(`
    SELECT id, name, description, created_at
    FROM roles
    WHERE name = ?
  `);
  
  return stmt.get(roleName) as Role || null;
}