"use client";

interface PriceActionBreakdownProps {
  signal: any;
}

const CHECK_DETAILS: Record<string, { icon: string; label: string; desc: string }> = {
  rsi_neutral: { icon: "🟡", label: "RSI Neutral", desc: "No overbought/oversold condition" },
  rsi_overbought_accelerating: { icon: "📈", label: "RSI Overbought & Accelerating", desc: "Mean reversion opportunity (bearish)" },
  rsi_overbought_diverging: { icon: "📊", label: "RSI Overbought Diverging", desc: "Potential reversal (bearish)" },
  rsi_oversold_accelerating: { icon: "📉", label: "RSI Oversold & Accelerating", desc: "Mean reversion opportunity (bullish)" },
  rsi_oversold_diverging: { icon: "📊", label: "RSI Oversold Diverging", desc: "Potential reversal (bullish)" },
  macd_bullish: { icon: "📈", label: "MACD Bullish", desc: "MACD above signal line, histogram positive" },
  macd_bearish: { icon: "📉", label: "MACD Bearish", desc: "MACD below signal line, histogram negative" },
  macd_neutral: { icon: "🟡", label: "MACD Neutral", desc: "No clear momentum direction" },
  sma_bullish_trend: { icon: "⬆️", label: "SMA Bullish Trend", desc: "50MA > 200MA, uptrend confirmed" },
  sma_bearish_trend: { icon: "⬇️", label: "SMA Bearish Trend", desc: "50MA < 200MA, downtrend confirmed" },
  sma_no_trend: { icon: "⟷", label: "SMA No Trend", desc: "Moving averages aligned, sideways" },
  momentum_bullish: { icon: "🚀", label: "Bullish Momentum", desc: "7-day return > 2x volatility" },
  momentum_bearish: { icon: "📉", label: "Bearish Momentum", desc: "7-day return < -2x volatility" },
  momentum_neutral: { icon: "🟡", label: "Neutral Momentum", desc: "No strong directional move" },
};

export default function PriceActionBreakdown({ signal }: PriceActionBreakdownProps) {
  const checks = [
    { key: signal.price_action.rsi, label: "RSI" },
    { key: signal.price_action.macd, label: "MACD" },
    { key: signal.price_action.sma, label: "SMA" },
    { key: signal.price_action.momentum, label: "Momentum" },
  ];

  // FIX: Default probabilities if undefined
  const probabilities = signal.probabilities || { 
    bearish: 0, 
    neutral: 0, 
    bullish: 0 
  };

  return (
    <div className="space-y-6">
      {/* ML Decision */}
      <div>
        <h4 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
          ML Model Decision
        </h4>
        <div className="grid grid-cols-3 gap-3">
          {["bearish", "neutral", "bullish"].map((pred) => (
            <div
              key={pred}
              className="p-3 rounded-lg border text-center transition-all"
              style={{
                background:
                  signal.ensemble_prediction === pred
                    ? "rgba(59, 130, 246, 0.1)"
                    : "var(--bg-tertiary)",
                borderColor:
                  signal.ensemble_prediction === pred
                    ? "rgba(59, 130, 246, 0.2)"
                    : "var(--border-color)",
              }}
            >
              <p className="text-xs uppercase tracking-wider font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
                {pred}
              </p>
              <p
                className="text-lg font-bold font-mono"
                style={{
                  color:
                    pred === "bearish"
                      ? "#ef4444"
                      : pred === "bullish"
                        ? "#10b981"
                        : "var(--text-secondary)",
                }}
              >
                {(
                  (probabilities[pred as keyof typeof probabilities] || 0) * 100
                ).toFixed(0)}%
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Price Action */}
      <div>
        <h4 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
          Price Action Checks
        </h4>
        <div className="space-y-3">
          {checks.map((check) => {
            const detail = CHECK_DETAILS[check.key as keyof typeof CHECK_DETAILS] || {
              icon: "❓",
              label: check.key,
              desc: "Unknown check",
            };
            return (
              <div
                key={check.label}
                className="p-4 rounded-lg border"
                style={{
                  background: "var(--bg-tertiary)",
                  borderColor: "var(--border-color)",
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{detail.icon}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                      {detail.label}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                      {detail.desc}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Setup Type */}
      <div>
        <h4 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
          Setup Analysis
        </h4>
        <div
          className="p-4 rounded-lg border"
          style={{
            background: "var(--bg-tertiary)",
            borderColor: "var(--border-color)",
          }}
        >
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {signal.setup_type}
          </p>
          <p className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>
            Signal Source: {signal.signal_source}
          </p>
        </div>
      </div>

      {/* Risk Management */}
      <div
        className="p-4 rounded-lg border"
        style={{
          background: "rgba(59, 130, 246, 0.05)",
          borderColor: "rgba(59, 130, 246, 0.15)",
        }}
      >
        <h4 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
          Risk Management
        </h4>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span style={{ color: "var(--text-secondary)" }}>Entry:</span>
            <span style={{ color: "var(--text-primary)" }} className="font-mono font-bold">
              {signal.current_price.toFixed(5)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span style={{ color: "var(--text-secondary)" }}>Take Profit:</span>
            <span style={{ color: "#10b981" }} className="font-mono font-bold">
              {signal.target.toFixed(5)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span style={{ color: "var(--text-secondary)" }}>Stop Loss:</span>
            <span style={{ color: "#ef4444" }} className="font-mono font-bold">
              {signal.stop.toFixed(5)}
            </span>
          </div>
          <div className="border-t pt-2" style={{ borderColor: "var(--border-color)" }}>
            <div className="flex items-center justify-between">
              <span style={{ color: "var(--text-secondary)" }}>Risk/Reward:</span>
              <span style={{ color: "var(--text-primary)" }} className="font-bold">
                {signal.stop && signal.target && signal.current_price
                  ? `1:${Math.abs((signal.target - signal.current_price) / (signal.current_price - signal.stop)).toFixed(2)}`
                  : "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}