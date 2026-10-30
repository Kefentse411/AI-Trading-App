"use client";

import { TrendingUp, TrendingDown, Minus, CheckCircle2, XCircle, Lock } from "lucide-react";
import type { ForexPrediction, TrendFollowingSignal, Direction } from "@/lib/types/analyse";

const DIRECTION_STYLES: Record<Direction, { color: string; Icon: typeof TrendingUp; label: string }> = {
  bullish: { color: "#10b981", Icon: TrendingUp, label: "Bullish" },
  bearish: { color: "#ef4444", Icon: TrendingDown, label: "Bearish" },
  neutral: { color: "#9ca3af", Icon: Minus, label: "Neutral" },
};

interface Props {
  prediction: ForexPrediction | null;
  trendFollowing: TrendFollowingSignal | null;
  loading: boolean;
  onRefresh: () => void;
  canRunAnalysis: boolean;
}

export default function ConsensusPanel({
  prediction,
  trendFollowing,
  loading,
  onRefresh,
  canRunAnalysis,
}: Props) {
  return (
    <div
      className="rounded-xl p-6 border backdrop-blur-xl space-y-5"
      style={{ background: "var(--bg-glass)", borderColor: "var(--border-color)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
          Analysis
        </h4>
        <button
          onClick={onRefresh}
          disabled={loading || !canRunAnalysis}
          title={!canRunAnalysis ? "Your account has read-only access to trading analysis" : undefined}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            borderColor: "var(--border-color)",
            color: canRunAnalysis ? "var(--accent-blue)" : "var(--text-muted)",
          }}
        >
          {!canRunAnalysis && <Lock size={12} />}
          {loading ? "Analysing..." : !canRunAnalysis ? "Read-Only" : "Run Analysis"}
        </button>
      </div>

      {/* Empty states */}
      {!canRunAnalysis && !prediction && (
        <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
          <Lock size={12} />
          Your role permits viewing only. Contact an admin for trading write access.
        </p>
      )}

      {canRunAnalysis && !prediction && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Run analysis to generate a live ML verdict.
        </p>
      )}

      {/* Main content once a prediction exists */}
      {prediction && (
        <>
          {/* Layer 1: ML Ensemble Verdict */}
          {(() => {
            const { color, Icon, label } = DIRECTION_STYLES[prediction.ensemble_prediction];
            return (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: `${color}1a`, color }}
                  >
                    <Icon size={22} />
                  </div>
                  <div>
                    <p className="text-lg font-bold" style={{ color }}>
                      {label}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {(prediction.ensemble_confidence * 100).toFixed(1)}% confidence ·{" "}
                      {prediction.model_info.model_quality} quality
                    </p>
                  </div>
                </div>

                {/* Probability bar */}
                <div className="flex h-2 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${prediction.probabilities.bearish * 100}%`, background: "#ef4444" }}
                  />
                  <div
                    style={{ width: `${prediction.probabilities.neutral * 100}%`, background: "#9ca3af" }}
                  />
                  <div
                    style={{ width: `${prediction.probabilities.bullish * 100}%`, background: "#10b981" }}
                  />
                </div>
                <div className="flex justify-between text-[10px]" style={{ color: "var(--text-muted)" }}>
                  <span>Bear {(prediction.probabilities.bearish * 100).toFixed(0)}%</span>
                  <span>Neutral {(prediction.probabilities.neutral * 100).toFixed(0)}%</span>
                  <span>Bull {(prediction.probabilities.bullish * 100).toFixed(0)}%</span>
                </div>

                {prediction.raw_prediction !== prediction.prediction && prediction.filter_reason && (
                  <div
                    className="text-[10px] p-2.5 rounded-lg border"
                    style={{
                      borderColor: "rgba(234,179,8,0.3)",
                      background: "rgba(234,179,8,0.08)",
                      color: "#eab308",
                    }}
                  >
                    Raw model leaned <strong>{prediction.raw_prediction}</strong> but was filtered:{" "}
                    {prediction.filter_reason}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                      Entry
                    </p>
                    <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                      {prediction.current_price}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                      Target
                    </p>
                    <p className="text-xs font-semibold" style={{ color: "#10b981" }}>
                      {prediction.target_price}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                      Stop
                    </p>
                    <p className="text-xs font-semibold" style={{ color: "#ef4444" }}>
                      {prediction.stop_loss}
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Layer 2: Technical vote breakdown */}
          <div className="space-y-2 pt-3 border-t" style={{ borderColor: "var(--border-color)" }}>
            <p
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              Technical Signals ({prediction.price_action_checks.bullish_votes} bull /{" "}
              {prediction.price_action_checks.bearish_votes} bear)
            </p>
            {(["rsi", "macd", "sma", "momentum"] as const).map((key) => (
              <div key={key} className="flex items-center justify-between text-xs">
                <span className="uppercase" style={{ color: "var(--text-secondary)" }}>
                  {key}
                </span>
                <span style={{ color: "var(--text-primary)" }}>
                  {prediction.price_action_checks[key].replace(/_/g, " ")}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Layer 3: Independent trend-following confirmation */}
      {trendFollowing && prediction && (
        <div className="space-y-2 pt-3 border-t" style={{ borderColor: "var(--border-color)" }}>
          <div className="flex items-center justify-between">
            <p
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              Trend-Following Confirmation
            </p>
            {trendFollowing.direction === prediction.ensemble_prediction ? (
              <CheckCircle2 size={14} color="#10b981" />
            ) : (
              <XCircle size={14} color="#ef4444" />
            )}
          </div>
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: "var(--text-secondary)" }}>MA Crossover Direction</span>
            <span style={{ color: DIRECTION_STYLES[trendFollowing.direction].color, fontWeight: 600 }}>
              {trendFollowing.direction}
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px]" style={{ color: "var(--text-muted)" }}>
            <span>Win rate {(trendFollowing.backtest.win_rate * 100).toFixed(0)}%</span>
            <span>Sharpe {trendFollowing.backtest.sharpe_ratio}</span>
            <span>{trendFollowing.backtest.num_trades} trades</span>
          </div>
        </div>
      )}
    </div>
  );
}