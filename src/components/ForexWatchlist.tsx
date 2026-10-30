"use client";

import { useEffect, useState } from "react";
import SignalCard from "./SignalCard";
import PriceActionBreakdown from "./PriceActionBreakdown";

interface WatchlistEntry {
  symbol: string;
  ticker: string;
  status: "ready" | "building" | "conflicted";
  setup_type: string;
  current_price: number;
  ml_prediction: string;
  ensemble_prediction: string;
  ml_confidence: number;
  ensemble_confidence: number;
  signal_source: string;
  position_size: number;
  price_action: {
    rsi: string;
    macd: string;
    sma: string;
    momentum: string;
  };
  target: number;
  stop: number;
  expected_return: number;
}

interface WatchlistData {
  timestamp: string;
  ready: WatchlistEntry[];
  building: WatchlistEntry[];
  conflicted: WatchlistEntry[];
  summary: {
    ready_count: number;
    building_count: number;
    conflicted_count: number;
    total_count: number;
  };
}

const STATUS_CONFIG = {
  ready: {
    label: "Ready to Trade",
    emoji: "🟢",
    color: "#10b981",
    bgColor: "rgba(16, 185, 129, 0.05)",
    borderColor: "rgba(16, 185, 129, 0.15)",
    message: "High confidence setup - ready to execute",
  },
  building: {
    label: "Building Consensus",
    emoji: "🟡",
    color: "#f59e0b",
    bgColor: "rgba(245, 158, 11, 0.05)",
    borderColor: "rgba(245, 158, 11, 0.15)",
    message: "Consensus forming - watch next candle",
  },
  conflicted: {
    label: "Conflicted Signals",
    emoji: "⚪",
    color: "#6b7280",
    bgColor: "rgba(107, 114, 128, 0.05)",
    borderColor: "rgba(107, 114, 128, 0.15)",
    message: "Mixed signals - insufficient conviction",
  },
};

export default function ForexWatchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<WatchlistEntry | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    const fetchWatchlist = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/forex/watchlist");
        if (!response.ok) throw new Error("Failed to fetch watchlist");
        const data = await response.json();
        setWatchlist(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchWatchlist();

    // Auto-refresh every 30 seconds if enabled
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchWatchlist, 30000);
    }

    return () => clearInterval(interval);
  }, [autoRefresh]);

  if (loading && !watchlist) {
    return (
      <div className="space-y-6">
        <div
          className="backdrop-blur-xl rounded-2xl p-8 border"
          style={{
            background: "var(--bg-glass)",
            borderColor: "var(--border-color)",
          }}
        >
          <div className="flex items-center justify-center gap-3">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            <p style={{ color: "var(--text-secondary)" }}>Loading forex watchlist...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div
          className="backdrop-blur-xl rounded-2xl p-6 border"
          style={{
            background: "rgba(239, 68, 68, 0.05)",
            borderColor: "rgba(239, 68, 68, 0.15)",
          }}
        >
          <p style={{ color: "#ef4444" }}>Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!watchlist) return null;

  const allSignals = [
    ...watchlist.ready,
    ...watchlist.building,
    ...watchlist.conflicted,
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header with controls */}
      <div
        className="backdrop-blur-xl rounded-2xl p-6 border flex items-center justify-between"
        style={{
          background: "var(--bg-glass)",
          borderColor: "var(--border-color)",
        }}
      >
        <div>
          <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Forex Watchlist
          </h2>
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
            Last updated: {new Date(watchlist.timestamp).toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span style={{ color: "var(--text-secondary)" }}>Auto-refresh (30s)</span>
          </label>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
            style={{
              background: "rgba(59, 130, 246, 0.1)",
              borderColor: "rgba(59, 130, 246, 0.2)",
              color: "var(--accent-blue)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(59, 130, 246, 0.2)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(59, 130, 246, 0.1)";
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Ready", value: watchlist.summary.ready_count, color: "#10b981" },
          { label: "Building", value: watchlist.summary.building_count, color: "#f59e0b" },
          { label: "Conflicted", value: watchlist.summary.conflicted_count, color: "#6b7280" },
          { label: "Total", value: watchlist.summary.total_count, color: "#60a5fa" },
        ].map((stat, i) => (
          <div
            key={i}
            className="backdrop-blur-xl rounded-xl p-4 border text-center transition-all hover:-translate-y-1"
            style={{
              background: "var(--bg-glass)",
              borderColor: "var(--border-color)",
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              {stat.label}
            </p>
            <p className="text-2xl font-bold mt-2" style={{ color: stat.color }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Status Sections */}
      {(["ready", "building", "conflicted"] as const).map((status) => {
        const signals = watchlist[status];
        if (signals.length === 0) return null;

        const config = STATUS_CONFIG[status];

        return (
          <div key={status} className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{config.emoji}</span>
              <div>
                <h3 className="font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
                  {config.label}
                </h3>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {config.message}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {signals.map((signal) => (
                <div
                  key={signal.symbol}
                  className="cursor-pointer transition-all hover:-translate-y-1 group"
                  onClick={() => setSelectedSignal(signal)}
                >
                  <SignalCard signal={signal} status={status} />
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Detail Modal */}
      {selectedSignal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setSelectedSignal(null)}
        >
          <div
            className="backdrop-blur-xl rounded-2xl border max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            style={{
              background: "var(--bg-secondary)",
              borderColor: "var(--border-color)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="sticky top-0 p-6 border-b flex items-center justify-between"
              style={{ borderColor: "var(--border-color)" }}
            >
              <h3 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                {selectedSignal.symbol} Analysis
              </h3>
              <button
                onClick={() => setSelectedSignal(null)}
                className="text-2xl font-light transition-colors hover:opacity-50"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              <PriceActionBreakdown signal={selectedSignal} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}