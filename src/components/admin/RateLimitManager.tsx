"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";

type BlockedEntity = {
  id: number;
  identifier: string;
  type: string;
  reason: string;
  blocked_until: number;
  created_at: number;
  blocked_by_email: string | null;
};

type RateLimitStats = {
  activeBlocks: number;
  totalAttempts: Record<string, number>;
  topOffenders: Array<{ identifier: string; attempts: number; action: string }>;
};

function formatTimeRemaining(timestamp: number) {
  const now = Math.floor(Date.now() / 1000);
  const seconds = timestamp - now;

  if (seconds <= 0) return "Expired";

  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

export default function RateLimitManager() {
  const [blocked, setBlocked] = useState<BlockedEntity[]>([]);
  const [stats, setStats] = useState<RateLimitStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [newBlock, setNewBlock] = useState({
    identifier: "",
    type: "ip",
    reason: "manual_block",
    durationMinutes: 60,
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/rate-limits");
      const data = await res.json();

      if (data.ok) {
        setBlocked(data.blocked);
        setStats(data.stats);
      }
    } catch {
      toast.error("Failed to load rate limit data");
    } finally {
      setLoading(false);
    }
  }

  async function handleBlock(e: React.FormEvent) {
    e.preventDefault();

    if (!newBlock.identifier.trim()) {
      toast.error("Identifier is required");
      return;
    }

    setBusy(true);

    try {
      const res = await fetch("/api/admin/rate-limits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBlock),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to block");
        return;
      }

      toast.success(`Blocked ${newBlock.identifier}`);
      setNewBlock({ ...newBlock, identifier: "" });
      fetchData();
    } finally {
      setBusy(false);
    }
  }

  async function handleUnblock(identifier: string) {
    setBusy(true);

    try {
      const res = await fetch(
        `/api/admin/rate-limits?identifier=${encodeURIComponent(identifier)}`,
        { method: "DELETE" }
      );

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to unblock");
        return;
      }

      toast.success(`Unblocked ${identifier}`);
      fetchData();
    } finally {
      setBusy(false);
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
          <p style={{ color: "#a1a1aa" }}>Loading rate limit data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            className="rounded-xl p-4"
            style={{ background: "#11111a", border: "1px solid #22222a" }}
          >
            <p className="text-xs uppercase tracking-wider" style={{ color: "#888888" }}>
              Active Blocks
            </p>
            <p
              className="text-2xl font-bold mt-1"
              style={{ color: stats.activeBlocks > 0 ? "#ef4444" : "#ffffff" }}
            >
              {stats.activeBlocks}
            </p>
          </div>

          <div
            className="rounded-xl p-4"
            style={{ background: "#11111a", border: "1px solid #22222a" }}
          >
            <p className="text-xs uppercase tracking-wider" style={{ color: "#888888" }}>
              Passcode Requests
            </p>
            <p className="text-2xl font-bold mt-1" style={{ color: "#ffffff" }}>
              {stats.totalAttempts.passcode_request || 0}
            </p>
          </div>

          <div
            className="rounded-xl p-4"
            style={{ background: "#11111a", border: "1px solid #22222a" }}
          >
            <p className="text-xs uppercase tracking-wider" style={{ color: "#888888" }}>
              Verify Attempts
            </p>
            <p className="text-2xl font-bold mt-1" style={{ color: "#ffffff" }}>
              {stats.totalAttempts.verify_attempt || 0}
            </p>
          </div>

          <div
            className="rounded-xl p-4"
            style={{ background: "#11111a", border: "1px solid #22222a" }}
          >
            <p className="text-xs uppercase tracking-wider" style={{ color: "#888888" }}>
              Top Offenders
            </p>
            <p className="text-2xl font-bold mt-1" style={{ color: "#ffffff" }}>
              {stats.topOffenders.length}
            </p>
          </div>
        </div>
      )}

      {/* Manual Block Form */}
      <div
        className="rounded-xl p-4"
        style={{ background: "#11111a", border: "1px solid #22222a" }}
      >
        <h3 className="text-sm font-semibold mb-4" style={{ color: "#ffffff" }}>
          Manually Block Entity
        </h3>

        <form onSubmit={handleBlock} className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="IP or email"
            value={newBlock.identifier}
            onChange={(e) => setNewBlock({ ...newBlock, identifier: e.target.value })}
            className="md:col-span-2 px-3 py-2 rounded-lg text-sm outline-none"
            style={{
              background: "#1a1a24",
              border: "1px solid #33333f",
              color: "#ffffff",
            }}
          />

          <select
            value={newBlock.type}
            onChange={(e) => setNewBlock({ ...newBlock, type: e.target.value })}
            className="px-3 py-2 rounded-lg text-sm"
            style={{
              background: "#1a1a24",
              border: "1px solid #33333f",
              color: "#ffffff",
            }}
          >
            <option value="ip">IP Address</option>
            <option value="user">User Email</option>
          </select>

          <input
            type="number"
            min={1}
            placeholder="Minutes"
            value={newBlock.durationMinutes}
            onChange={(e) =>
              setNewBlock({ ...newBlock, durationMinutes: Number(e.target.value) })
            }
            className="px-3 py-2 rounded-lg text-sm outline-none"
            style={{
              background: "#1a1a24",
              border: "1px solid #33333f",
              color: "#ffffff",
            }}
          />

          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{
              background: "#7f1d1d",
              color: "#fca5a5",
              opacity: busy ? 0.5 : 1,
            }}
          >
            {busy ? "Blocking..." : "Block"}
          </button>
        </form>
      </div>

      {/* Blocked Entities */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "#11111a", border: "1px solid #22222a" }}
      >
        <div className="px-4 py-3" style={{ borderBottom: "1px solid #22222a" }}>
          <h3 className="text-sm font-semibold" style={{ color: "#ffffff" }}>
            Currently Blocked
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid #22222a" }}>
                {["Identifier", "Type", "Reason", "Expires In", "Blocked By", "Actions"].map(
                  (header) => (
                    <th
                      key={header}
                      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                      style={{ color: "#888888" }}
                    >
                      {header}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {blocked.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm"
                    style={{ color: "#888888" }}
                  >
                    No blocked entities
                  </td>
                </tr>
              ) : (
                blocked.map((entity, index) => (
                  <tr
                    key={entity.id}
                    style={{
                      borderBottom:
                        index < blocked.length - 1 ? "1px solid #1a1a24" : "none",
                    }}
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono" style={{ color: "#ffffff" }}>
                        {entity.identifier}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs"
                        style={{
                          background: entity.type === "ip" ? "#1a1a2e" : "#1a2e1a",
                          color: entity.type === "ip" ? "#93c5fd" : "#86efac",
                        }}
                      >
                        {entity.type}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="text-sm" style={{ color: "#fca5a5" }}>
                        {entity.reason}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="text-sm" style={{ color: "#a1a1aa" }}>
                        {formatTimeRemaining(entity.blocked_until)}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="text-xs" style={{ color: "#888888" }}>
                        {entity.blocked_by_email || "System"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleUnblock(entity.identifier)}
                        disabled={busy}
                        className="px-3 py-1 rounded-lg text-xs font-medium"
                        style={{
                          background: "#1a1a24",
                          color: "#10b981",
                          border: "1px solid #166534",
                          opacity: busy ? 0.5 : 1,
                        }}
                      >
                        Unblock
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Offenders */}
      {stats && stats.topOffenders.length > 0 && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: "#11111a", border: "1px solid #22222a" }}
        >
          <div className="px-4 py-3" style={{ borderBottom: "1px solid #22222a" }}>
            <h3 className="text-sm font-semibold" style={{ color: "#ffffff" }}>
              Top Offenders
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid #22222a" }}>
                  {["Identifier", "Action", "Attempts", "Quick Block"].map((header) => (
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
                {stats.topOffenders.map((offender, index) => (
                  <tr
                    key={`${offender.identifier}-${offender.action}-${index}`}
                    style={{
                      borderBottom:
                        index < stats.topOffenders.length - 1
                          ? "1px solid #1a1a24"
                          : "none",
                    }}
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono" style={{ color: "#ffffff" }}>
                        {offender.identifier}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="text-sm" style={{ color: "#a1a1aa" }}>
                        {offender.action}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className="text-sm font-bold"
                        style={{ color: offender.attempts >= 5 ? "#ef4444" : "#f59e0b" }}
                      >
                        {offender.attempts}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          setNewBlock({
                            identifier: offender.identifier,
                            type: offender.identifier.includes("@") ? "user" : "ip",
                            reason: "suspicious_activity",
                            durationMinutes: 60,
                          });
                        }}
                        className="px-3 py-1 rounded-lg text-xs font-medium"
                        style={{
                          background: "#1a1a24",
                          color: "#fca5a5",
                          border: "1px solid #7f1d1d",
                        }}
                      >
                        Prefill Block
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}