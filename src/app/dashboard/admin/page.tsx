import { requireAdmin } from "@/lib/auth-guard";
import UserManagement from "@/components/admin/UserManagement";
import { getDb } from "@/lib/db";

export default async function AdminPage() {
  await requireAdmin();

  const db = getDb();

  const users = db.prepare(`
    SELECT 
      u.id,
      u.email,
      u.name,
      u.image,
      u.created_at,
      u.updated_at,
      r.id as role_id,
      r.name as role_name,
      r.description as role_description
    FROM users u
    JOIN roles r ON u.role_id = r.id
    ORDER BY u.created_at DESC
  `).all();

  const roles = db.prepare(`
    SELECT id, name, description FROM roles ORDER BY name
  `).all();

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ color: "#ffffff" }}
        >
          User Management
        </h1>
        <p style={{ color: "#a1a1aa" }} className="mt-1 text-sm">
          Manage users and their roles
        </p>
      </div>

      <UserManagement
        initialUsers={users as any}
        roles={roles as any}
      />
    </div>
  );
}