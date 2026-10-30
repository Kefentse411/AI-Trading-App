"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";

type InviteCode = {
  id: number;
  code: string;
  created_by: number;
  max_uses: number;
  current_uses: number;
  expires_at: number;
  role_id: number;
  notes: string | null;
  created_at: number;
  creator_email: string;
  role_name: string;
};

type InviteStats = {
  total: number;
  active: number;
  expired: number;
  used: number;
  totalUses: number;
};

type Role = {
  id: number;
  name: string;
  description: string;
};

function formatTimeRemaining(timestamp: number) {
  const now = Math.floor(Date.now() / 1000);
  const seconds = timestamp - now;

  if (seconds <= 0) return "Expired";

  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h`;
  return `${Math.floor(seconds / 60)}m`;
}

function getInviteStatus(invite: InviteCode): { status: string; color: string } {
  const now = Math.floor(Date.now() / 1000);
  
  if (invite.expires_at < now) {
    return { status: "Expired", color: "#ef4444" };
  }
  
  if (invite.current_uses >= invite.max_uses) {
    return { status: "Used Up", color: "#f59e0b" };
  }
  
  return { status: "Active", color: "#10b981" };
}

export default function InviteManager() {
  const [invites, setInvites] = useState<InviteCode[]>([]);
  const [stats, setStats] = useState<InviteStats | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [inviteRequired, setInviteRequired] = useState(true);

  const [newInvite, setNewInvite] = useState({
    maxUses: 1,
    expiresInDays: 7,
    roleId: 2,
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/invites");
      const data = await res.json();

      if (data.ok) {
        setInvites(data.invites);
        setStats(data.stats);
        setRoles(data.roles);
        setInviteRequired(data.inviteRequired);
      }
    } catch {
      toast.error("Failed to load invite data");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateInvite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    try {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_invite",
          ...newInvite,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to create invite");
        return;
      }

      toast.success(`Invite created: ${data.invite.code}`);
      
      // Copy to clipboard
      try {
        await navigator.clipboard.writeText(data.invite.code);
        toast.success("Code copied to clipboard!");
      } catch {
        // Clipboard API not available
      }

      // Reset form
      setNewInvite({
        maxUses: 1,
        expiresInDays: 7,
        roleId: 2,
        notes: "",
      });

      fetchData();
    } catch {
      toast.error("Failed to create invite");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteInvite(inviteId: number) {
    setBusy(true);

    try {
      const res = await fetch(`/api/admin/invites/${inviteId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to delete invite");
        return;
      }

      toast.success("Invite deleted");
      fetchData();
    } catch {
      toast.error("Failed to delete invite");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleRequirement() {
    setBusy(true);

    try {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_requirement",
          inviteRequired: !inviteRequired,
        }),
      });

      if (!res.ok) {
        toast.error("Failed to update setting");
        return;
      }

      setInviteRequired(!inviteRequired);
      toast.success(`Invite requirement ${!inviteRequired ? "enabled" : "disabled"}`);
    } catch {
      toast.error("Failed to update setting");
    } finally {
      setBusy(false);
    }
  }

  async function copyInviteCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Code copied to clipboard!");
    } catch {
      toast.error("Failed to copy code");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div
            className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: "#10b981" }}
          />
          <p style={{ color: "#a1a1aa" }}>Loading invites...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Total Invites", value: stats.total },
            { label: "Active", value: stats.active, color: "#10b981" },
            { label: "Used Up", value: stats.used, color: "#f59e0b" },
            { label: "Expired", value: stats.expired, color: "#ef4444" },
            { label: "Total Uses", value: stats.totalUses },
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
              <p
                className="text-2xl font-bold mt-1"
                style={{ color: stat.color || "#ffffff" }}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Settings */}
      <div
        className="rounded-xl p-4"
        style={{ background: "#11111a", border: "1px solid #22222a" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: "#ffffff" }}>
              Invite Requirement
            </h3>
            <p className="text-xs mt-1" style={{ color: "#a1a1aa" }}>
              {inviteRequired
                ? "New users must have an invite code to register"
                : "Anyone can register without an invite"}
            </p>
          </div>
          
          <button
            onClick={handleToggleRequirement}
            disabled={busy}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{
              background: inviteRequired ? "#166534" : "#7f1d1d",
              color: inviteRequired ? "#86efac" : "#fca5a5",
              opacity: busy ? 0.5 : 1,
            }}
          >
            {inviteRequired ? "✅ Required" : "❌ Optional"}
          </button>
        </div>
      </div>

      {/* Create Invite Form */}
      <div
        className="rounded-xl p-4"
        style={{ background: "#11111a", border: "1px solid #22222a" }}
      >
        <h3 className="text-sm font-semibold mb-4" style={{ color: "#ffffff" }}>
          Create New Invite
        </h3>

        <form onSubmit={handleCreateInvite} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: "#888888" }}>
              Max Uses
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={newInvite.maxUses}
              onChange={(e) =>
                setNewInvite({ ...newInvite, maxUses: Number(e.target.value) })
              }
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                background: "#1a1a24",
                border: "1px solid #33333f",
                color: "#ffffff",
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: "#888888" }}>
              Expires (Days)
            </label>
            <input
              type="number"
              min={1}
              max={365}
              value={newInvite.expiresInDays}
              onChange={(e) =>
                setNewInvite({ ...newInvite, expiresInDays: Number(e.target.value) })
              }
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                background: "#1a1a24",
                border: "1px solid #33333f",
                color: "#ffffff",
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: "#888888" }}>
              Role
            </label>
            <select
              value={newInvite.roleId}
              onChange={(e) =>
                setNewInvite({ ...newInvite, roleId: Number(e.target.value) })
              }
              className="w-full px-3 py-2 rounded-lg text-sm"
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
          </div>

          <div className="md:flex md:items-end">
            <button
              type="submit"
              disabled={busy}
              className="w-full px-4 py-2 rounded-lg text-sm font-medium"
              style={{
                background: "#10b981",
                color: "#000000",
                opacity: busy ? 0.5 : 1,
              }}
            >
              {busy ? "Creating..." : "Create Invite"}
            </button>
          </div>

          <div className="md:col-span-4">
            <label className="block text-xs font-medium mb-2" style={{ color: "#888888" }}>
              Notes (optional)
            </label>
            <input
              type="text"
              placeholder="Purpose or recipient notes"
              value={newInvite.notes}
              onChange={(e) => setNewInvite({ ...newInvite, notes: e.target.value })}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                background: "#1a1a24",
                border: "1px solid #33333f",
                color: "#ffffff",
              }}
            />
          </div>
        </form>
      </div>

      {/* Invites Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "#11111a", border: "1px solid #22222a" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid #22222a" }}>
                {[
                  "Code",
                  "Role",
                  "Usage",
                  "Expires",
                  "Status",
                  "Creator",
                  "Actions",
                ].map((header) => (
                  <th
                    key={header}
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: "#888888" }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invites.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm"
                    style={{ color: "#888888" }}
                  >
                    No invites created yet
                  </td>
                </tr>
              ) : (
                invites.map((invite, index) => {
                  const { status, color } = getInviteStatus(invite);
                  
                  return (
                    <tr
                      key={invite.id}
                      style={{
                        borderBottom:
                          index < invites.length - 1 ? "1px solid #1a1a24" : "none",
                      }}
                    >
                      {/* Code */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => copyInviteCode(invite.code)}
                          className="text-sm font-mono hover:underline"
                          style={{ color: "#10b981" }}
                        >
                          {invite.code}
                        </button>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs"
                          style={{
                            background:
                              invite.role_name === "admin"
                                ? "#4c1d1d"
                                : invite.role_name === "user"
                                ? "#1a2e1a"
                                : "#1a1a2e",
                            color:
                              invite.role_name === "admin"
                                ? "#fca5a5"
                                                                : invite.role_name === "user"
                                ? "#86efac"
                                : "#93c5fd",
                          }}
                        >
                          {invite.role_name}
                        </span>
                      </td>

                      {/* Usage */}
                      <td className="px-4 py-3">
                        <span className="text-sm" style={{ color: "#ffffff" }}>
                          {invite.current_uses} / {invite.max_uses}
                        </span>
                      </td>

                      {/* Expires */}
                      <td className="px-4 py-3">
                        <span className="text-sm" style={{ color: "#a1a1aa" }}>
                          {formatTimeRemaining(invite.expires_at)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            background: `${color}20`,
                            color: color,
                          }}
                        >
                          {status}
                        </span>
                      </td>

                      {/* Creator */}
                      <td className="px-4 py-3">
                        <span className="text-xs" style={{ color: "#888888" }}>
                          {invite.creator_email}
                        </span>
                        {invite.notes && (
                          <p className="text-xs mt-1" style={{ color: "#666666" }}>
                            {invite.notes}
                          </p>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteInvite(invite.id)}
                          disabled={busy}
                          className="px-3 py-1 rounded-lg text-xs font-medium"
                          style={{
                            background: "#1a1a24",
                            color: "#fca5a5",
                            border: "1px solid #7f1d1d",
                            opacity: busy ? 0.5 : 1,
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}