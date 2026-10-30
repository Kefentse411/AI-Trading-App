"""
FastAPI server - unified forex + crypto trading API.
Single process, single port. Forex and crypto predictors load and fail independently.
"""
import sys
import time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from src.ml.watchlist_monitor import WatchlistMonitor
from src.ml.predictor_crypto import MLPredictor
from src.utils.database import TradingDatabase

app = FastAPI(
    title="AlgoEdge ML Trading API",
    description="ML-powered trading signals for forex and crypto",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Load predictors — independently, so one failing never takes down the other ──

try:
    forex_monitor = WatchlistMonitor()
    forex_loaded = True
except Exception as e:
    print(f"Warning: Forex predictor failed to load: {e}")
    forex_monitor = None
    forex_loaded = False

try:
    crypto_predictor = MLPredictor()
    crypto_loaded = True
except Exception as e:
    print(f"Warning: Crypto predictor failed to load: {e}")
    crypto_predictor = None
    crypto_loaded = False

try:
    db = TradingDatabase()
    db_loaded = True
except Exception as e:
    print(f"Warning: Database failed to load: {e}")
    db = None
    db_loaded = False

# ── Root / Health ─────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "message": "AlgoEdge Trading AI API - Forex + Crypto",
        "forex_loaded": forex_loaded,
        "crypto_loaded": crypto_loaded,
        "crypto_cv_accuracy": crypto_predictor.cv_accuracy if crypto_loaded else None,
    }

@app.get("/health")
async def health():
    return {
        "status": "ok" if (forex_loaded and crypto_loaded) else "degraded",
        "timestamp": datetime.now().isoformat(),
        "forex_loaded": forex_loaded,
        "crypto_loaded": crypto_loaded,
        "db_loaded": db_loaded,
    }

# ── Forex endpoints (unchanged contracts — forex/predict/route.ts depends on these) ──

@app.get("/predict/forex/{symbol}")
async def predict_forex(symbol: str):
    """
    Get forex prediction.
    symbol: gold, eurusd, gbpusd, usdjpy, audusd, usdcad
    """
    if not forex_loaded:
        raise HTTPException(status_code=503, detail="Forex model not loaded")

    valid_symbols = ["gold", "eurusd", "gbpusd", "usdjpy", "audusd", "usdcad"]
    if symbol.lower() not in valid_symbols:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid symbol. Valid: {', '.join(valid_symbols)}"
        )

    try:
        result = forex_monitor.predictor.predict_ensemble(symbol.lower())
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/predict/forex")
async def predict_forex_all():
    """Get predictions for all forex instruments."""
    if not forex_loaded:
        raise HTTPException(status_code=503, detail="Forex model not loaded")

    symbols = ["gold", "eurusd", "gbpusd", "usdjpy", "audusd", "usdcad"]
    results = {}
    for symbol in symbols:
        try:
            results[symbol] = forex_monitor.predictor.predict_ensemble(symbol)
        except Exception as e:
            results[symbol] = {"error": str(e)}
    return results

@app.get("/watchlist/forex")
async def watchlist_forex():
    """Get forex watchlist with status (ready/building/conflicted)."""
    if not forex_loaded:
        raise HTTPException(status_code=503, detail="Forex model not loaded")

    try:
        import io
        from contextlib import redirect_stdout

        with redirect_stdout(io.StringIO()):
            watchlist = forex_monitor.scan()

        return {
            "timestamp": datetime.now().isoformat(),
            "ready": watchlist["ready"],
            "building": watchlist["building"],
            "conflicted": watchlist["conflicted"],
            "summary": {
                "ready_count": len(watchlist["ready"]),
                "building_count": len(watchlist["building"]),
                "conflicted_count": len(watchlist["conflicted"]),
                "total_count": sum(len(v) for v in watchlist.values()),
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Crypto endpoints (unchanged contract — assistant/predict/route.ts depends on this) ──

class SymbolRequest(BaseModel):
    symbol: str

class FeedbackData(BaseModel):
    prediction_id: str
    was_correct: bool
    actual_outcome: dict
    notes: Optional[str] = None

@app.post("/predict")
async def predict(data: SymbolRequest):
    if not crypto_loaded:
        raise HTTPException(status_code=503, detail="Crypto model not loaded")

    try:
        prediction = crypto_predictor.predict(data.symbol)

        if "error" not in prediction and db_loaded:
            db.add_prediction(
                pred_id=f"pred_{int(time.time())}",
                symbol=data.symbol,
                prediction=prediction,
                features={"current_price": prediction.get("current_price", 0)}
            )

        return prediction
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/feedback")
async def submit_feedback(feedback: FeedbackData):
    if not db_loaded:
        raise HTTPException(status_code=503, detail="Database not loaded")
    try:
        db.add_feedback(
            prediction_id=feedback.prediction_id,
            was_correct=feedback.was_correct,
            actual_outcome=feedback.actual_outcome,
            notes=feedback.notes
        )
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/metrics")
async def get_metrics():
    if not db_loaded:
        raise HTTPException(status_code=503, detail="Database not loaded")
    try:
        metrics = db.get_predictions_accuracy()
        metrics["model_cv_accuracy"] = crypto_predictor.cv_accuracy if crypto_loaded else None
        return metrics
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/retrain")
async def retrain():
    """Trigger crypto model retraining."""
    global crypto_predictor, crypto_loaded
    try:
        from src.ml.train import train_model
        train_model([
            "BTC-USD_historical.csv",
            "ETH-USD_historical.csv",
            "SOL-USD_historical.csv",
            "BNB-USD_historical.csv",
            "XRP-USD_historical.csv",
        ])

        crypto_predictor = MLPredictor()
        crypto_loaded = True

        return {"status": "success", "message": "Model retrained and reloaded"}
    except Exception as e:
        crypto_loaded = False
        raise HTTPException(status_code=500, detail=str(e))

# ── Model info (merged, namespaced) ──────────────────────────────────────────

@app.get("/model/info")
async def model_info():
    info = {}
    if forex_loaded:
        info["forex"] = {
            "cv_accuracy": round(forex_monitor.predictor.cv_accuracy, 3),
            "bull_precision": round(forex_monitor.predictor.bull_precision, 3),
            "bear_precision": round(forex_monitor.predictor.bear_precision, 3),
            "instruments": ["GLD", "EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD"],
            "features": len(forex_monitor.predictor.features),
            "training_samples": 6511,
            "training_period": "5 years (2021-2026)",
            "prediction_horizon": "5 days",
        }
    if crypto_loaded:
        info["crypto"] = {
            "cv_accuracy": crypto_predictor.cv_accuracy,
        }
    if not info:
        raise HTTPException(status_code=503, detail="No models loaded")
    return info

# ── Strategy endpoints (asset-agnostic) ──────────────────────────────────────

@app.get("/strategies/trend-following/{symbol}")
async def trend_following_signal(symbol: str):
    """Real, backtested moving-average crossover strategy — independent of the ML model."""
    try:
        from src.strategies.trend_following import get_live_signal
        result = get_live_signal(symbol)

        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])

        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/candles/forex/{symbol}")
async def get_forex_candles(symbol: str, timeframe: str = "1h", limit: int = 300):
    """
    Raw OHLCV candles for charting.
    symbol: gold, eurusd, gbpusd, usdjpy, audusd, usdcad
    timeframe: 15m, 1h, 4h, 1d, 1wk
    """
    if not forex_loaded:
        raise HTTPException(status_code=503, detail="Forex model not loaded")

    valid_symbols = ["gold", "eurusd", "gbpusd", "usdjpy", "audusd", "usdcad"]
    if symbol.lower() not in valid_symbols:
        raise HTTPException(status_code=400, detail=f"Invalid symbol. Valid: {', '.join(valid_symbols)}")

    try:
        import yfinance as yf
        from src.ml.constants import SYMBOL_MAP, GLD_MULTIPLIER

        ticker = SYMBOL_MAP[symbol.lower()]
        is_gold = (ticker == "GLD")
        multiplier = GLD_MULTIPLIER if is_gold else 1.0

        interval_map = {"15m": "15m", "1h": "60m", "4h": "60m", "1d": "1d", "1wk": "1wk"}
        period_map = {"15m": "1mo", "1h": "1mo", "4h": "3mo", "1d": "1y", "1wk": "5y"}

        tf = timeframe if timeframe in interval_map else "1h"
        df = yf.download(ticker, interval=interval_map[tf], period=period_map[tf], progress=False)

        if df is None or df.empty:
            raise HTTPException(status_code=502, detail=f"No data returned for {ticker}")

        df = df.tail(limit)

        candles = [
            {
                "time": int(idx.timestamp()),
                "open": float(row["Open"].iloc[0] if hasattr(row["Open"], "iloc") else row["Open"]) * multiplier,
                "high": float(row["High"].iloc[0] if hasattr(row["High"], "iloc") else row["High"]) * multiplier,
                "low": float(row["Low"].iloc[0] if hasattr(row["Low"], "iloc") else row["Low"]) * multiplier,
                "close": float(row["Close"].iloc[0] if hasattr(row["Close"], "iloc") else row["Close"]) * multiplier,
                "volume": float(row["Volume"].iloc[0] if hasattr(row["Volume"], "iloc") else row["Volume"]),
            }
            for idx, row in df.iterrows()
        ]

        return {"symbol": symbol.upper(), "ticker": ticker, "timeframe": tf, "candles": candles}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Error handlers ────────────────────────────────────────────────────────────

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail},
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"error": str(exc), "type": type(exc).__name__},
    )

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*80)
    print("Starting AlgoEdge ML Trading API (Forex + Crypto, merged)")
    print("="*80)
    print(f"Forex model loaded:  {forex_loaded}")
    print(f"Crypto model loaded: {crypto_loaded}")
    print(f"Database loaded:     {db_loaded}")
    print(f"API docs: http://localhost:8000/docs")
    print("="*80 + "\n")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")