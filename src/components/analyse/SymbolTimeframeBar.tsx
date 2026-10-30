"use client";

import type { ForexSymbol, Timeframe } from "@/lib/types/analyse";

const TIMEFRAMES: Timeframe[] = ["15m", "1h", "4h", "1d", "1wk"];
const SYMBOLS: { value: ForexSymbol; label: string }[] = [
  { value: "eurusd", label: "EUR/USD" },
  { value: "gbpusd", label: "GBP/USD" },
  { value: "usdjpy", label: "USD/JPY" },
  { value: "audusd", label: "AUD/USD" },
  { value: "usdcad", label: "USD/CAD" },
  { value: "gold", label: "Gold (GLD)" },
];

interface Props {
  symbol: ForexSymbol;
  timeframe: Timeframe;
  onSymbolChange: (s: ForexSymbol) => void;
  onTimeframeChange: (t: Timeframe) => void;
}

export default function SymbolTimeframeBar({ symbol, timeframe, onSymbolChange, onTimeframeChange }: Props) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border backdrop-blur-xl"
      style={{ background: "var(--bg-glass)", borderColor: "var(--border-color)" }}
    >
      <select
        value={symbol}
        onChange={(e) => onSymbolChange(e.target.value as ForexSymbol)}
        className="px-3 py-2 rounded-lg text-sm font-semibold border bg-transparent"
        style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}
      >
        {SYMBOLS.map((s) => (
          <option key={s.value} value={s.value} style={{ background: "var(--bg-secondary)" }}>
            {s.label}
          </option>
        ))}
      </select>

      <div className="flex gap-1.5">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf}
            onClick={() => onTimeframeChange(tf)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all duration-200"
            style={{
              background: tf === timeframe ? "var(--accent-blue)" : "transparent",
              color: tf === timeframe ? "#fff" : "var(--text-secondary)",
              border: `1px solid ${tf === timeframe ? "var(--accent-blue)" : "var(--border-color)"}`,
            }}
          >
            {tf}
          </button>
        ))}
      </div>
    </div>
  );
}