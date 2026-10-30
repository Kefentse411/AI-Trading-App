"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "@/context/ThemeContext";
import SymbolTimeframeBar from "@/components/analyse/SymbolTimeframeBar";
import ConsensusPanel from "@/components/analyse/ConsensusPanel";
import type {
  CandlesResponse,
  ForexPrediction,
  TrendFollowingSignal,
  ForexSymbol,
  Timeframe,
} from "@/lib/types/analyse";

const AnalysisChart = dynamic(() => import("@/components/analyse/AnalysisChart"), { ssr: false });

interface Props {
  canRunAnalysis: boolean;
}

export default function AnalysePageClient({ canRunAnalysis }: Props) {
  const { theme } = useTheme();
  const [symbol, setSymbol] = useState<ForexSymbol>("eurusd");
  const [timeframe, setTimeframe] = useState<Timeframe>("1h");
  const [candles, setCandles] = useState<CandlesResponse | null>(null);
  const [prediction, setPrediction] = useState<ForexPrediction | null>(null);
  const [trendFollowing, setTrendFollowing] = useState<TrendFollowingSignal | null>(null);
  const [loadingChart, setLoadingChart] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  const fetchCandles = useCallback(async () => {
    setLoadingChart(true);
    try {
      const res = await fetch(`/api/forex/candles?symbol=${symbol}&timeframe=${timeframe}`);
      if (!res.ok) throw new Error(`candles fetch failed: ${res.status}`);
      const json: CandlesResponse = await res.json();
      setCandles(json);
    } catch (err) {
      console.error(err);
      setCandles(null);
    } finally {
      setLoadingChart(false);
    }
  }, [symbol, timeframe]);

  const runAnalysis = useCallback(async () => {
    if (!canRunAnalysis) return;

    setLoadingAnalysis(true);
    try {
      const [predRes, trendRes] = await Promise.all([
        fetch(`/api/forex/predict?symbol=${symbol}`),
        fetch(`/api/forex/trend-following?symbol=${symbol}`),
      ]);

      const predJson: ForexPrediction = await predRes.json();
      const trendJson: TrendFollowingSignal = await trendRes.json();

      setPrediction(predJson);
      setTrendFollowing(trendJson);

      fetch("/api/analyse/log-signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: predJson.symbol,
          direction: predJson.ensemble_prediction,
          confidence: predJson.ensemble_confidence,
          entryPrice: predJson.current_price,
          targetPrice: predJson.target_price,
          stopLoss: predJson.stop_loss,
        }),
      }).catch((err) => console.error("[log-signal] failed:", err));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAnalysis(false);
    }
  }, [symbol, canRunAnalysis]);

  useEffect(() => {
    fetchCandles();
    setPrediction(null);
    setTrendFollowing(null);
  }, [fetchCandles]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold" style={{ color: "var(--text-primary)" }}>
          Technical Analysis
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Live charting with ML-driven direction consensus.
        </p>
      </div>

      <SymbolTimeframeBar
        symbol={symbol}
        timeframe={timeframe}
        onSymbolChange={setSymbol}
        onTimeframeChange={setTimeframe}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div
          className="lg:col-span-3 rounded-xl border backdrop-blur-xl p-4 h-[600px] relative"
          style={{ background: "var(--bg-glass)", borderColor: "var(--border-color)" }}
        >
          {loadingChart && (
            <div
              className="absolute inset-0 flex items-center justify-center z-10 text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              Loading chart data...
            </div>
          )}
          {candles && (
            <AnalysisChart
              candles={candles.candles}
              indicators={[]}
              signals={[]}
              theme={theme as "dark" | "light"}
            />
          )}
        </div>

        <ConsensusPanel
          prediction={prediction}
          trendFollowing={trendFollowing}
          loading={loadingAnalysis}
          onRefresh={runAnalysis}
          canRunAnalysis={canRunAnalysis}
        />
      </div>
    </div>
  );
}