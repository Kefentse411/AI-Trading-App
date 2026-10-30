"use client";

import { useState } from "react";

export default function StrategiesPage() {
  const [activeTab, setActiveTab] = useState<"active" | "backtest" | "create">("active");

  const strategies = [
    {
      id: 1,
      name: "Momentum Breakout",
      symbol: "BTC/USD",
      status: "active",
      winRate: "72.5%",
      dailyReturn: "+2.3%",
      lastTrade: "2024-01-15 14:32",
    },
    {
      id: 2,
      name: "Mean Reversion Grid",
      symbol: "ETH/USD",
      status: "active",
      winRate: "68.1%",
      dailyReturn: "+1.8%",
      lastTrade: "2024-01-15 13:15",
    },
    {
      id: 3,
      name: "Trend Following MA",
      symbol: "SOL/USD",
      status: "paused",
      winRate: "71.2%",
      dailyReturn: "—",
      lastTrade: "2024-01-14 16:45",
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div
        className="backdrop-blur-xl rounded-2xl p-8 border relative overflow-hidden transition-all duration-300 slide-in"
        style={{
          background: "var(--bg-glass)",
          borderColor: "var(--border-color)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
        }}
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-bl-full pointer-events-none" />

        <div className="relative z-10">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium uppercase tracking-wider mb-3"
            style={{
              borderColor: "rgba(59, 130, 246, 0.2)",
              background: "rgba(59, 130, 246, 0.05)",
              color: "var(--accent-blue)",
            }}
          >
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
            Strategy Management
          </div>

          <h1 className="text-3xl font-extrabold" style={{ color: "var(--text-primary)" }}>
            Trading Strategies
          </h1>

          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Manage, backtest, and deploy your quantitative trading strategies.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b" style={{ borderColor: "var(--border-color)" }}>
        {(["active", "backtest", "create"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-semibold transition-all duration-300 border-b-2 -mb-px capitalize ${
              activeTab === tab
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-400"
            }`}
          >
            {tab === "active" ? "📊 Active Strategies" : tab === "backtest" ? "🧪 Backtest" : "➕ Create New"}
          </button>
        ))}
      </div>

      {/* Active Strategies */}
      {activeTab === "active" && (
        <div className="slide-in space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {strategies.map((strategy) => (
              <div
                key={strategy.id}
                className="backdrop-blur-xl rounded-xl p-6 border transition-all hover:border-blue-500/30"
                style={{
                  background: "var(--bg-glass)",
                  borderColor: "var(--border-color)",
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                      {strategy.name}
                    </h3>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      {strategy.symbol}
                    </p>
                  </div>
                  <span
                    className="px-3 py-1 rounded-full text-xs font-semibold"
                    style={{
                      background:
                        strategy.status === "active"
                          ? "rgba(16, 185, 129, 0.1)"
                          : "rgba(107, 114, 128, 0.1)",
                      color:
                        strategy.status === "active"
                          ? "var(--accent-emerald)"
                          : "var(--text-muted)",
                    }}
                  >
                    {strategy.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                      Win Rate
                    </p>
                    <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                      {strategy.winRate}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                      Daily Return
                    </p>
                    <p className="text-lg font-bold" style={{ color: "var(--accent-emerald)" }}>
                      {strategy.dailyReturn}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                      Last Trade
                    </p>
                    <p className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                      {strategy.lastTrade}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Backtest */}
      {activeTab === "backtest" && (
        <div className="slide-in">
          <div
            className="backdrop-blur-xl rounded-xl p-6 border"
            style={{
              background: "var(--bg-glass)",
              borderColor: "var(--border-color)",
            }}
          >
            <p style={{ color: "var(--text-secondary)" }}>Backtest interface coming soon...</p>
          </div>
        </div>
      )}

      {/* Create */}
      {activeTab === "create" && (
        <div className="slide-in">
          <div
            className="backdrop-blur-xl rounded-xl p-6 border"
            style={{
              background: "var(--bg-glass)",
              borderColor: "var(--border-color)",
            }}
          >
            <p style={{ color: "var(--text-secondary)" }}>Strategy builder coming soon...</p>
          </div>
        </div>
      )}
    </div>
  );
}
