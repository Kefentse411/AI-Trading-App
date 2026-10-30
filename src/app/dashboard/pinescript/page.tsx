"use client";

import { useState } from "react";

export default function PineScriptPage() {
  const [code, setCode] = useState(`//@version=5
indicator("My Strategy", overlay=true)

// Your PineScript code here
plot(close, title="Close Price", color=color.blue)`);

  return (
    <div className="space-y-8 max-w-7xl mx-auto h-[calc(100vh-200px)] flex flex-col">
      <div
        className="backdrop-blur-xl rounded-2xl p-8 border relative overflow-hidden transition-all duration-300 slide-in"
        style={{
          background: "var(--bg-glass)",
          borderColor: "var(--border-color)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
        }}
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-green-500/10 to-transparent rounded-bl-full pointer-events-none" />

        <div className="relative z-10">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium uppercase tracking-wider mb-3"
            style={{
              borderColor: "rgba(16, 185, 129, 0.2)",
              background: "rgba(16, 185, 129, 0.05)",
              color: "var(--accent-emerald)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--accent-emerald)" }} />
            Script Development
          </div>

          <h1 className="text-3xl font-extrabold" style={{ color: "var(--text-primary)" }}>
            PineScript IDE
          </h1>

          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Write and test TradingView PineScript indicators and strategies.
          </p>
        </div>
      </div>

      <div className="flex-1 flex gap-4">
        <div
          className="flex-1 backdrop-blur-xl rounded-xl p-4 border overflow-hidden flex flex-col"
          style={{
            background: "var(--bg-glass)",
            borderColor: "var(--border-color)",
          }}
        >
          <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
            EDITOR
          </p>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 bg-transparent p-3 font-mono text-sm outline-none resize-none"
            style={{ color: "var(--text-primary)" }}
          />
        </div>

        <div
          className="w-1/3 backdrop-blur-xl rounded-xl p-4 border overflow-y-auto"
          style={{
            background: "var(--bg-glass)",
            borderColor: "var(--border-color)",
          }}
        >
          <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
            PREVIEW
          </p>
          <p style={{ color: "var(--text-secondary)" }}>Chart preview coming soon...</p>
        </div>
      </div>
    </div>
  );
}
