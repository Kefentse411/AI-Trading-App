import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import type { AnalyseResponse, Candle, IndicatorSeries, Timeframe } from "@/lib/types/analyse";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol") ?? "EURUSD=X";
  const timeframe = (searchParams.get("timeframe") ?? "1h") as Timeframe;

  // TODO: once schema is confirmed, replace with:
  // const db = getDb();
  // const rows = db.prepare(
  //   `SELECT time, open, high, low, close, volume FROM candles
  //    WHERE symbol = ? AND timeframe = ? ORDER BY time ASC`
  // ).all(symbol, timeframe) as Candle[];

  const payload: AnalyseResponse = buildMockPayload(symbol, timeframe);
  return NextResponse.json(payload);
}

function buildMockPayload(symbol: string, timeframe: Timeframe): AnalyseResponse {
  const now = Math.floor(Date.now() / 1000);
  const stepSeconds = timeframe === "1d" ? 86400 : timeframe === "1h" ? 3600 : 300;

  let price = 1.085;
  const candles: Candle[] = Array.from({ length: 150 }, (_, i) => {
    const time = now - (150 - i) * stepSeconds;
    const open = price;
    const drift = (Math.sin(i / 8) + (Math.random() - 0.5)) * 0.0015;
    const close = open + drift;
    const high = Math.max(open, close) + Math.random() * 0.0008;
    const low = Math.min(open, close) - Math.random() * 0.0008;
    price = close;
    return { time, open, high, low, close, volume: Math.round(1000 + Math.random() * 5000) };
  });

  const sma20: IndicatorSeries = {
    id: "sma_20",
    label: "SMA 20",
    color: "#60a5fa",
    pane: "overlay",
    data: candles.map((c, i, arr) => {
      const slice = arr.slice(Math.max(0, i - 19), i + 1);
      const avg = slice.reduce((s, p) => s + p.close, 0) / slice.length;
      return { time: c.time, value: avg };
    }),
  };

  const rsi14: IndicatorSeries = {
    id: "rsi_14",
    label: "RSI 14",
    color: "#a78bfa",
    pane: "separate",
    data: candles.map((c) => ({ time: c.time, value: 40 + Math.sin(c.time / 500) * 20 + 20 })),
  };

  return {
    symbol,
    timeframe,
    candles,
    indicators: [sma20, rsi14],
    signals: [
      { time: candles[100].time, direction: "buy", label: "ML Buy" },
      { time: candles[130].time, direction: "sell", label: "ML Sell" },
    ],
  };
}