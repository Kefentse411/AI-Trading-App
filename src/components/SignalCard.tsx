"use client";

interface SignalCardProps {
  signal: any;
  status: "ready" | "building" | "conflicted";
}

const STATUS_COLORS = {
  ready: { bg: "rgba(16, 185, 129, 0.05)", border: "rgba(16, 185, 129, 0.15)", text: "#10b981" },
  building: { bg: "rgba(245, 158, 11, 0.05)", border: "rgba(245, 158, 11, 0.15)", text: "#f59e0b" },
  conflicted: { bg: "rgba(107, 114, 128, 0.05)", border: "rgba(107, 114, 128, 0.15)", text: "#6b7280" },
};

export default function SignalCard({ signal, status }: SignalCardProps) {
  const colors = STATUS_COLORS[status];
  const isGain = signal.expected_return > 0;

  return (
    <div
      className="backdrop-blur-xl rounded-xl p-6 border transition-all duration-300 group"
      style={{
        background: colors.bg,
        borderColor: colors.border,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
            {signal.symbol}
          </h4>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {signal.setup_type}
          </p>
        </div>
        <span
          className="px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider border"
          style={{ color: colors.text, borderColor: colors.border }}
        >
          {signal.ensemble_prediction.toUpperCase()}
        </span>
      </div>

      {/* Price Info */}
      <div className="space-y-3 mb-4 pb-4 border-b" style={{ borderColor: colors.border }}>
        <div className="flex items-center justify-between">
          <span style={{ color: "var(--text-muted)" }} className="text-xs">
            Current Price
          </span>
          <span style={{ color: "var(--text-primary)" }} className="text-sm font-mono font-bold">
            {signal.current_price.toFixed(5)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p style={{ color: "var(--text-muted)" }} className="text-xs mb-1">
              Target
            </p>
            <p style={{ color: "#10b981" }} className="font-mono font-bold text-sm">
              {signal.target.toFixed(5)}
            </p>
          </div>
          <div>
            <p style={{ color: "var(--text-muted)" }} className="text-xs mb-1">
              Stop Loss
            </p>
            <p style={{ color: "#ef4444" }} className="font-mono font-bold text-sm">
              {signal.stop.toFixed(5)}
            </p>
          </div>
        </div>
      </div>

      {/* Confidence & Return */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span style={{ color: "var(--text-muted)" }} className="text-xs">
            Model Confidence
          </span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 rounded-full bg-gray-400/20 overflow-hidden">
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${signal.ensemble_confidence * 100}%`,
                  background: signal.ensemble_confidence > 0.5 ? "#10b981" : "#f59e0b",
                }}
              />
            </div>
            <span style={{ color: "var(--text-primary)" }} className="text-xs font-mono font-bold">
              {(signal.ensemble_confidence * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span style={{ color: "var(--text-muted)" }} className="text-xs">
            Expected Return
          </span>
          <span
            className="font-mono font-bold text-sm"
            style={{ color: isGain ? "#10b981" : "#ef4444" }}
          >
            {isGain ? "+" : ""}{(signal.expected_return * 100).toFixed(2)}%
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span style={{ color: "var(--text-muted)" }} className="text-xs">
            Position Size
          </span>
          <span style={{ color: "var(--text-primary)" }} className="text-xs font-bold">
            {(signal.position_size * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}