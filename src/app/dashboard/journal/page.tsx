"use client";

export default function JournalPage() {
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
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-orange-500/10 to-transparent rounded-bl-full pointer-events-none" />

        <div className="relative z-10">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium uppercase tracking-wider mb-3"
            style={{
              borderColor: "rgba(249, 115, 22, 0.2)",
              background: "rgba(249, 115, 22, 0.05)",
              color: "#f97316",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#f97316" }} />
            Trade History
          </div>

          <h1 className="text-3xl font-extrabold" style={{ color: "var(--text-primary)" }}>
            Trade Journal
          </h1>

          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Review your trading history and performance metrics.
          </p>
        </div>
      </div>

      <div
        className="backdrop-blur-xl rounded-xl p-12 border text-center"
        style={{
          background: "var(--bg-glass)",
          borderColor: "var(--border-color)",
        }}
      >
        <p style={{ color: "var(--text-secondary)" }}>📔 Trade journal loading...</p>
      </div>
    </div>
  );
}
