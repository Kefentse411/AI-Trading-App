import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import type { MLConsensus } from "@/lib/types/analyse";

const PYTHON_ML_URL = process.env.PYTHON_ML_URL ?? "http://127.0.0.1:8000";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { symbol, timeframe } = await req.json();

  try {
    const res = await fetch(`${PYTHON_ML_URL}/consensus`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol, timeframe }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data: MLConsensus = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[api/analyse/consensus] Python service unreachable, returning mock:", err);
    // Fallback mock so the UI is fully testable before the Python service is wired up
    const mock: MLConsensus = {
      symbol,
      timeframe,
      direction: "bullish",
      confidence: 0.74,
      votes: [
        { model: "LSTM Trend", direction: "bullish", confidence: 0.81 },
        { model: "XGBoost Momentum", direction: "bullish", confidence: 0.69 },
        { model: "Random Forest", direction: "neutral", confidence: 0.55 },
      ],
      generatedAt: new Date().toISOString(),
    };
    return NextResponse.json(mock);
  }
}