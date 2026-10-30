"use client";

import { useState } from "react";
import toast from "react-hot-toast";

type Role = {
  id: number;
  name: string;
  description: string;
};

type User = {
  id: number;
  email: string;
  name: string;
  image: string;
  created_at: number;
  role_id: number;
  role_name: string;
  role_description: string;
};

interface UserManagementProps {
  initialUsers: User[];
  roles: Role[];
}

function getRoleBadgeStyle(roleName: string) {
  switch (roleName) {
    case "admin":
      return { background: "#4c1d1d", color: "#fca5a5", border: "1px solid #7f1d1d" };
    case "user":
      return { background: "#1a2e1a", color: "#86efac", border: "1px solid #166534" };
    case "viewer":
      return { background: "#1a1a2e", color: "#93c5fd", border: "1px solid #1e3a5f" };
    default:
      return { background: "#1a1a24", color: "#a1a1aa", border: "1px solid #33333f" };
  }
}

function formatDate(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function UserManagement({ initialUsers, roles }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      user.name?.toLowerCase().includes(search.toLowerCase())
  );

  async function handleRoleUpdate(userId: number) {
    if (!selectedRoleId) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role_id: selectedRoleId }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to update role");
        return;
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                role_id: data.user.role_id,
                role_name: data.user.role_name,
              }
            : u
        )
      );

      toast.success("Role updated successfully");
      setEditingUserId(null);
      setSelectedRoleId(null);
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(userId: number) {
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to delete user");
        return;
      }

      setUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.success("User deleted successfully");
      setDeletingUserId(null);
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: users.length },
          {
            label: "Admins",
            value: users.filter((u) => u.role_name === "admin").length,
          },
          {
            label: "Users",
            value: users.filter((u) => u.role_name === "user").length,
          },
          {
            label: "Viewers",
            value: users.filter((u) => u.role_name === "viewer").length,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl p-4"
            style={{
              background: "#11111a",
              border: "1px solid #22222a",
            }}
          >
            <p className="text-xs uppercase tracking-wider" style={{ color: "#888888" }}>
              {stat.label}
            </p>
            <p className="text-2xl font-bold mt-1" style={{ color: "#ffffff" }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div
        className="rounded-xl p-4"
        style={{ background: "#11111a", border: "1px solid #22222a" }}
      >
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 rounded-lg text-sm outline-none"
          style={{
            background: "#1a1a24",
            border: "1px solid #33333f",
            color: "#ffffff",
          }}
        />
      </div>

      {/* Users Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "#11111a", border: "1px solid #22222a" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid #22222a" }}>
                {["User", "Role", "Joined", "Actions"].map((header) => (
                  <th
                    key={header}
                    className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "#888888" }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-8 text-center text-sm"
                    style={{ color: "#888888" }}
                  >
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user, index) => (
                  <tr
                    key={user.id}
                    style={{
                      borderBottom:
                        index < filteredUsers.length - 1
                          ? "1px solid #1a1a24"
                          : "none",
                    }}
                  >
                    {/* User Info */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {user.image ? (
                          <img
                            src={user.image}
                            alt={user.name}
                            className="w-9 h-9 rounded-full"
                          />
                        ) : (
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium"
                            style={{ background: "#1a1a24", color: "#10b981" }}
                          >
                            {user.name?.charAt(0) || user.email.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium" style={{ color: "#ffffff" }}>
                            {user.name || "No name"}
                          </p>
                          <p className="text-xs" style={{ color: "#888888" }}>
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-6 py-4">
                      {editingUserId === user.id ? (
                        <select
                          value={selectedRoleId ?? user.role_id}
                          onChange={(e) => setSelectedRoleId(Number(e.target.value))}
                          className="px-3 py-1.5 rounded-lg text-sm outline-none"
                          style={{
                            background: "#1a1a24",
                            border: "1px solid #33333f",
                            color: "#ffffff",
                          }}
                        >
                          {roles.map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className="px-2.5 py-1 rounded-full text-xs font-medium"
                          style={getRoleBadgeStyle(user.role_name)}
                        >
                          {user.role_name}
                        </span>
                      )}
                    </td>

                    {/* Joined */}
                    <td className="px-6 py-4">
                      <span className="text-sm" style={{ color: "#888888" }}>
                        {formatDate(user.created_at)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      {deletingUserId === user.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs" style={{ color: "#fca5a5" }}>
                            Are you sure?
                          </span>
                          <button
                            onClick={() => handleDelete(user.id)}
                            disabled={loading}
                            className="px-3 py-1 rounded-lg text-xs font-medium"
                            style={{
                              background: "#7f1d1d",
                              color: "#fca5a5",
                              opacity: loading ? 0.5 : 1,
                            }}
                          >
                            {loading ? "Deleting..." : "Confirm"}
                          </button>
                          <button
                            onClick={() => setDeletingUserId(null)}
                            disabled={loading}
                            className="px-3 py-1 rounded-lg text-xs font-medium"
                            style={{
                              background: "#1a1a24",
                              color: "#a1a1aa",
                              border: "1px solid #33333f",
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : editingUserId === user.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRoleUpdate(user.id)}
                            disabled={loading}
                            className="px-3 py-1 rounded-lg text-xs font-medium"
                            style={{
                              background: "#10b981",
                              color: "#000000",
                              opacity: loading ? 0.5 : 1,
                            }}
                          >
                            {loading ? "Saving..." : "Save"}
                          </button>
                          <button
                            onClick={() => {
                              setEditingUserId(null);
                              setSelectedRoleId(null);
                            }}
                            disabled={loading}
                            className="px-3 py-1 rounded-lg text-xs font-medium"
                            style={{
                              background: "#1a1a24",
                              color: "#a1a1aa",
                              border: "1px solid #33333f",
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingUserId(user.id);
                              setSelectedRoleId(user.role_id);
                            }}
                            className="px-3 py-1 rounded-lg text-xs font-medium"
                            style={{
                              background: "#1a1a24",
                              color: "#a1a1aa",
                              border: "1px solid #33333f",
                            }}
                          >
                            Edit Role
                          </button>
                          <button
                            onClick={() => setDeletingUserId(user.id)}
                            className="px-3 py-1 rounded-lg text-xs font-medium"
                            style={{
                              background: "#1a1a24",
                              color: "#fca5a5",
                              border: "1px solid #7f1d1d",
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}