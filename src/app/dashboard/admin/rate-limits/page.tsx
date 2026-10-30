"use client";

export default function RateLimitsPage() {
  const limits = [
    { endpoint: "/api/trades", rps: 100, current: 45, status: "Normal" },
    { endpoint: "/api/strategies", rps: 50, current: 12, status: "Normal" },
    { endpoint: "/api/data", rps: 1000, current: 892, status: "High" },
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
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-yellow-500/10 to-transparent rounded-bl-full pointer-events-none" />

        <div className="relative z-10">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium uppercase tracking-wider mb-3"
            style={{
              borderColor: "rgba(234, 179, 8, 0.2)",
              background: "rgba(234, 179, 8, 0.05)",
              color: "#eab308",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#eab308" }} />
            API Rate Limits
          </div>

          <h1 className="text-3xl font-extrabold" style={{ color: "var(--text-primary)" }}>
            Rate Limits
          </h1>

          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Monitor and manage API rate limiting.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {limits.map((limit, i) => (
          <div
            key={i}
            className="backdrop-blur-xl rounded-xl p-6 border"
            style={{
              background: "var(--bg-glass)",
              borderColor: "var(--border-color)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                {limit.endpoint}
              </h3>
              <span
                className="px-2 py-1 rounded-full text-xs font-semibold"
                style={{
                  background:
                    limit.status === "Normal"
                      ? "rgba(16, 185, 129, 0.1)"
                      : "rgba(248, 113, 113, 0.1)",
                  color:
                    limit.status === "Normal"
                      ? "var(--accent-emerald)"
                      : "#f87171",
                }}
              >
                {limit.status}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs" style={{ color: "var(--text-muted)" }}>
                <span>{limit.current} / {limit.rps} req/s</span>
                <span>{Math.round((limit.current / limit.rps) * 100)}%</span>
              </div>
              <div
                className="w-full h-2 rounded-full overflow-hidden"
                style={{ background: "var(--bg-tertiary)" }}
              >
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${(limit.current / limit.rps) * 100}%`,
                    background:
                      limit.status === "Normal"
                        ? "var(--accent-emerald)"
                        : "#f87171",
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
