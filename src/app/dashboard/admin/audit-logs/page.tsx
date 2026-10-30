"use client";

export default function AuditLogsPage() {
  const logs = [
    { id: 1, action: "User login", user: "charlie@algoedge.com", timestamp: "2024-01-15 14:32:15", status: "✓" },
    { id: 2, action: "Strategy deployed", user: "charlie@algoedge.com", timestamp: "2024-01-15 14:28:42", status: "✓" },
    { id: 3, action: "Portfolio rebalance", user: "john@example.com", timestamp: "2024-01-15 14:15:08", status: "✓" },
    { id: 4, action: "API key created", user: "jane@example.com", timestamp: "2024-01-15 14:02:33", status: "✓" },
    { id: 5, action: "System backup", user: "system", timestamp: "2024-01-15 13:55:12", status: "✓" },
  ];

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
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-red-500/10 to-transparent rounded-bl-full pointer-events-none" />

        <div className="relative z-10">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium uppercase tracking-wider mb-3"
            style={{
              borderColor: "rgba(239, 68, 68, 0.2)",
              background: "rgba(239, 68, 68, 0.05)",
              color: "#ef4444",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#ef4444" }} />
            Audit Trail
          </div>

          <h1 className="text-3xl font-extrabold" style={{ color: "var(--text-primary)" }}>
            Audit Logs
          </h1>

          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Track all system activities and user actions.
          </p>
        </div>
      </div>

      <div
        className="rounded-xl overflow-hidden border"
        style={{
          background: "var(--bg-glass)",
          borderColor: "var(--border-color)",
        }}
      >
        <div className="p-6 space-y-4 max-h-96 overflow-y-auto font-mono text-xs">
          {logs.map((log, i) => (
            <div
              key={i}
              className="flex items-center gap-4 pb-4 border-b"
              style={{ borderColor: "var(--border-color)" }}
            >
              <span style={{ color: "var(--text-muted)", minWidth: "140px" }}>{log.timestamp}</span>
              <span style={{ color: "var(--text-secondary)", flex: 1 }}>{log.action}</span>
              <span style={{ color: "var(--text-muted)" }}>{log.user}</span>
              <span style={{ color: "var(--accent-emerald)" }}>{log.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
