import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

// Same mapping used server-side by the ML ensemble and trend-following
// strategy (src/strategies/trend_following.py, ensemble_predictor.py) —
// kept in sync manually since this lives in a separate codebase (TS vs Python).
const FOREX_SYMBOLS = ["gold", "eurusd", "gbpusd", "usdjpy", "audusd", "usdcad"];

// Matches exactly what src/ml/train_crypto.py trains on. If new crypto
// symbols get trained later, add them here too or the assistant won't
// attempt to fetch live data for them.
const CRYPTO_SYMBOLS = ["BTC-USD", "ETH-USD", "SOL-USD", "BNB-USD", "XRP-USD"];

const BACKEND_URL = process.env.NEXT_PUBLIC_ML_API_URL || "http://localhost:8000";

interface DetectedSymbol {
  raw: string;
  type: "forex" | "crypto";
}

function detectSymbols(message: string): DetectedSymbol[] {
  const lower = message.toLowerCase();
  const found: DetectedSymbol[] = [];

  for (const sym of FOREX_SYMBOLS) {
    if (lower.includes(sym)) {
      found.push({ raw: sym, type: "forex" });
    }
  }

  for (const sym of CRYPTO_SYMBOLS) {
    const base = sym.replace("-USD", "").toLowerCase();
    if (lower.includes(base)) {
      found.push({ raw: sym, type: "crypto" });
    }
  }

  return found;
}

async function fetchSymbolContext(symbol: DetectedSymbol) {
  const predictUrl =
    symbol.type === "forex"
      ? `${BACKEND_URL}/predict/forex/${symbol.raw}`
      : `${BACKEND_URL}/predict`;

  const trendUrl = `${BACKEND_URL}/strategies/trend-following/${symbol.raw}`;

  const [predictRes, trendRes] = await Promise.allSettled([
    symbol.type === "forex"
      ? fetch(predictUrl, { cache: "no-store" })
      : fetch(predictUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol: symbol.raw }),
          cache: "no-store",
        }),
    fetch(trendUrl, { cache: "no-store" }),
  ]);

  const prediction =
    predictRes.status === "fulfilled" && predictRes.value.ok
      ? await predictRes.value.json()
      : { error: "prediction_unavailable" };

  const trendFollowing =
    trendRes.status === "fulfilled" && trendRes.value.ok
      ? await trendRes.value.json()
      : { error: "trend_following_unavailable" };

  return {
    symbol: symbol.raw,
    type: symbol.type,
    prediction,
    trendFollowing,
  };
}

const SYSTEM_PROMPT = `You are the AlgoEdge Trading Mentor — an educational trading assistant embedded in a quantitative trading platform.

Your role is to EXPLAIN and TEACH, not to predict. You will be given real, pre-computed data from two independent systems for any symbol the user asks about:

1. A machine-learning prediction (either an ML ensemble for forex/gold, or a standalone ML model for crypto) — includes a direction (bullish/bearish/neutral), confidence score, and model quality label.
2. A trend-following backtest (a real moving-average crossover strategy) — includes current trend direction, historical win rate, total return vs buy-and-hold, Sharpe ratio, and max drawdown.

Rules you must follow:
- NEVER invent your own market prediction or price target. Only explain, interpret, and contextualize the data you are given.
- If the two systems agree, explain why that convergence is meaningful.
- If the two systems disagree, do NOT just pick one as "right." Explain WHY they might disagree (e.g. different timeframes, different logic — ML looks at multi-factor statistical patterns over days, trend-following only looks at moving average crossovers) and what that disagreement itself teaches the user about reading signals.
- Always mention model/strategy confidence and quality honestly. If a model's quality is "low" or a backtest has very few trades (under ~20), say so explicitly — don't let the user overweight a weak or thin signal.
- If no data was found for a symbol the user mentioned, say so plainly rather than guessing.
- If the user asks a general trading/market question with no specific symbol, answer as a knowledgeable trading educator — cover concepts like risk management, position sizing, or how to read the indicators this platform uses (RSI, MACD, moving averages, Sharpe ratio, drawdown) — but do not fabricate specific numbers or current market conditions.
- You are a mentor, not a financial advisor. Do not tell the user what to do with their money; help them understand what the data means and how to think about it.

FORMAT CONSTRAINTS — follow these strictly:
- Keep your ENTIRE response under 300 words. This is a hard limit, not a suggestion.
- Prefer short paragraphs and simple bullet points over markdown tables — tables consume disproportionate space for the length limit you have.
- Do not pad the answer with restated data the user can already see; focus on interpretation and what it means, not restating every field.
- End with a clear, complete thought — never trail off mid-sentence. If you're running long, prioritize finishing your point over covering every detail.`;

export async function POST(req: NextRequest) {
  if (!GROQ_API_KEY) {
    return NextResponse.json(
      { error: "Assistant is not configured (missing GROQ_API_KEY)." },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const userMessage: string = body.message;

    if (!userMessage || typeof userMessage !== "string" || !userMessage.trim()) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const detected = detectSymbols(userMessage);
    const uniqueDetected = Array.from(
      new Map(detected.map((d) => [d.raw, d])).values()
    );

    const contexts = await Promise.all(
      uniqueDetected.map((sym) => fetchSymbolContext(sym))
    );

    const contextBlock =
      contexts.length > 0
        ? `\n\nHere is real, current data for the symbol(s) the user mentioned:\n\n${JSON.stringify(
            contexts,
            null,
            2
          )}`
        : "\n\nNo specific symbol was detected in the user's message — answer as a general trading educator.";

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        // CHANGED: 1024 -> 2048. The model's chosen format (tables, multiple
        // headed sections) was hitting the old cap mid-sentence. Raised
        // alongside a hard 300-word instruction in the system prompt so this
        // ceiling should rarely actually get hit going forward — it's a
        // safety margin, not the primary length control anymore.
        max_tokens: 2048,
        messages: [
          { role: "system", content: SYSTEM_PROMPT + contextBlock },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error("[Assistant Chat] Groq API error:", groqRes.status, errText);
      return NextResponse.json(
        { error: "Assistant temporarily unavailable" },
        { status: 502 }
      );
    }

    const data = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content ?? "Sorry, I couldn't generate a response.";

    return NextResponse.json({ reply, symbolsDetected: uniqueDetected });
  } catch (error) {
    console.error("[Assistant Chat] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}