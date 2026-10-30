"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";

type AuditLog = {
  id: number;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, any> | null;
  ip_address: string;
  user_agent: string;
  created_at: number;
  user_email: string;
  user_name: string;
};

type AuditStats = {
  totalEvents: number;
  eventsByAction: Record<string, number>;
  eventsByUser: Array<{ userId: number; userEmail: string; count: number }>;
  recentActivity: AuditLog[];
};

function getActionIcon(action: string) {
  switch (action) {
    case "user.created":
      return "👤";
    case "user.role.updated":
      return "🔄";
    case "user.deleted":
      return "🗑️";
    case "user.promoted":
      return "⬆️";
    case "admin.login":
      return "🔑";
    case "passcode.sent":
      return "📧";
    case "passcode.verified":
      return "✅";
    case "permission.denied":
      return "🚫";
    default:
      return "📊";
  }
}

function getActionColor(action: string) {
  switch (action) {
    case "user.created":
    case "passcode.verified":
      return "#10b981"; // green
    case "user.role.updated":
    case "user.promoted":
      return "#3b82f6"; // blue
    case "user.deleted":
    case "permission.denied":
      return "#ef4444"; // red
    case "admin.login":
      return "#f59e0b"; // amber
    default:
      return "#6b7280"; // gray
  }
}

function formatTimeAgo(timestamp: number) {
  return formatDistanceToNow(new Date(timestamp * 1000), { addSuffix: true });
}

export default function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    action: "",
    resourceType: "",
    userId: "",
  });

  useEffect(() => {
    fetchLogs();
  }, [filter]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.action) params.set("action", filter.action);
      if (filter.resourceType) params.set("resourceType", filter.resourceType);
      if (filter.userId) params.set("userId", filter.userId);

      const res = await fetch(`/api/admin/audit-logs?${params}`);
      const data = await res.json();

      if (data.ok) {
        setLogs(data.logs);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
    } finally {
      setLoading(false);
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
          <p style={{ color: "#a1a1aa" }}>Loading audit logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            className="rounded-xl p-4"
            style={{
              background: "#11111a",
              border: "1px solid #22222a",
            }}
          >
            <p className="text-xs uppercase tracking-wider" style={{ color: "#888888" }}>
              Total Events
            </p>
            <p className="text-2xl font-bold mt-1" style={{ color: "#ffffff" }}>
              {stats.totalEvents.toLocaleString()}
            </p>
          </div>

          <div
            className="rounded-xl p-4"
            style={{
              background: "#11111a",
              border: "1px solid #22222a",
            }}
          >
            <p className="text-xs uppercase tracking-wider" style={{ color: "#888888" }}>
              Active Users
            </p>
            <p className="text-2xl font-bold mt-1" style={{ color: "#ffffff" }}>
              {stats.eventsByUser?.length || 0}
            </p>
          </div>

          <div
            className="rounded-xl p-4"
            style={{
              background: "#11111a",
              border: "1px solid #22222a",
            }}
          >
            <p className="text-xs uppercase tracking-wider" style={{ color: "#888888" }}>
              Top Action
            </p>
            <p className="text-sm font-medium mt-1" style={{ color: "#ffffff" }}>
              {Object.entries(stats.eventsByAction)[0]?.[0] || "None"}
            </p>
          </div>

          <div
            className="rounded-xl p-4"
            style={{
              background: "#11111a",
              border: "1px solid #22222a",
            }}
          >
            <p className="text-xs uppercase tracking-wider" style={{ color: "#888888" }}>
              Action Types
            </p>
            <p className="text-2xl font-bold mt-1" style={{ color: "#ffffff" }}>
              {Object.keys(stats.eventsByAction).length}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div
        className="rounded-xl p-4"
        style={{ background: "#11111a", border: "1px solid #22222a" }}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Action Filter */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: "#888888" }}>
              Action
            </label>
            <select
              value={filter.action}
              onChange={(e) => setFilter({ ...filter, action: e.target.value })}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                background: "#1a1a24",
                border: "1px solid #33333f",
                color: "#ffffff",
              }}
            >
              <option value="">All Actions</option>
              {stats && Object.entries(stats.eventsByAction).map(([action, count]) => (
                <option key={action} value={action}>
                  {getActionIcon(action)} {action} ({count})
                </option>
              ))}
            </select>
          </div>

          {/* Resource Type Filter */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: "#888888" }}>
              Resource Type
            </label>
            <select
              value={filter.resourceType}
              onChange={(e) => setFilter({ ...filter, resourceType: e.target.value })}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                background: "#1a1a24",
                border: "1px solid #33333f",
                color: "#ffffff",
              }}
            >
              <option value="">All Resources</option>
              <option value="user">User</option>
              <option value="role">Role</option>
              <option value="session">Session</option>
              <option value="passcode">Passcode</option>
              <option value="system">System</option>
            </select>
          </div>

          {/* User Filter */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: "#888888" }}>
              User
            </label>
            <select
              value={filter.userId}
              onChange={(e) => setFilter({ ...filter, userId: e.target.value })}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                background: "#1a1a24",
                border: "1px solid #33333f",
                color: "#ffffff",
              }}
            >
              <option value="">All Users</option>
              {stats && stats.eventsByUser && stats.eventsByUser.map((user, index) => (
                <option key={`user-${index}`} value={user.userId?.toString() || ""}>
                  {user.userEmail} ({user.count} events)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "#11111a", border: "1px solid #22222a" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid #22222a" }}>
                {["Action", "User", "Resource", "Details", "Time", "IP"].map((header) => (
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
              {logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm"
                    style={{ color: "#888888" }}
                  >
                    No audit logs found
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => (
                  <tr
                    key={log.id}
                    style={{
                      borderBottom: index < logs.length - 1 ? "1px solid #1a1a24" : "none",
                    }}
                  >
                    {/* Action */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getActionIcon(log.action)}</span>
                        <span
                          className="text-sm font-medium"
                          style={{ color: getActionColor(log.action) }}
                        >
                          {log.action}
                        </span>
                      </div>
                    </td>

                    {/* User */}
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium" style={{ color: "#ffffff" }}>
                          {log.user_name || "Unknown"}
                        </p>
                        <p className="text-xs" style={{ color: "#888888" }}>
                          {log.user_email}
                        </p>
                      </div>
                    </td>

                    {/* Resource */}
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm" style={{ color: "#ffffff" }}>
                          {log.resource_type}
                        </p>
                        {log.resource_id && (
                          <p className="text-xs" style={{ color: "#888888" }}>
                            ID: {log.resource_id}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Details */}
                    <td className="px-4 py-3 max-w-xs">
                      {log.details && (
                        <div className="text-xs" style={{ color: "#a1a1aa" }}>
                          {Object.entries(log.details).map(([key, value]) => (
                            <div key={key}>
                              <span style={{ color: "#888888" }}>{key}:</span> {String(value)}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Time */}
                    <td className="px-4 py-3">
                      <p className="text-xs" style={{ color: "#888888" }}>
                        {formatTimeAgo(log.created_at)}
                      </p>
                    </td>

                    {/* IP */}
                    <td className="px-4 py-3">
                      <p className="text-xs font-mono" style={{ color: "#888888" }}>
                        {log.ip_address}
                      </p>
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