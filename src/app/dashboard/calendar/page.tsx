"use client";

export default function CalendarPage() {
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
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-cyan-500/10 to-transparent rounded-bl-full pointer-events-none" />

        <div className="relative z-10">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium uppercase tracking-wider mb-3"
            style={{
              borderColor: "rgba(34, 197, 211, 0.2)",
              background: "rgba(34, 197, 211, 0.05)",
              color: "#06b6d4",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#06b6d4" }} />
            Economic Calendar
          </div>

          <h1 className="text-3xl font-extrabold" style={{ color: "var(--text-primary)" }}>
            Event Calendar
          </h1>

          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Track upcoming economic events and market catalysts.
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
        <p style={{ color: "var(--text-secondary)" }}>📅 Calendar loading...</p>
      </div>
    </div>
  );
}
