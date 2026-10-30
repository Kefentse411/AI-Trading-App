"use client";

import { useState } from "react";

export default function InvitesPage() {
  const [invites] = useState([
    { id: 1, email: "trader1@example.com", role: "trader", status: "pending", createdAt: "2024-01-15" },
    { id: 2, email: "trader2@example.com", role: "trader", status: "accepted", createdAt: "2024-01-14" },
  ]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div
        className="backdrop-blur-xl rounded-2xl p-8 border relative overflow-hidden transition-all duration-300 slide-in"
        style={{
          background: "var(--bg-glass)",
          borderColor: "var(--border-color)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
        }}
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-purple-500/10 to-transparent rounded-bl-full pointer-events-none" />

        <div className="relative z-10">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium uppercase tracking-wider mb-3"
            style={{
              borderColor: "rgba(167, 139, 250, 0.2)",
              background: "rgba(167, 139, 250, 0.05)",
              color: "var(--accent-purple)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--accent-purple)" }} />
            User Invitations
          </div>

          <h1 className="text-3xl font-extrabold" style={{ color: "var(--text-primary)" }}>
            Invites
          </h1>

          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Manage user invitations and access control.
          </p>
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <button
          className="px-4 py-2 text-sm font-semibold rounded-lg border transition-all"
          style={{
            background: "rgba(59, 130, 246, 0.1)",
            borderColor: "rgba(59, 130, 246, 0.2)",
            color: "var(--accent-blue)",
          }}
        >
          + Send Invite
        </button>
      </div>

      <div
        className="rounded-xl overflow-hidden border"
        style={{
          background: "var(--bg-glass)",
          borderColor: "var(--border-color)",
        }}
      >
        <table className="w-full text-sm">
          <thead style={{ background: "var(--bg-tertiary)" }}>
            <tr className="border-b" style={{ borderColor: "var(--border-color)" }}>
              <th className="px-6 py-4 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>
                Email
              </th>
              <th className="px-6 py-4 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>
                Role
              </th>
              <th className="px-6 py-4 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>
                Status
              </th>
              <th className="px-6 py-4 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>
                Created
              </th>
            </tr>
          </thead>
          <tbody>
            {invites.map((invite) => (
              <tr key={invite.id} className="border-b" style={{ borderColor: "var(--border-color)" }}>
                <td className="px-6 py-4" style={{ color: "var(--text-primary)" }}>
                  {invite.email}
                </td>
                <td className="px-6 py-4" style={{ color: "var(--text-secondary)" }}>
                  {invite.role}
                </td>
                <td className="px-6 py-4">
                  <span
                    className="px-2 py-1 rounded-full text-xs font-semibold"
                    style={{
                      background:
                        invite.status === "accepted"
                          ? "rgba(16, 185, 129, 0.1)"
                          : "rgba(249, 115, 22, 0.1)",
                      color:
                        invite.status === "accepted"
                          ? "var(--accent-emerald)"
                          : "#f97316",
                    }}
                  >
                    {invite.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs" style={{ color: "var(--text-muted)" }}>
                  {invite.createdAt}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
