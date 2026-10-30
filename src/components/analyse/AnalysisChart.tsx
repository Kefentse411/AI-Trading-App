"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  CandlestickSeries,
  LineSeries,
  createSeriesMarkers,
  IChartApi,
  ISeriesApi,
  ISeriesMarkersPluginApi,
  CandlestickData,
  LineData,
  UTCTimestamp,
  SeriesMarker,
  Time,
} from "lightweight-charts";
import type { Candle, IndicatorSeries, SignalMarker } from "@/lib/types/analyse";

interface AnalysisChartProps {
  candles: Candle[];
  indicators: IndicatorSeries[];
  signals: SignalMarker[];
  theme: "dark" | "light";
}

export default function AnalysisChart({ candles, indicators, signals, theme }: AnalysisChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const markersPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const overlaySeriesRef = useRef<Map<string, ISeriesApi<"Line">>>(new Map());

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: theme === "dark" ? "#9ca3af" : "#4b5563",
      },
      grid: {
        vertLines: { color: "rgba(147,197,253,0.05)" },
        horzLines: { color: "rgba(147,197,253,0.05)" },
      },
      crosshair: { mode: 1 },
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: "rgba(147,197,253,0.1)" },
      rightPriceScale: { borderColor: "rgba(147,197,253,0.1)" },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    });

    const markersPlugin = createSeriesMarkers(candleSeries, []);

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    markersPluginRef.current = markersPlugin;

    const resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      chart.resize(width, height);
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      markersPluginRef.current = null;
      overlaySeriesRef.current.clear();
    };
  }, [theme]);

  useEffect(() => {
    if (!candleSeriesRef.current) return;
    const data: CandlestickData[] = candles.map((c) => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    candleSeriesRef.current.setData(data);
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  useEffect(() => {
    if (!markersPluginRef.current) return;
    const markers: SeriesMarker<Time>[] = signals.map((s) => ({
      time: s.time as UTCTimestamp,
      position: s.direction === "buy" ? "belowBar" : "aboveBar",
      color: s.direction === "buy" ? "#10b981" : "#ef4444",
      shape: s.direction === "buy" ? "arrowUp" : "arrowDown",
      text: s.label,
    }));
    markersPluginRef.current.setMarkers(markers);
  }, [signals]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const overlayIndicators = indicators.filter((i) => i.pane === "overlay");
    const activeIds = new Set(overlayIndicators.map((i) => i.id));

    for (const [id, series] of overlaySeriesRef.current) {
      if (!activeIds.has(id)) {
        chart.removeSeries(series);
        overlaySeriesRef.current.delete(id);
      }
    }

    for (const ind of overlayIndicators) {
      let series = overlaySeriesRef.current.get(ind.id);
      if (!series) {
        series = chart.addSeries(LineSeries, {
          color: ind.color,
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        overlaySeriesRef.current.set(ind.id, series);
      }
      const data: LineData[] = ind.data.map((p) => ({ time: p.time as UTCTimestamp, value: p.value }));
      series.setData(data);
    }
  }, [indicators]);

  return <div ref={containerRef} className="w-full h-full" />;
}