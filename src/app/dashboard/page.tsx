"use client";

import { useSession } from "next-auth/react";
import { useTheme } from "@/context/ThemeContext";
import { TrendingUp, TrendingDown, Zap, Activity, Target, AlertCircle } from 'lucide-react';
import {
  // NEW: Phosphor imports for dashboard
  ChartLine,
  Lightning,
  Pulse,
  MagnifyingGlass,
  Play,
  Pause,
} from '@phosphor-icons/react';
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const { data: session } = useSession();
  const { theme } = useTheme();
  const [time, setTime] = useState<string>("");
  const [liveMetrics, setLiveMetrics] = useState({
    portfolioChange: "+$9,182.40",
    portfolioChangePercent: "+3.24%",
    dailyReturn: "+3.24%",
    winRate: "76.8%",
    activeSignals: 12,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const metrics = [
    {
      label: "Portfolio Value",
      value: "$284,291.50",
      change: liveMetrics.portfolioChange,
      isPositive: true,
      color: "#10b981",
      icon: Target,
      description: "Daily P&L",
      trend: "up",
      animationDelay: "0s",
    },
    {
      label: "Daily Return",
      value: liveMetrics.dailyReturn,
      change: "Outperforming BTC/USD",
      isPositive: true,
      color: "#60a5fa",
      icon: TrendingUp,
      description: "vs benchmark",
      trend: "up",
      animationDelay: "0.1s",
    },
    {
      label: "Win Rate",
      value: liveMetrics.winRate,
      change: "Last 150 trades",
      isPositive: true,
      color: "#8b5cf6",
      icon: Activity,
      description: "ML Model Accuracy",
      trend: "up",
      animationDelay: "0.2s",
    },
    {
      label: "Active Signals",
      value: `${liveMetrics.activeSignals} / 12`,
      change: "Systems active",
      isPositive: true,
      color: "#ec4899",
      icon: Zap,
      description: "Core engines",
      trend: "stable",
      animationDelay: "0.3s",
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner - using Phosphor icons */}
      <div
        className="backdrop-blur-2xl rounded-2xl p-8 border relative overflow-hidden group transition-all duration-500 hover:border-blue-500/50 slide-in"
        style={{
          background: "linear-gradient(135deg, var(--bg-glass) 0%, rgba(59, 130, 246, 0.05) 100%)",
          borderColor: "var(--border-color)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
        }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-bl-full pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium uppercase tracking-wider mb-3"
              style={{
                borderColor: "rgba(16, 185, 129, 0.2)",
                background: "rgba(16, 185, 129, 0.05)",
                color: "#10b981",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#10b981" }} />
              Systems Online
            </div>

            <h1 className="text-3xl font-extrabold" style={{ color: "var(--text-primary)" }}>
              Welcome back{session?.user?.name ? `, ${session.user.name}` : ""}
            </h1>

            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              Here's what's happening with your portfolio today.
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
              Local Time
            </p>
            <p className="text-2xl font-mono font-bold" style={{ color: "var(--accent-blue)" }}>
              {time || "--:--:--"}
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, i) => {
          const IconComponent = metric.icon;
          return (
            <div
              key={i}
              className="backdrop-blur-xl rounded-xl p-6 border transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:border-blue-500/30 group relative overflow-hidden slide-in"
              style={{
                background: "var(--bg-glass)",
                borderColor: "var(--border-color)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
                animationDelay: metric.animationDelay,
              }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110 mb-4"
                style={{
                  background: `rgba(${
                    metric.color === "#10b981" ? "16, 185, 129" :
                    metric.color === "#60a5fa" ? "96, 165, 250" :
                    metric.color === "#8b5cf6" ? "139, 92, 246" :
                    "236, 72, 153"
                  }, 0.1)`,
                  color: metric.color,
                }}
              >
                <IconComponent size={20} weight="duotone" />
              </div>

              <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
                {metric.label}
              </p>

              <p className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                {metric.value}
              </p>

              <div className="flex items-center gap-1.5">
                {metric.isPositive ? (
                  <TrendingUp size={14} color={metric.color} />
                ) : (
                  <TrendingDown size={14} color={metric.color} />
                )}
                <span className="text-xs font-semibold" style={{ color: metric.color }}>
                  {metric.change}
                </span>
              </div>

              <p className="text-[10px] mt-2" style={{ color: "var(--text-muted)" }}>
                {metric.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Quick Tools + Pipeline Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Tools - Using Phosphor icons */}
        <div
          className="backdrop-blur-xl rounded-xl p-6 border flex flex-col justify-between gap-6 slide-in transition-all duration-300 hover:border-purple-500/30"
          style={{
            background: "var(--bg-glass)",
            borderColor: "var(--border-color)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
          }}
        >
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-primary)" }}>
              Quick Navigation
            </h4>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Access trading tools, ML dashboards, and risk analysis. Real-time forex signals available 24/5.
            </p>
          </div>

          <div className="space-y-2">
            <a
              href="/dashboard/forex"
              className="flex items-center justify-between p-3.5 rounded-lg text-xs font-semibold border transition-all duration-300 hover:scale-105 group/btn"
              style={{
                background: "rgba(59, 130, 246, 0.08)",
                borderColor: "rgba(59, 130, 246, 0.2)",
                color: "var(--accent-blue)",
              }}
            >
              <div className="flex items-center gap-2">
                <Zap size={16} weight="duotone" />
                Forex Watchlist
              </div>
              <span className="group-hover/btn:translate-x-1 transition-transform">→</span>
            </a>

            <a
              href="/dashboard/analyse"
              className="flex items-center justify-between p-3.5 rounded-lg text-xs font-semibold border transition-all duration-300 hover:scale-105 group/btn"
              style={{
                background: "rgba(168, 85, 247, 0.08)",
                borderColor: "rgba(168, 85, 247, 0.2)",
                color: "var(--accent-purple)",
              }}
            >
              <div className="flex items-center gap-2">
                <ChartLine size={16} weight="duotone" />
                Live Analysis
              </div>
              <span className="group-hover/btn:translate-x-1 transition-transform">→</span>
            </a>

            <a
              href="/dashboard/strategies"
              className="flex items-center justify-between p-3.5 rounded-lg text-xs font-semibold border transition-all duration-300 hover:scale-105 group/btn"
              style={{
                background: "rgba(236, 72, 153, 0.08)",
                borderColor: "rgba(236, 72, 153, 0.2)",
                color: "#ec4899",
              }}
            >
              <div className="flex items-center gap-2">
                <Lightning size={16} weight="duotone" />
                Configure Engines
              </div>
              <span className="group-hover/btn:translate-x-1 transition-transform">→</span>
            </a>
          </div>
        </div>

        {/* Pipeline Status - using Phosphor */}
        <div
          className="lg:col-span-2 backdrop-blur-xl rounded-xl p-6 border space-y-6 slide-in transition-all duration-300 hover:border-blue-500/30"
          style={{
            background: "var(--bg-glass)",
            borderColor: "var(--border-color)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
          }}
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
              Live Execution Pipelines
            </h4>
            <div className="flex items-center gap-2">
              <Pulse size={16} weight="fill" color="#10b981" />
              <span className="text-xs font-medium" style={{ color: "#10b981" }}>All Nominal</span>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { name: "Forex Signal Engine", latency: "1.2ms", load: "14%", state: "NOMINAL", color: "#10b981" },
              { name: "Gold Price Predictor", latency: "4.8ms", load: "62%", state: "ACTIVE", color: "#60a5fa" },
              { name: "Risk Management Module", latency: "0.9ms", load: "8%", state: "NOMINAL", color: "#10b981" },
            ].map((engine, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 rounded-lg border transition-all duration-300 hover:bg-opacity-50 group/engine"
                style={{
                  background: "var(--bg-tertiary)",
                  borderColor: "var(--border-color)",
                }}
              >
                <div className="flex-1 flex items-center gap-2">
                  {engine.state === "NOMINAL" ? (
                    <Pulse size={16} weight="fill" color={engine.color} />
                  ) : (
                    <Lightning size={16} weight="duotone" color={engine.color} />
                  )}
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                      {engine.name}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                      Latency: {engine.latency}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Load</p>
                    <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                      {engine.load}
                    </p>
                  </div>
                  <span
                    className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      background: `${engine.color}1a`,
                      color: engine.color,
                    }}
                  >
                    {engine.state}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}